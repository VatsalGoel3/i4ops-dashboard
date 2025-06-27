#!/usr/bin/env python3
"""
Security Log Processor - MVP for i4ops Security Monitoring
Replaces the complex TypeScript parsing with a simple, effective Python solution.
"""

import re
import os
import sys
import time
import json
import signal
import logging
import asyncio
import asyncpg
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict, Counter
from typing import Dict, List, Optional, NamedTuple
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('SecurityProcessor')

class SecuritySeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class SecurityRule(Enum):
    EGRESS = "egress"
    BRUTE_FORCE = "brute_force"
    SUDO = "sudo"
    OOM_KILL = "oom_kill"
    OTHER = "other"

@dataclass
class SecurityEvent:
    vm_name: str
    timestamp: datetime
    source: str  # auth.log, kern.log, syslog
    message: str
    severity: SecuritySeverity
    rule: SecurityRule
    metadata: Dict = None

class SecurityProcessor:
    """
    Unified security log processor that handles all 3 log types:
    - auth.log: Authentication events, SSH, sudo
    - kern.log: Kernel events, data exfiltration
    - syslog: System events, network
    """
    
    def __init__(self, db_url: str = None):
        self.db_url = db_url or os.getenv('DATABASE_URL')
        self.db_pool = None
        self.running = False
        self.processed_lines = defaultdict(int)  # Track processed lines per file
        self.vm_cache = {}  # Cache VM IDs
        
        # Security patterns - consolidated from all 3 parsers
        self.patterns = {
            # CRITICAL - Data exfiltration from kern.log
            SecurityRule.EGRESS: [
                re.compile(r'kernel:.*egress\s*\(\d+\)\s*pid\s+(\d+)\s+read\s+([^\s]+|\([^)]+\))\s+write\s+([^\s]*)\s+uid\s+(\d+)\s+gid\s+(\d+)', re.I),
            ],
            
            # HIGH - SSH brute force from auth.log
            SecurityRule.BRUTE_FORCE: [
                re.compile(r'sshd\[\d+\]:\s*Failed\s+password\s+for\s+(?:invalid\s+user\s+)?(\w+)\s+from\s+([\d.]+)', re.I),
                re.compile(r'sshd\[\d+\]:\s*Invalid\s+user\s+(\w+)\s+from\s+([\d.]+)', re.I),
                re.compile(r'sudo:.*user\s+NOT\s+in\s+sudoers.*USER=(\w+).*COMMAND=(.+)', re.I),
            ],
            
            # MEDIUM - Privilege escalation from auth.log
            SecurityRule.SUDO: [
                re.compile(r'sudo:\s*(\w+)\s*:.*TTY=.*USER=(\w+)\s+COMMAND=(.+)', re.I),
                re.compile(r'sudo:\s*pam_unix\(sudo:session\):\s*session\s+(opened|closed)\s+for\s+user\s+(\w+)', re.I),
                re.compile(r'su:\s*pam_unix\(su:session\):\s*session\s+opened\s+for\s+user\s+(\w+).*by\s+(\w+)', re.I),
            ],
            
            # MEDIUM - System issues from kern.log
            SecurityRule.OOM_KILL: [
                re.compile(r'kernel:.*Out\s+of\s+memory:\s*Kill\s+process\s+(\d+)\s*\(([^)]+)\)', re.I),
                re.compile(r'kernel:.*oom-kill:.*killed\s+process\s+(\d+)', re.I),
            ],
        }
    
    async def start(self):
        """Start the security processor"""
        logger.info("Starting Security Processor...")
        
        if self.db_url:
            await self.connect_db()
        
        self.running = True
        logger.info("Security Processor started successfully")
    
    async def stop(self):
        """Stop the security processor"""
        logger.info("Stopping Security Processor...")
        self.running = False
        
        if self.db_pool:
            await self.db_pool.close()
        
        logger.info("Security Processor stopped")
    
    async def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.db_pool = await asyncpg.create_pool(self.db_url)
            logger.info("Connected to database")
            
            # Ensure VM exists in database
            await self.ensure_vm_exists("u2-vm30000")
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            self.db_pool = None
    
    async def ensure_vm_exists(self, vm_name: str) -> int:
        """Ensure VM exists in database and return its ID"""
        if vm_name in self.vm_cache:
            return self.vm_cache[vm_name]
        
        if not self.db_pool:
            return 1  # Default VM ID for testing
        
        try:
            # First, ensure host exists
            host_id = await self.db_pool.fetchval("""
                INSERT INTO "Host" (name, ip, os, uptime, ssh, cpu, ram, disk, "updatedAt")
                VALUES ($1, '10.1.0.1', 'Ubuntu', 0, true, 0.0, 0.0, 0.0, NOW())
                ON CONFLICT (name) DO UPDATE SET "updatedAt" = NOW()
                RETURNING id
            """, "default-host")
            
            # Then ensure VM exists
            vm_id = await self.db_pool.fetchval("""
                INSERT INTO "VM" (name, cpu, ram, disk, os, uptime, "hostId", "machineId", ip, "updatedAt")
                VALUES ($1, 0.0, 0.0, 0.0, 'Ubuntu', 0, $2, $1, '10.1.0.100', NOW())
                ON CONFLICT ("machineId") DO UPDATE SET "updatedAt" = NOW()
                RETURNING id
            """, vm_name, host_id)
            
            self.vm_cache[vm_name] = vm_id
            logger.info(f"VM {vm_name} has ID {vm_id}")
            return vm_id
            
        except Exception as e:
            logger.error(f"Failed to ensure VM exists: {e}")
            return 1
    
    def parse_log_line(self, line: str) -> Optional[SecurityEvent]:
        """Parse a single log line and return SecurityEvent if it matches patterns"""
        if not line.strip():
            return None
        
        # Parse the custom log format: TIMESTAMP | VM_NAME | LOG_SOURCE | ORIGINAL_LOG_ENTRY
        parts = line.strip().split(' | ', 3)
        if len(parts) != 4:
            return None
        
        timestamp_str, vm_name, source, original_message = parts
        
        try:
            timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            timestamp = datetime.now()
        
        # Check against all security patterns
        for rule, patterns in self.patterns.items():
            for pattern in patterns:
                match = pattern.search(original_message)
                if match:
                    # Determine severity based on rule
                    severity = self._get_severity(rule, match, original_message)
                    
                    # Extract metadata
                    metadata = self._extract_metadata(rule, match, original_message)
                    
                    return SecurityEvent(
                        vm_name=vm_name,
                        timestamp=timestamp,
                        source=source,
                        message=line.strip(),
                        severity=severity,
                        rule=rule,
                        metadata=metadata
                    )
        
        return None
    
    def _get_severity(self, rule: SecurityRule, match, message: str) -> SecuritySeverity:
        """Determine severity based on rule and context"""
        if rule == SecurityRule.EGRESS:
            # Critical if reading sensitive files
            read_file = match.group(2) if len(match.groups()) > 1 else ""
            if any(ext in read_file.lower() for ext in ['.csv', '.zip', '.sql', '.key', '.pem']):
                return SecuritySeverity.CRITICAL
            return SecuritySeverity.HIGH
        
        elif rule == SecurityRule.BRUTE_FORCE:
            return SecuritySeverity.HIGH
        
        elif rule == SecurityRule.SUDO:
            # Higher severity for root escalation
            if 'USER=root' in message or 'session opened for user root' in message:
                return SecuritySeverity.HIGH
            return SecuritySeverity.MEDIUM
        
        elif rule == SecurityRule.OOM_KILL:
            return SecuritySeverity.MEDIUM
        
        return SecuritySeverity.LOW
    
    def _extract_metadata(self, rule: SecurityRule, match, message: str) -> Dict:
        """Extract relevant metadata from the match"""
        metadata = {}
        
        if rule == SecurityRule.EGRESS:
            groups = match.groups()
            if len(groups) >= 5:
                metadata.update({
                    'pid': groups[0],
                    'read_file': groups[1],
                    'write_dest': groups[2],
                    'uid': groups[3],
                    'gid': groups[4]
                })
        
        elif rule == SecurityRule.BRUTE_FORCE:
            groups = match.groups()
            if len(groups) >= 2:
                metadata.update({
                    'username': groups[0],
                    'source_ip': groups[1]
                })
        
        elif rule == SecurityRule.SUDO:
            groups = match.groups()
            if len(groups) >= 1:
                metadata['user'] = groups[0]
                if len(groups) >= 3:
                    metadata['command'] = groups[2]
        
        return metadata
    
    async def save_event(self, event: SecurityEvent) -> bool:
        """Save security event to database"""
        if not self.db_pool:
            logger.warning(f"No database connection, would save: {event.rule.value} - {event.message[:100]}")
            return False
        
        try:
            vm_id = await self.ensure_vm_exists(event.vm_name)
            
            await self.db_pool.execute("""
                INSERT INTO "SecurityEvent" 
                ("vmId", timestamp, source, message, severity, rule, "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """, vm_id, event.timestamp, event.source, event.message, 
                event.severity.value, event.rule.value)
            
            logger.info(f"Saved {event.severity.value} {event.rule.value} event for {event.vm_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save event: {e}")
            return False
    
    async def process_log_file(self, file_path: str) -> Dict:
        """Process a single log file and return statistics"""
        if not os.path.exists(file_path):
            logger.error(f"Log file not found: {file_path}")
            return {"error": f"File not found: {file_path}"}
        
        stats = {
            "file": file_path,
            "lines_processed": 0,
            "events_found": 0,
            "events_saved": 0,
            "events_by_severity": defaultdict(int),
            "events_by_rule": defaultdict(int),
            "start_time": time.time()
        }
        
        logger.info(f"Processing log file: {file_path}")
        
        try:
            with open(file_path, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    stats["lines_processed"] += 1
                    
                    event = self.parse_log_line(line)
                    if event:
                        stats["events_found"] += 1
                        stats["events_by_severity"][event.severity.value] += 1
                        stats["events_by_rule"][event.rule.value] += 1
                        
                        # Save to database
                        if await self.save_event(event):
                            stats["events_saved"] += 1
                        
                        # Log critical events immediately
                        if event.severity == SecuritySeverity.CRITICAL:
                            logger.critical(f"CRITICAL EVENT: {event.rule.value} - {event.message[:200]}")
        
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            stats["error"] = str(e)
        
        stats["duration"] = time.time() - stats["start_time"]
        stats["events_by_severity"] = dict(stats["events_by_severity"])
        stats["events_by_rule"] = dict(stats["events_by_rule"])
        
        logger.info(f"Completed {file_path}: {stats['events_found']} events found, {stats['events_saved']} saved")
        return stats
    
    async def process_all_logs(self, log_dir: str = ".") -> Dict:
        """Process all log files in directory"""
        log_files = [
            os.path.join(log_dir, "auth.log"),
            os.path.join(log_dir, "kern.log"),
            os.path.join(log_dir, "syslog")
        ]
        
        all_stats = {
            "total_files": len(log_files),
            "files_processed": 0,
            "total_events": 0,
            "total_saved": 0,
            "start_time": time.time(),
            "file_stats": []
        }
        
        for log_file in log_files:
            if os.path.exists(log_file):
                stats = await self.process_log_file(log_file)
                all_stats["file_stats"].append(stats)
                all_stats["files_processed"] += 1
                all_stats["total_events"] += stats.get("events_found", 0)
                all_stats["total_saved"] += stats.get("events_saved", 0)
            else:
                logger.warning(f"Log file not found: {log_file}")
        
        all_stats["duration"] = time.time() - all_stats["start_time"]
        return all_stats
    
    def analyze_events(self, events: List[SecurityEvent]) -> Dict:
        """Analyze security events for patterns and threats"""
        analysis = {
            "total_events": len(events),
            "severity_breakdown": defaultdict(int),
            "rule_breakdown": defaultdict(int),
            "threats": [],
            "recommendations": []
        }
        
        ip_failures = defaultdict(int)
        user_sudo_attempts = defaultdict(int)
        egress_files = []
        
        for event in events:
            analysis["severity_breakdown"][event.severity.value] += 1
            analysis["rule_breakdown"][event.rule.value] += 1
            
            # Track brute force attempts
            if event.rule == SecurityRule.BRUTE_FORCE and event.metadata:
                ip = event.metadata.get('source_ip')
                if ip:
                    ip_failures[ip] += 1
            
            # Track sudo escalations
            if event.rule == SecurityRule.SUDO and event.metadata:
                user = event.metadata.get('user')
                if user:
                    user_sudo_attempts[user] += 1
            
            # Track data exfiltration
            if event.rule == SecurityRule.EGRESS and event.metadata:
                read_file = event.metadata.get('read_file')
                if read_file and read_file != '(null)':
                    egress_files.append(read_file)
        
        # Generate threat alerts
        for ip, count in ip_failures.items():
            if count > 5:
                analysis["threats"].append(f"Brute force attack from {ip}: {count} failed attempts")
        
        for user, count in user_sudo_attempts.items():
            if count > 10:
                analysis["threats"].append(f"Excessive sudo usage by {user}: {count} attempts")
        
        if egress_files:
            unique_files = list(set(egress_files))
            analysis["threats"].append(f"Data exfiltration detected: {len(unique_files)} unique files accessed")
        
        # Generate recommendations
        if analysis["severity_breakdown"]["critical"] > 0:
            analysis["recommendations"].append("Immediate investigation required for critical events")
        
        if len(ip_failures) > 3:
            analysis["recommendations"].append("Consider implementing IP-based rate limiting")
        
        if egress_files:
            analysis["recommendations"].append("Review file access permissions and implement DLP controls")
        
        return dict(analysis)

# CLI and testing functions
async def main():
    """Main function for CLI usage"""
    processor = SecurityProcessor()
    await processor.start()
    
    try:
        if len(sys.argv) > 1:
            # Process specific file
            file_path = sys.argv[1]
            stats = await processor.process_log_file(file_path)
        else:
            # Process all logs in current directory
            stats = await processor.process_all_logs()
        
        print("\n" + "="*60)
        print("SECURITY LOG PROCESSING RESULTS")
        print("="*60)
        print(json.dumps(stats, indent=2, default=str))
        
    except KeyboardInterrupt:
        logger.info("Processing interrupted by user")
    finally:
        await processor.stop()

if __name__ == "__main__":
    asyncio.run(main()) 