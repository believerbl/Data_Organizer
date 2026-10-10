from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psutil
import threading
import time
from typing import List, Optional

from app.config import DEFAULT_SCAN_TARGETS
from app.database.db import init_db, get_db
from app.engine.scanner import scan_directories
from app.engine.recommender import generate_recommendations
from app.engine.quarantine import quarantine_file, restore_file, purge_file
from app.engine.health_score import compute_health_metrics
from app.engine.advisor import query_advisor

# Initialize database schema on startup
init_db()

app = FastAPI(
    title="Data Organizer API",
    description="Local-first AI storage intelligence agent by Parimarjan Shukla",
    version="1.0.0"
)

# CORS enabled for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class ScanRequest(BaseModel):
    targets: List[str]
    max_files: Optional[int] = None

class QuarantineActionRequest(BaseModel):
    file_id: int
    retention_days: Optional[int] = 30

class BatchQuarantineRequest(BaseModel):
    file_ids: List[int]
    retention_days: Optional[int] = 30

class RestoreRequest(BaseModel):
    quarantine_id: int

class PurgeRequest(BaseModel):
    quarantine_id: int

class ChatRequest(BaseModel):
    message: str

# Thread-safe scan status
scan_state_lock = threading.Lock()
scan_state = {
    "is_scanning": False,
    "current_step": "idle",
    "progress_percent": 0,
    "current_index": 0,
    "total_files": 0,
    "current_file": "",
    "last_result": None,
    "error": None
}

def scan_progress_callback(info: dict):
    with scan_state_lock:
        curr = info.get("current", 0)
        tot = max(1, info.get("total", 1))
        scan_state["current_step"] = info.get("step", "scanning")
        scan_state["current_index"] = curr
        scan_state["total_files"] = tot
        scan_state["current_file"] = info.get("current_file", "")
        scan_state["progress_percent"] = min(99, int((curr / tot) * 100))

def run_background_scan(targets: List[str], max_files: Optional[int]):
    global scan_state
    try:
        with scan_state_lock:
            scan_state["is_scanning"] = True
            scan_state["current_step"] = "discovering_files"
            scan_state["progress_percent"] = 5
            scan_state["error"] = None

        res = scan_directories(targets, progress_callback=scan_progress_callback, max_files=max_files)
        
        with scan_state_lock:
            scan_state["current_step"] = "generating_recommendations"
            scan_state["progress_percent"] = 90
            
        recs_count = generate_recommendations()
        res["recommendations_generated"] = recs_count

        with scan_state_lock:
            scan_state["last_result"] = res
            scan_state["current_step"] = "completed"
            scan_state["progress_percent"] = 100
    except Exception as e:
        with scan_state_lock:
            scan_state["error"] = str(e)
            scan_state["current_step"] = "error"
    finally:
        with scan_state_lock:
            scan_state["is_scanning"] = False

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Data Organizer"}

@app.get("/api/stats")
def get_stats():
    """Returns Storage Health Score, multi-drive usage, and indexed category metrics."""
    return compute_health_metrics()

@app.get("/api/scan/targets")
def get_scan_targets():
    """Lists available system directories and all local drive partitions."""
    available_drives = []
    for part in psutil.disk_partitions(all=False):
        try:
            if "cdrom" in part.opts or part.fstype == "":
                continue
            usage = psutil.disk_usage(part.mountpoint)
            available_drives.append({
                "path": part.mountpoint,
                "label": f"Drive {part.mountpoint.rstrip('\\')} ({usage.total // (1024**3)} GB)",
                "fstype": part.fstype,
                "total_bytes": usage.total,
                "free_bytes": usage.free,
                "used_bytes": usage.used,
                "percent_used": usage.percent
            })
        except Exception:
            continue

    user_folders = []
    for target in DEFAULT_SCAN_TARGETS:
        if os.path.exists(target):
            name = os.path.basename(target)
            user_folders.append({
                "path": target,
                "label": name
            })

    return {
        "drives": available_drives,
        "user_folders": user_folders,
        "default_targets": [d["path"] for d in available_drives]
    }

@app.post("/api/scan/start")
def start_scan(req: ScanRequest):
    global scan_state
    with scan_state_lock:
        if scan_state["is_scanning"]:
            return {
                "success": True,
                "already_running": True,
                "message": "A scan is already actively running in the background",
                "status": scan_state
            }
        
        # Reset state
        scan_state["is_scanning"] = True
        scan_state["progress_percent"] = 0
        scan_state["current_step"] = "starting"
        scan_state["total_files"] = 0
        scan_state["current_file"] = ""
        scan_state["error"] = None

    # Spawn asynchronous worker thread
    t = threading.Thread(
        target=run_background_scan,
        args=(req.targets, req.max_files),
        daemon=True
    )
    t.start()

    return {
        "success": True,
        "already_running": False,
        "message": "Scan started in background",
        "status": scan_state
    }

@app.get("/api/scan/status")
def get_scan_status():
    with scan_state_lock:
        return dict(scan_state)

@app.get("/api/recommendations")
def get_recommendations(status: str = "PENDING"):
    """Fetches recommendations categorized by actionable groups."""
    with get_db() as conn:
        recs = conn.execute("""
            SELECT 
                r.id, r.file_id, r.recommendation_type, r.group_key, r.title,
                r.reason, r.confidence, r.potential_saving_bytes, r.status, r.created_at,
                f.path, f.filename, f.size, f.modified_at,
                c.category, c.deletion_risk, c.importance_score
            FROM recommendations r
            JOIN files f ON r.file_id = f.id
            JOIN classifications c ON f.id = c.file_id
            WHERE r.status = ?
            ORDER BY r.potential_saving_bytes DESC
        """, (status,)).fetchall()
        
        return [dict(row) for row in recs]

@app.get("/api/duplicates")
def get_duplicate_groups():
    """Returns clustered duplicate groups with primary file preserved and redundant copies."""
    with get_db() as conn:
        groups = conn.execute("""
            SELECT hash, COUNT(*) as cnt, SUM(size) as total_size
            FROM files
            WHERE hash IS NOT NULL AND is_quarantined = 0 AND is_deleted = 0
            GROUP BY hash
            HAVING cnt > 1
            ORDER BY total_size DESC
        """).fetchall()

        result = []
        for g in groups:
            files_in_group = conn.execute("""
                SELECT f.id, f.path, f.filename, f.size, f.created_at, f.modified_at,
                       c.category, c.deletion_risk
                FROM files f
                JOIN classifications c ON f.id = c.file_id
                WHERE f.hash = ? AND f.is_quarantined = 0 AND f.is_deleted = 0
                ORDER BY f.created_at ASC
            """, (g["hash"],)).fetchall()
            
            if files_in_group:
                result.append({
                    "hash": g["hash"],
                    "total_size": g["total_size"],
                    "primary": dict(files_in_group[0]),
                    "duplicates": [dict(f) for f in files_in_group[1:]]
                })
        return result

@app.post("/api/recommendations/quarantine")
def quarantine_recommendation(req: QuarantineActionRequest):
    """Safely moves a recommended file to Quarantine."""
    try:
        return quarantine_file(req.file_id, req.retention_days or 30)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/recommendations/quarantine-batch")
def quarantine_batch(req: BatchQuarantineRequest):
    """Safely batch moves approved files to Quarantine."""
    results = []
    errors = []
    for fid in req.file_ids:
        try:
            res = quarantine_file(fid, req.retention_days or 30)
            results.append(res)
        except Exception as e:
            errors.append({"file_id": fid, "error": str(e)})
    return {"quarantined_count": len(results), "errors": errors}

@app.post("/api/recommendations/dismiss/{rec_id}")
def dismiss_recommendation(rec_id: int):
    """Dismisses a recommendation so it is not shown again."""
    with get_db() as conn:
        conn.execute("UPDATE recommendations SET status = 'DISMISSED' WHERE id = ?", (rec_id,))
        conn.commit()
    return {"success": True, "dismissed_id": rec_id}

@app.get("/api/quarantine")
def get_quarantine_items():
    """Lists all files in the Quarantine Vault with countdown and restore status."""
    with get_db() as conn:
        items = conn.execute("""
            SELECT id, file_id, original_path, quarantine_path, file_size,
                   quarantined_at, retention_days, purge_at, file_hash, status
            FROM quarantine
            WHERE status = 'QUARANTINED'
            ORDER BY quarantined_at DESC
        """).fetchall()
        return [dict(item) for item in items]

@app.post("/api/quarantine/restore")
def restore_quarantined_item(req: RestoreRequest):
    """Restores a file from the Quarantine Vault back to its original location."""
    try:
        return restore_file(req.quarantine_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/quarantine/purge")
def purge_quarantined_item(req: PurgeRequest):
    """Permanently purges a file from the Quarantine Vault."""
    try:
        return purge_file(req.quarantine_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/chat")
def chat_with_advisor(req: ChatRequest):
    """Conversational Storage Advisor endpoint."""
    return query_advisor(req.message)
