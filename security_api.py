#!/usr/bin/env python3
"""
Security API - FastAPI service for i4ops Security Events
Replaces the TypeScript security event controller with a simple, fast Python API.
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg
from security_processor import SecurityProcessor, SecuritySeverity, SecurityRule

# Pydantic models for API responses
class SecurityEventResponse(BaseModel):
    id: int
    vmId: int
    timestamp: datetime
    source: str
    message: str
    severity: str
    rule: str
    ackAt: Optional[datetime] = None
    createdAt: datetime
    vm: Optional[Dict] = None

class SecurityEventStats(BaseModel):
    total: int
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    last24h: int = 0
    acknowledged: int = 0
    unacknowledged: int = 0

class SecurityEventFilters(BaseModel):
    vmId: Optional[int] = None
    severity: Optional[str] = None
    rule: Optional[str] = None
    since: Optional[datetime] = None
    until: Optional[datetime] = None
    acknowledged: Optional[bool] = None

class ProcessLogsRequest(BaseModel):
    logDir: Optional[str] = "."

class AcknowledgeRequest(BaseModel):
    ids: List[int]

# FastAPI app setup
app = FastAPI(
    title="i4ops Security API",
    description="MVP Security Event API for VM monitoring",
    version="1.0.0"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
db_pool = None
security_processor = None

@app.on_event("startup")
async def startup_event():
    """Initialize database connection and security processor"""
    global db_pool, security_processor
    
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        try:
            db_pool = await asyncpg.create_pool(db_url)
            print("✅ Connected to database")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
    
    security_processor = SecurityProcessor(db_url)
    await security_processor.start()
    print("✅ Security API started")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connections"""
    global db_pool, security_processor
    
    if security_processor:
        await security_processor.stop()
    
    if db_pool:
        await db_pool.close()
    
    print("✅ Security API stopped")

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "i4ops Security API",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/security-events", response_model=Dict[str, Any])
async def get_security_events(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    vmId: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    rule: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
    until: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None)
):
    """Get security events with pagination and filtering"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Build WHERE clause
    where_conditions = []
    params = []
    param_count = 0
    
    if vmId:
        param_count += 1
        where_conditions.append(f'"vmId" = ${param_count}')
        params.append(vmId)
    
    if severity:
        param_count += 1
        where_conditions.append(f'severity = ${param_count}')
        params.append(severity)
    
    if rule:
        param_count += 1
        where_conditions.append(f'rule = ${param_count}')
        params.append(rule)
    
    if since:
        param_count += 1
        where_conditions.append(f'timestamp >= ${param_count}')
        params.append(datetime.fromisoformat(since.replace('Z', '+00:00')))
    
    if until:
        param_count += 1
        where_conditions.append(f'timestamp <= ${param_count}')
        params.append(datetime.fromisoformat(until.replace('Z', '+00:00')))
    
    if acknowledged is not None:
        if acknowledged:
            where_conditions.append('"ackAt" IS NOT NULL')
        else:
            where_conditions.append('"ackAt" IS NULL')
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    # Calculate offset
    offset = (page - 1) * limit
    
    # Get total count
    count_query = f'SELECT COUNT(*) FROM "SecurityEvent" {where_clause}'
    total = await db_pool.fetchval(count_query, *params)
    
    # Get events
    param_count += 1
    limit_param = param_count
    param_count += 1
    offset_param = param_count
    
    events_query = f"""
        SELECT 
            se.id, se."vmId", se.timestamp, se.source, se.message, 
            se.severity, se.rule, se."ackAt", se."createdAt",
            vm.name as vm_name, vm."machineId",
            h.name as host_name
        FROM "SecurityEvent" se
        LEFT JOIN "VM" vm ON se."vmId" = vm.id
        LEFT JOIN "Host" h ON vm."hostId" = h.id
        {where_clause}
        ORDER BY se.timestamp DESC
        LIMIT ${limit_param} OFFSET ${offset_param}
    """
    
    params.extend([limit, offset])
    rows = await db_pool.fetch(events_query, *params)
    
    # Format response
    events = []
    for row in rows:
        event = {
            "id": row["id"],
            "vmId": row["vmId"],
            "timestamp": row["timestamp"].isoformat(),
            "source": row["source"],
            "message": row["message"],
            "severity": row["severity"],
            "rule": row["rule"],
            "ackAt": row["ackAt"].isoformat() if row["ackAt"] else None,
            "createdAt": row["createdAt"].isoformat(),
            "vm": {
                "name": row["vm_name"],
                "machineId": row["machineId"],
                "host": {"name": row["host_name"]}
            } if row["vm_name"] else None
        }
        events.append(event)
    
    return {
        "data": events,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit
    }

@app.get("/api/security-events/stats", response_model=SecurityEventStats)
async def get_security_event_stats(
    since: Optional[str] = Query(None, description="ISO datetime string")
):
    """Get security event statistics"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Default to last 7 days if no since parameter
    if since:
        since_date = datetime.fromisoformat(since.replace('Z', '+00:00'))
    else:
        since_date = datetime.now() - timedelta(days=7)
    
    last24h_date = datetime.now() - timedelta(hours=24)
    
    # Get overall stats
    stats_query = """
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
            COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
            COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
            COUNT(CASE WHEN severity = 'low' THEN 1 END) as low,
            COUNT(CASE WHEN timestamp >= $2 THEN 1 END) as last24h,
            COUNT(CASE WHEN "ackAt" IS NOT NULL THEN 1 END) as acknowledged,
            COUNT(CASE WHEN "ackAt" IS NULL THEN 1 END) as unacknowledged
        FROM "SecurityEvent"
        WHERE timestamp >= $1
    """
    
    row = await db_pool.fetchrow(stats_query, since_date, last24h_date)
    
    return SecurityEventStats(
        total=row["total"] or 0,
        critical=row["critical"] or 0,
        high=row["high"] or 0,
        medium=row["medium"] or 0,
        low=row["low"] or 0,
        last24h=row["last24h"] or 0,
        acknowledged=row["acknowledged"] or 0,
        unacknowledged=row["unacknowledged"] or 0
    )

@app.get("/api/security-events/critical")
async def get_critical_events(
    limit: int = Query(10, ge=1, le=50)
):
    """Get recent critical security events"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    query = """
        SELECT 
            se.id, se."vmId", se.timestamp, se.source, se.message, 
            se.severity, se.rule, se."ackAt", se."createdAt",
            vm.name as vm_name, vm."machineId",
            h.name as host_name
        FROM "SecurityEvent" se
        LEFT JOIN "VM" vm ON se."vmId" = vm.id
        LEFT JOIN "Host" h ON vm."hostId" = h.id
        WHERE se.severity IN ('critical', 'high')
        ORDER BY se.timestamp DESC
        LIMIT $1
    """
    
    rows = await db_pool.fetch(query, limit)
    
    events = []
    for row in rows:
        event = {
            "id": row["id"],
            "vmId": row["vmId"],
            "timestamp": row["timestamp"].isoformat(),
            "source": row["source"],
            "message": row["message"],
            "severity": row["severity"],
            "rule": row["rule"],
            "ackAt": row["ackAt"].isoformat() if row["ackAt"] else None,
            "createdAt": row["createdAt"].isoformat(),
            "vm": {
                "name": row["vm_name"],
                "machineId": row["machineId"],
                "host": {"name": row["host_name"]}
            } if row["vm_name"] else None
        }
        events.append(event)
    
    return events

@app.get("/api/security-events/{event_id}")
async def get_security_event_by_id(event_id: int):
    """Get a specific security event by ID"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    query = """
        SELECT 
            se.id, se."vmId", se.timestamp, se.source, se.message, 
            se.severity, se.rule, se."ackAt", se."createdAt",
            vm.name as vm_name, vm."machineId",
            h.name as host_name
        FROM "SecurityEvent" se
        LEFT JOIN "VM" vm ON se."vmId" = vm.id
        LEFT JOIN "Host" h ON vm."hostId" = h.id
        WHERE se.id = $1
    """
    
    row = await db_pool.fetchrow(query, event_id)
    
    if not row:
        raise HTTPException(status_code=404, detail="Security event not found")
    
    return {
        "id": row["id"],
        "vmId": row["vmId"],
        "timestamp": row["timestamp"].isoformat(),
        "source": row["source"],
        "message": row["message"],
        "severity": row["severity"],
        "rule": row["rule"],
        "ackAt": row["ackAt"].isoformat() if row["ackAt"] else None,
        "createdAt": row["createdAt"].isoformat(),
        "vm": {
            "name": row["vm_name"],
            "machineId": row["machineId"],
            "host": {"name": row["host_name"]}
        } if row["vm_name"] else None
    }

@app.put("/api/security-events/{event_id}/acknowledge")
async def acknowledge_security_event(event_id: int):
    """Acknowledge a specific security event"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    result = await db_pool.execute("""
        UPDATE "SecurityEvent" 
        SET "ackAt" = NOW() 
        WHERE id = $1 AND "ackAt" IS NULL
    """, event_id)
    
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Security event not found or already acknowledged")
    
    return {"message": "Event acknowledged", "id": event_id}

@app.put("/api/security-events/acknowledge")
async def acknowledge_multiple_events(request: AcknowledgeRequest):
    """Acknowledge multiple security events"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    if not request.ids:
        raise HTTPException(status_code=400, detail="No event IDs provided")
    
    # Build dynamic query for multiple IDs
    placeholders = ", ".join(f"${i+1}" for i in range(len(request.ids)))
    
    result = await db_pool.execute(f"""
        UPDATE "SecurityEvent" 
        SET "ackAt" = NOW() 
        WHERE id IN ({placeholders}) AND "ackAt" IS NULL
    """, *request.ids)
    
    # Extract number of updated rows
    updated_count = int(result.split()[-1])
    
    return {"acknowledged": updated_count, "requested": len(request.ids)}

@app.post("/api/security-events/process-logs")
async def process_logs(
    background_tasks: BackgroundTasks,
    request: ProcessLogsRequest = ProcessLogsRequest()
):
    """Manually trigger log processing"""
    if not security_processor:
        raise HTTPException(status_code=500, detail="Security processor not available")
    
    # Run processing in background
    background_tasks.add_task(process_logs_background, request.logDir)
    
    return {
        "message": "Log processing started",
        "logDir": request.logDir,
        "status": "processing"
    }

async def process_logs_background(log_dir: str):
    """Background task for log processing"""
    try:
        stats = await security_processor.process_all_logs(log_dir)
        print(f"✅ Log processing completed: {stats}")
    except Exception as e:
        print(f"❌ Log processing failed: {e}")

@app.post("/api/security-events/test-parsing")
async def test_log_parsing(request: Dict[str, Any]):
    """Test log line parsing for debugging"""
    if not security_processor:
        raise HTTPException(status_code=500, detail="Security processor not available")
    
    log_line = request.get("logLine")
    if not log_line:
        raise HTTPException(status_code=400, detail="logLine is required")
    
    # Parse the line
    event = security_processor.parse_log_line(log_line)
    
    if event:
        return {
            "success": True,
            "event": {
                "vm_name": event.vm_name,
                "timestamp": event.timestamp.isoformat(),
                "source": event.source,
                "severity": event.severity.value,
                "rule": event.rule.value,
                "metadata": event.metadata,
                "message": event.message
            }
        }
    else:
        return {
            "success": False,
            "message": "No security patterns matched"
        }

@app.delete("/api/security-events/cleanup-duplicates")
async def cleanup_duplicate_events():
    """Remove duplicate security events"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Delete duplicates (keep the earliest one for each combination)
    result = await db_pool.execute("""
        DELETE FROM "SecurityEvent" se1
        WHERE EXISTS (
            SELECT 1 FROM "SecurityEvent" se2
            WHERE se2."vmId" = se1."vmId"
            AND se2.source = se1.source
            AND se2.message = se1.message
            AND se2.timestamp = se1.timestamp
            AND se2.id < se1.id
        )
    """)
    
    deleted_count = int(result.split()[-1])
    
    return {
        "message": f"Removed {deleted_count} duplicate events",
        "deleted": deleted_count
    }

# Run with: uvicorn security_api:app --reload --port 8001
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 