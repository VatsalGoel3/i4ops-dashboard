#!/usr/bin/env python3
"""
VM Log Scanner - Collects and processes security logs from VM directories
Handles both local file access and SSH-based log collection
"""

import os
import sys
import json
import asyncio
import asyncpg
import subprocess
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
import logging

# Add the parent directory to Python path to import security_processor
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from security_processor import SecurityProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('VMLogScanner')

class VMLogScanner:
    """
    Scans VM log directories and processes security logs
    Handles both direct file access and SSH collection
    """
    
    def __init__(self, base_path: str = "/mnt/vm-security"):
        self.base_path = base_path
        self.security_processor = None
        self.ssh_config = {
            'username': 'i4ops',
            'key_path': '/home/i4ops/.ssh/id_rsa',
            'timeout': 30
        }
        
    async def start(self):
        """Initialize the scanner"""
        logger.info("Starting VM Log Scanner...")
        
        # Initialize security processor
        db_url = os.getenv('DATABASE_URL')
        self.security_processor = SecurityProcessor(db_url)
        await self.security_processor.start()
        
        logger.info("VM Log Scanner initialized")
    
    async def stop(self):
        """Clean up resources"""
        if self.security_processor:
            await self.security_processor.stop()
        logger.info("VM Log Scanner stopped")
    
    def discover_vm_directories(self) -> List[str]:
        """Discover all VM directories in the base path"""
        vm_dirs = []
        
        if not os.path.exists(self.base_path):
            logger.warning(f"Base path does not exist locally: {self.base_path}")
            # Try to get directory listing from u0 via SSH
            return self.discover_remote_vm_directories()
        
        try:
            for item in os.listdir(self.base_path):
                item_path = os.path.join(self.base_path, item)
                if os.path.isdir(item_path):
                    # Check if it's a VM directory (starts with 'u' and may have -vm suffix)
                    if item.startswith('u') and (item[1:].isdigit() or '-vm' in item):
                        vm_dirs.append(item)
                        logger.info(f"Discovered VM directory: {item}")
            
            logger.info(f"Found {len(vm_dirs)} VM directories")
            return sorted(vm_dirs)
            
        except Exception as e:
            logger.error(f"Failed to discover VM directories: {e}")
            return []
    
    def discover_remote_vm_directories(self) -> List[str]:
        """Discover VM directories on u0 via SSH"""
        vm_dirs = []
        
        try:
            # SSH to u0 to list directories
            ssh_cmd = [
                'ssh', 
                '-o', 'ConnectTimeout=10',
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'UserKnownHostsFile=/dev/null',
                'i4ops@u0',  # SSH to u0 directly
                f'ls -1 {self.base_path} 2>/dev/null || echo "DIRECTORY_NOT_FOUND"'
            ]
            
            result = subprocess.run(
                ssh_cmd, 
                capture_output=True, 
                text=True, 
                timeout=30
            )
            
            if result.returncode == 0 and result.stdout.strip() != "DIRECTORY_NOT_FOUND":
                for item in result.stdout.strip().split('\n'):
                    item = item.strip()
                    if item and item.startswith('u') and (item[1:].isdigit() or '-vm' in item):
                        vm_dirs.append(item)
                        logger.info(f"Discovered remote VM directory: {item}")
                
                logger.info(f"Found {len(vm_dirs)} remote VM directories on u0")
            else:
                logger.error(f"Failed to list remote directories on u0: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            logger.error("SSH timeout while discovering remote VM directories on u0")
        except Exception as e:
            logger.error(f"Error discovering remote VM directories on u0: {e}")
        
        return sorted(vm_dirs)
    
    def get_vm_ip_from_name(self, vm_name: str) -> Optional[str]:
        """
        Extract VM IP from name or use a mapping
        This is a simplified version - in production you'd have a proper VM registry
        """
        # For u2-vm30000, u8-vm30000, etc., try to map to known IPs
        vm_ip_mapping = {
            'u2-vm30000': '10.1.0.2',
            'u8-vm30000': '10.1.0.8',
            'u3': '10.1.0.3',
            'u4': '10.1.0.4',
            'u5': '10.1.0.5',
            'u6': '10.1.0.6',
            'u7': '10.1.0.7',
            'u9': '10.1.0.9',
            'u10': '10.1.0.10',
            'u11': '10.1.0.11',
            'u12': '10.1.0.12',
        }
        
        return vm_ip_mapping.get(vm_name)
    
    def check_vm_logs_exist_locally(self, vm_dir: str) -> Dict[str, bool]:
        """Check which log files exist locally"""
        vm_path = os.path.join(self.base_path, vm_dir)
        log_files = ['auth.log', 'kern.log', 'syslog']
        
        status = {}
        for log_file in log_files:
            file_path = os.path.join(vm_path, log_file)
            status[log_file] = os.path.exists(file_path) and os.path.getsize(file_path) > 0
        
        return status
    
    async def collect_logs_via_ssh(self, vm_name: str, vm_ip: str = None) -> Dict[str, str]:
        """
        Collect logs from u0's /mnt/vm-security/ directory via SSH
        Returns a dict with log file names as keys and collected log content as values
        """
        collected_logs = {}
        log_files = ['auth.log', 'kern.log', 'syslog']
        
        # SSH to u0 to get logs from /mnt/vm-security/{vm_name}/
        ssh_base_cmd = [
            'ssh', 
            '-o', 'ConnectTimeout=10',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            'i4ops@u0'  # Always SSH to u0 to access /mnt/vm-security/
        ]
        
        for log_file in log_files:
            try:
                # Path on u0: /mnt/vm-security/{vm_name}/{log_file}
                remote_log_path = f'{self.base_path}/{vm_name}/{log_file}'
                
                # Get recent log entries (last 1000 lines)
                cmd = ssh_base_cmd + [f'tail -1000 {remote_log_path} 2>/dev/null || echo "FILE_NOT_FOUND"']
                
                result = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True, 
                    timeout=self.ssh_config['timeout']
                )
                
                if result.returncode == 0 and result.stdout.strip() != "FILE_NOT_FOUND":
                    log_content = result.stdout.strip()
                    if log_content:
                        collected_logs[log_file] = log_content
                        logger.info(f"Collected {log_file} from u0:{remote_log_path} ({len(log_content)} chars)")
                else:
                    logger.warning(f"Could not collect {log_file} from u0:{remote_log_path}")
                    
            except subprocess.TimeoutExpired:
                logger.warning(f"SSH timeout collecting {log_file} from {vm_name} on u0")
                continue
            except Exception as e:
                logger.error(f"Error collecting {log_file} from {vm_name} on u0 via SSH: {e}")
        
        return collected_logs
    
    def format_log_lines(self, vm_name: str, log_source: str, raw_content: str) -> List[str]:
        """
        Format raw log content into the expected format for security processor
        Format: TIMESTAMP | VM_NAME | LOG_SOURCE | ORIGINAL_LOG_ENTRY
        """
        formatted_lines = []
        
        for line in raw_content.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Try to extract timestamp from the log line
            # Most syslog formats start with timestamp like "Jan 15 10:30:45"
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Format the line for security processor
            formatted_line = f"{timestamp} | {vm_name} | {log_source} | {line}"
            formatted_lines.append(formatted_line)
        
        return formatted_lines
    
    async def process_vm_logs(self, vm_name: str) -> Dict:
        """Process logs for a specific VM"""
        stats = {
            'vm_name': vm_name,
            'logs_found': [],
            'logs_collected_ssh': [],
            'events_found': 0,
            'events_saved': 0,
            'processing_time': 0,
            'errors': []
        }
        
        start_time = time.time()
        
        try:
            # Check local files first
            local_status = self.check_vm_logs_exist_locally(vm_name)
            stats['logs_found'] = [log for log, exists in local_status.items() if exists]
            
            # If no local logs or empty logs, try SSH collection from u0
            if not stats['logs_found']:
                logger.info(f"No local logs for {vm_name}, attempting SSH collection from u0")
                
                collected_logs = await self.collect_logs_via_ssh(vm_name)
                stats['logs_collected_ssh'] = list(collected_logs.keys())
                
                # Process collected logs
                for log_source, log_content in collected_logs.items():
                    if log_content:
                        formatted_lines = self.format_log_lines(vm_name, log_source, log_content)
                        
                        # Process each line through security processor
                        for line in formatted_lines:
                            event = self.security_processor.parse_log_line(line)
                            if event:
                                stats['events_found'] += 1
                                if await self.security_processor.save_event(event):
                                    stats['events_saved'] += 1
            
            # Process local logs if they exist
            elif stats['logs_found']:
                vm_path = os.path.join(self.base_path, vm_name)
                for log_file in stats['logs_found']:
                    file_path = os.path.join(vm_path, log_file)
                    try:
                        with open(file_path, 'r') as f:
                            # Read last 1000 lines to avoid processing huge files
                            lines = f.readlines()[-1000:]
                            
                        for line in lines:
                            line = line.strip()
                            if line:
                                # Format the line
                                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                formatted_line = f"{timestamp} | {vm_name} | {log_file} | {line}"
                                
                                event = self.security_processor.parse_log_line(formatted_line)
                                if event:
                                    stats['events_found'] += 1
                                    if await self.security_processor.save_event(event):
                                        stats['events_saved'] += 1
                    
                    except Exception as e:
                        error_msg = f"Error processing local log {log_file}: {e}"
                        logger.error(error_msg)
                        stats['errors'].append(error_msg)
            
            else:
                warning_msg = f"No logs available for {vm_name} (local or SSH)"
                logger.warning(warning_msg)
                stats['errors'].append(warning_msg)
        
        except Exception as e:
            error_msg = f"Error processing VM {vm_name}: {e}"
            logger.error(error_msg)
            stats['errors'].append(error_msg)
        
        stats['processing_time'] = time.time() - start_time
        return stats
    
    async def scan_all_vms(self) -> Dict:
        """Scan and process logs for all VMs"""
        overall_stats = {
            'start_time': datetime.now().isoformat(),
            'total_vms': 0,
            'vms_processed': 0,
            'total_events_found': 0,
            'total_events_saved': 0,
            'vm_results': [],
            'duration': 0
        }
        
        start_time = time.time()
        
        try:
            vm_directories = self.discover_vm_directories()
            overall_stats['total_vms'] = len(vm_directories)
            
            if not vm_directories:
                logger.warning("No VM directories found")
                return overall_stats
            
            logger.info(f"Processing {len(vm_directories)} VMs...")
            
            # Process each VM
            for vm_name in vm_directories:
                logger.info(f"Processing VM: {vm_name}")
                
                vm_stats = await self.process_vm_logs(vm_name)
                overall_stats['vm_results'].append(vm_stats)
                overall_stats['vms_processed'] += 1
                overall_stats['total_events_found'] += vm_stats['events_found']
                overall_stats['total_events_saved'] += vm_stats['events_saved']
                
                logger.info(f"VM {vm_name}: {vm_stats['events_found']} events found, {vm_stats['events_saved']} saved")
        
        except Exception as e:
            logger.error(f"Error during VM scan: {e}")
            overall_stats['error'] = str(e)
        
        overall_stats['duration'] = time.time() - start_time
        overall_stats['end_time'] = datetime.now().isoformat()
        
        return overall_stats

async def main():
    """Main function for CLI usage"""
    if len(sys.argv) > 1:
        base_path = sys.argv[1]
    else:
        base_path = "/mnt/vm-security"
    
    scanner = VMLogScanner(base_path)
    
    try:
        await scanner.start()
        
        logger.info(f"Starting VM log scan in: {base_path}")
        results = await scanner.scan_all_vms()
        
        print("\n" + "="*80)
        print("VM SECURITY LOG SCAN RESULTS")
        print("="*80)
        print(json.dumps(results, indent=2))
        print("="*80)
        
        # Summary
        print(f"\nSUMMARY:")
        print(f"  VMs Processed: {results['vms_processed']}/{results['total_vms']}")
        print(f"  Security Events Found: {results['total_events_found']}")
        print(f"  Events Saved to DB: {results['total_events_saved']}")
        print(f"  Duration: {results['duration']:.2f} seconds")
        
        # VM-specific results
        if results['vm_results']:
            print(f"\nVM DETAILS:")
            for vm_result in results['vm_results']:
                status = "✅" if vm_result['events_found'] > 0 else "⚠️" if vm_result['logs_found'] or vm_result['logs_collected_ssh'] else "❌"
                print(f"  {status} {vm_result['vm_name']}: {vm_result['events_found']} events ({vm_result['processing_time']:.1f}s)")
                
                if vm_result['errors']:
                    for error in vm_result['errors']:
                        print(f"    ⚠️  {error}")
    
    except KeyboardInterrupt:
        logger.info("Scan interrupted by user")
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        sys.exit(1)
    finally:
        await scanner.stop()

if __name__ == "__main__":
    asyncio.run(main()) 