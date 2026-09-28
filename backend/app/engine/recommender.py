import time
from app.database.db import get_db

def generate_recommendations() -> int:
    """
    Analyzes indexed files and classifications to produce actionable, explainable recommendations.
    Categories: DELETE, REVIEW, ARCHIVE, COMPRESS, MOVE, KEEP.
    Transparently attaches confidence scores and human-readable explanations.
    """
    now = time.time()
    count = 0
    
    with get_db() as conn:
        # Clear previous pending recommendations to refresh
        conn.execute("DELETE FROM recommendations WHERE status = 'PENDING'")
        
        # 1. Exact Duplicate Recommendation (DELETE redundant copies)
        duplicate_groups = conn.execute("""
            SELECT hash, COUNT(*) as cnt, SUM(size) as total_size
            FROM files
            WHERE hash IS NOT NULL AND is_quarantined = 0 AND is_deleted = 0
            GROUP BY hash
            HAVING cnt > 1
        """).fetchall()
        
        for group in duplicate_groups:
            dupes = conn.execute("""
                SELECT f.id, f.path, f.filename, f.size, f.created_at, c.deletion_risk
                FROM files f
                JOIN classifications c ON f.id = c.file_id
                WHERE f.hash = ? AND f.is_quarantined = 0 AND f.is_deleted = 0
                ORDER BY f.created_at ASC
            """, (group["hash"],)).fetchall()
            
            # The earliest created is considered the PRIMARY copy to KEEP
            primary_file = dupes[0]
            redundant_files = dupes[1:]
            
            for red in redundant_files:
                # If redundant file is marked protected, downgrade recommendation to REVIEW
                rec_type = "DELETE" if red["deletion_risk"] != "protected" else "REVIEW"
                confidence = 0.99 if rec_type == "DELETE" else 0.70
                
                reason = (
                    f"Exact byte-for-byte duplicate (SHA-256 match) of original '{primary_file['filename']}' "
                    f"at '{primary_file['path']}'. Safe to remove; the primary copy is retained."
                )
                conn.execute("""
                    INSERT INTO recommendations (
                        file_id, recommendation_type, group_key, title, reason,
                        confidence, potential_saving_bytes, status, created_at
                    ) VALUES (?, ?, 'exact_duplicates', ?, ?, ?, ?, 'PENDING', ?)
                """, (
                    red["id"], rec_type, f"Duplicate of {primary_file['filename']}",
                    reason, confidence, red["size"], now
                ))
                count += 1

        # 2. Obsolete Installers (> 14 days old in downloads/temp)
        installers = conn.execute("""
            SELECT f.id, f.filename, f.size, f.path, c.reasons
            FROM files f
            JOIN classifications c ON f.id = c.file_id
            WHERE c.category = 'installer' AND c.subcategory = 'obsolete_installer'
              AND f.is_quarantined = 0 AND f.is_deleted = 0
        """).fetchall()
        
        for inst in installers:
            reason = (
                f"Downloaded software installer '{inst['filename']}' ({inst['size'] // (1024*1024)} MB). "
                f"Unused for over 14 days. Software installers can typically be downloaded again if ever required."
            )
            conn.execute("""
                INSERT INTO recommendations (
                    file_id, recommendation_type, group_key, title, reason,
                    confidence, potential_saving_bytes, status, created_at
                ) VALUES (?, 'DELETE', 'obsolete_installers', ?, ?, 0.94, ?, 'PENDING', ?)
            """, (
                inst["id"], f"Obsolete installer: {inst['filename']}",
                reason, inst["size"], now
            ))
            count += 1

        # 3. Aged Screenshots (> 30 days old)
        screenshots = conn.execute("""
            SELECT f.id, f.filename, f.size, f.path
            FROM files f
            JOIN classifications c ON f.id = c.file_id
            WHERE c.category = 'screenshot' AND c.subcategory = 'aged_screenshot'
              AND f.is_quarantined = 0 AND f.is_deleted = 0
        """).fetchall()
        
        for sc in screenshots:
            reason = (
                f"Screenshot '{sc['filename']}' taken over 30 days ago. Screenshots are predominantly temporary "
                f"visual references that accumulate unnoticed."
            )
            conn.execute("""
                INSERT INTO recommendations (
                    file_id, recommendation_type, group_key, title, reason,
                    confidence, potential_saving_bytes, status, created_at
                ) VALUES (?, 'REVIEW', 'aged_screenshots', ?, ?, 0.85, ?, 'PENDING', ?)
            """, (
                sc["id"], f"Aged screenshot: {sc['filename']}",
                reason, sc["size"], now
            ))
            count += 1

        # 4. Temporary / Intermediate Exports & Renders
        temp_exports = conn.execute("""
            SELECT f.id, f.filename, f.size, f.path
            FROM files f
            JOIN classifications c ON f.id = c.file_id
            WHERE c.category = 'temporary_export'
              AND f.is_quarantined = 0 AND f.is_deleted = 0
        """).fetchall()
        
        for te in temp_exports:
            reason = (
                f"File '{te['filename']}' appears to be a generated export, test render, or temporary draft. "
                f"Review to confirm whether it is superseded by a final version."
            )
            conn.execute("""
                INSERT INTO recommendations (
                    file_id, recommendation_type, group_key, title, reason,
                    confidence, potential_saving_bytes, status, created_at
                ) VALUES (?, 'REVIEW', 'temporary_exports', ?, ?, 0.80, ?, 'PENDING', ?)
            """, (
                te["id"], f"Temporary export: {te['filename']}",
                reason, te["size"], now
            ))
            count += 1

        # 5. Large Inactive Files (> 100MB, not modified in 6 months)
        six_months_ago = now - (180 * 24 * 3600)
        large_inactive = conn.execute("""
            SELECT f.id, f.filename, f.size, f.path, c.category, c.deletion_risk
            FROM files f
            JOIN classifications c ON f.id = c.file_id
            WHERE f.size > 100 * 1024 * 1024 
              AND f.modified_at < ?
              AND c.deletion_risk != 'protected'
              AND f.id NOT IN (SELECT file_id FROM recommendations WHERE status = 'PENDING')
              AND f.is_quarantined = 0 AND f.is_deleted = 0
        """, (six_months_ago,)).fetchall()

        for lf in large_inactive:
            reason = (
                f"Large file ({lf['size'] // (1024*1024)} MB) untouched for over 6 months. "
                f"Consider archiving to an external drive or removing if no longer active."
            )
            conn.execute("""
                INSERT INTO recommendations (
                    file_id, recommendation_type, group_key, title, reason,
                    confidence, potential_saving_bytes, status, created_at
                ) VALUES (?, 'ARCHIVE', 'large_inactive', ?, ?, 0.75, ?, 'PENDING', ?)
            """, (
                lf["id"], f"Large inactive file: {lf['filename']}",
                reason, lf["size"], now
            ))
            count += 1

        conn.commit()
    return count
