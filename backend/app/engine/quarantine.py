import os
import shutil
import time
from pathlib import Path
from app.config import QUARANTINE_DIR
from app.database.db import get_db

def quarantine_file(file_id: int, retention_days: int = 30) -> dict:
    """
    Safely moves a file to the managed quarantine vault.
    Never immediately deletes files. Records original metadata so it can be restored anytime.
    """
    os.makedirs(QUARANTINE_DIR, exist_ok=True)
    
    with get_db() as conn:
        row = conn.execute("SELECT * FROM files WHERE id = ?", (file_id,)).fetchone()
        if not row:
            raise ValueError(f"File with ID {file_id} not found.")
        
        orig_path = row["path"]
        if not os.path.exists(orig_path):
            raise FileNotFoundError(f"Source file does not exist on disk: {orig_path}")
            
        file_size = row["size"]
        file_hash = row["hash"]
        filename = row["filename"]
        
        now = time.time()
        purge_at = now + (retention_days * 24 * 3600)
        
        # Subdirectory per day/batch for neat vault storage
        date_folder = time.strftime("%Y-%m-%d", time.localtime(now))
        vault_subfolder = QUARANTINE_DIR / date_folder
        os.makedirs(vault_subfolder, exist_ok=True)
        
        target_name = f"{int(now)}_{file_id}_{filename}"
        dest_path = vault_subfolder / target_name
        
        # Perform safe move
        shutil.move(orig_path, str(dest_path))
        
        # Update files table & record in quarantine table
        conn.execute("UPDATE files SET is_quarantined = 1 WHERE id = ?", (file_id,))
        cur = conn.execute("""
            INSERT INTO quarantine (
                file_id, original_path, quarantine_path, file_size,
                quarantined_at, retention_days, purge_at, file_hash, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUARANTINED')
        """, (
            file_id, orig_path, str(dest_path), file_size,
            now, retention_days, purge_at, file_hash
        ))
        quarantine_id = cur.lastrowid
        
        # Mark recommendations as approved/acted
        conn.execute("""
            UPDATE recommendations SET status = 'ACTED' WHERE file_id = ?
        """, (file_id,))
        
        # Log user decision
        conn.execute("""
            INSERT INTO user_decisions (recommendation_id, file_path, decision, timestamp, notes)
            VALUES (NULL, ?, 'QUARANTINE', ?, 'File moved to safe quarantine vault')
        """, (orig_path, now))
        
        conn.commit()
        
        return {
            "success": True,
            "quarantine_id": quarantine_id,
            "original_path": orig_path,
            "quarantine_path": str(dest_path),
            "retention_days": retention_days,
            "purge_at": purge_at
        }

def restore_file(quarantine_id: int) -> dict:
    """
    Restores a file from the quarantine vault back to its exact original path.
    Recreates directories if deleted.
    """
    with get_db() as conn:
        q_row = conn.execute("SELECT * FROM quarantine WHERE id = ?", (quarantine_id,)).fetchone()
        if not q_row:
            raise ValueError(f"Quarantine record {quarantine_id} not found.")
            
        quarantine_path = q_row["quarantine_path"]
        orig_path = q_row["original_path"]
        file_id = q_row["file_id"]
        
        if not os.path.exists(quarantine_path):
            raise FileNotFoundError(f"Quarantined copy missing: {quarantine_path}")
            
        # Recreate parent directory if needed
        os.makedirs(os.path.dirname(orig_path), exist_ok=True)
        
        # If a file already exists at original path, rename restored file
        target_restore_path = orig_path
        if os.path.exists(orig_path):
            p = Path(orig_path)
            target_restore_path = str(p.parent / f"{p.stem}_restored{p.suffix}")
            
        shutil.move(quarantine_path, target_restore_path)
        
        now = time.time()
        conn.execute("""
            UPDATE quarantine 
            SET status = 'RESTORED', restored_at = ? 
            WHERE id = ?
        """, (now, quarantine_id))
        
        if file_id:
            conn.execute("UPDATE files SET is_quarantined = 0 WHERE id = ?", (file_id,))
            
        conn.execute("""
            INSERT INTO user_decisions (recommendation_id, file_path, decision, timestamp, notes)
            VALUES (NULL, ?, 'RESTORE', ?, 'File restored from quarantine to original location')
        """, (orig_path, now))
        
        conn.commit()
        
        return {
            "success": True,
            "restored_path": target_restore_path,
            "quarantine_id": quarantine_id
        }

def purge_file(quarantine_id: int) -> dict:
    """
    Permanently deletes a file from the quarantine vault.
    """
    with get_db() as conn:
        q_row = conn.execute("SELECT * FROM quarantine WHERE id = ?", (quarantine_id,)).fetchone()
        if not q_row:
            raise ValueError(f"Quarantine record {quarantine_id} not found.")
            
        quarantine_path = q_row["quarantine_path"]
        file_id = q_row["file_id"]
        
        if os.path.exists(quarantine_path):
            os.remove(quarantine_path)
            
        conn.execute("UPDATE quarantine SET status = 'PURGED' WHERE id = ?", (quarantine_id,))
        if file_id:
            conn.execute("UPDATE files SET is_deleted = 1 WHERE id = ?", (file_id,))
            
        conn.commit()
        return {"success": True, "quarantine_id": quarantine_id}
