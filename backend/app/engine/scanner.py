import os
import time
from pathlib import Path
from typing import Callable, Generator
from app.config import IGNORE_DIR_NAMES, IMAGE_EXTENSIONS
from app.database.db import get_db
from app.engine.hasher import compute_partial_hash, compute_full_hash
from app.engine.perceptual import compute_image_meta
from app.engine.classifier import classify_file

def scan_directories(
    target_paths: list[str],
    progress_callback: Callable[[dict], None] | None = None,
    max_files: int | None = None
) -> dict:
    """
    Recursively scans target directories, gathers file metadata, computes hashes,
    extracts content metrics, and runs semantic classification.
    """
    start_time = time.time()
    total_files_scanned = 0
    total_bytes_scanned = 0
    errors = []
    
    file_candidates = []
    
    # 1. Traverse directories
    for target in target_paths:
        target_path = Path(target)
        if not target_path.exists() or not target_path.is_dir():
            continue
            
        for root, dirs, files in os.walk(target, topdown=True):
            # In-place filter out ignored directories
            dirs[:] = [d for d in dirs if d.lower() not in IGNORE_DIR_NAMES and not d.startswith(".")]
            
            for fname in files:
                full_path = os.path.join(root, fname)
                try:
                    stat = os.stat(full_path)
                    size = stat.st_size
                    created_at = stat.st_ctime
                    modified_at = stat.st_mtime
                    accessed_at = getattr(stat, 'st_atime', modified_at)
                    ext = Path(fname).suffix.lower()
                    
                    file_candidates.append({
                        "path": full_path,
                        "filename": fname,
                        "extension": ext,
                        "size": size,
                        "created_at": created_at,
                        "modified_at": modified_at,
                        "accessed_at": accessed_at,
                    })
                    
                    total_files_scanned += 1
                    total_bytes_scanned += size
                    
                    if max_files and total_files_scanned >= max_files:
                        break
                except (PermissionError, FileNotFoundError, OSError) as e:
                    errors.append(f"Error accessing {full_path}: {e}")
            if max_files and total_files_scanned >= max_files:
                break

    # 2. Ingest metadata and partial hashes into database
    with get_db() as conn:
        for idx, item in enumerate(file_candidates):
            # Compute partial fingerprint
            partial_h = compute_partial_hash(item["path"])
            now = time.time()
            
            cur = conn.execute("""
                INSERT INTO files (
                    path, filename, extension, size, created_at, modified_at, accessed_at,
                    partial_hash, scanned_at, is_quarantined, is_deleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                ON CONFLICT(path) DO UPDATE SET
                    size = excluded.size,
                    modified_at = excluded.modified_at,
                    accessed_at = excluded.accessed_at,
                    partial_hash = excluded.partial_hash,
                    scanned_at = excluded.scanned_at
            """, (
                item["path"], item["filename"], item["extension"], item["size"],
                item["created_at"], item["modified_at"], item["accessed_at"],
                partial_h, now
            ))
            
            # Fetch file ID
            row = conn.execute("SELECT id FROM files WHERE path = ?", (item["path"],)).fetchone()
            file_id = row["id"]
            
            # Perceptual hash for images
            if item["extension"] in IMAGE_EXTENSIONS:
                img_meta = compute_image_meta(item["path"])
                if img_meta:
                    conn.execute("""
                        INSERT INTO content_meta (file_id, visual_hash, is_image, width, height)
                        VALUES (?, ?, 1, ?, ?)
                        ON CONFLICT(file_id) DO UPDATE SET
                            visual_hash = excluded.visual_hash,
                            width = excluded.width,
                            height = excluded.height
                    """, (file_id, img_meta["visual_hash"], img_meta["width"], img_meta["height"]))

            # Semantic classification
            classification = classify_file(item)
            conn.execute("""
                INSERT INTO classifications (
                    file_id, category, subcategory, importance_score,
                    deletion_risk, confidence, tags, reasons
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(file_id) DO UPDATE SET
                    category = excluded.category,
                    subcategory = excluded.subcategory,
                    importance_score = excluded.importance_score,
                    deletion_risk = excluded.deletion_risk,
                    confidence = excluded.confidence,
                    tags = excluded.tags,
                    reasons = excluded.reasons
            """, (
                file_id, classification["category"], classification["subcategory"],
                classification["importance_score"], classification["deletion_risk"],
                classification["confidence"], classification["tags"], classification["reasons"]
            ))

            if progress_callback and idx % 25 == 0:
                progress_callback({
                    "step": "indexing",
                    "current": idx + 1,
                    "total": len(file_candidates),
                    "current_file": item["filename"]
                })
        conn.commit()

        # 3. Two-Tier Deduplication: Resolve exact hash collisions
        # Find groups of files having identical size and partial_hash (> 1 file)
        collision_groups = conn.execute("""
            SELECT size, partial_hash, COUNT(*) as cnt
            FROM files
            WHERE partial_hash IS NOT NULL AND size > 0 AND is_quarantined = 0 AND is_deleted = 0
            GROUP BY size, partial_hash
            HAVING cnt > 1
        """).fetchall()

        for group in collision_groups:
            matching_files = conn.execute("""
                SELECT id, path FROM files
                WHERE size = ? AND partial_hash = ? AND is_quarantined = 0 AND is_deleted = 0
            """, (group["size"], group["partial_hash"])).fetchall()
            
            for f in matching_files:
                full_h = compute_full_hash(f["path"])
                if full_h:
                    conn.execute("UPDATE files SET hash = ? WHERE id = ?", (full_h, f["id"]))
        conn.commit()

    duration_ms = int((time.time() - start_time) * 1000)
    
    return {
        "scanned_paths": target_paths,
        "total_files": total_files_scanned,
        "total_bytes": total_bytes_scanned,
        "duration_ms": duration_ms,
        "errors_count": len(errors)
    }
