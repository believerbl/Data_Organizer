import re
import time
from app.database.db import get_db

def format_bytes(num_bytes: int) -> str:
    """Helper to format bytes into readable units."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    elif num_bytes < 1024 * 1024 * 1024:
        return f"{num_bytes / (1024*1024):.1f} MB"
    else:
        return f"{num_bytes / (1024*1024*1024):.2f} GB"

def query_advisor(user_message: str) -> dict:
    """
    Intelligent conversational storage advisor.
    Answers natural language storage questions based on real index evidence and safety rules.
    """
    msg = user_message.lower().strip()
    
    with get_db() as conn:
        total_files = conn.execute("SELECT COUNT(*) FROM files WHERE is_quarantined = 0 AND is_deleted = 0").fetchone()[0]
        total_bytes = conn.execute("SELECT COALESCE(SUM(size), 0) FROM files WHERE is_quarantined = 0 AND is_deleted = 0").fetchone()[0]

        # 1. "Can I free X GB?" or "How much can I free?"
        free_match = re.search(r"free\s+(\d+)\s*(gb|mb)?", msg)
        is_free_query = "free" in msg or "clean" in msg or "space" in msg or "recover" in msg
        
        # Stats on duplicates
        dupe_row = conn.execute("""
            SELECT COUNT(*), COALESCE(SUM(potential_saving_bytes), 0)
            FROM recommendations WHERE group_key = 'exact_duplicates' AND status = 'PENDING'
        """).fetchone()
        dupe_count, dupe_savings = dupe_row[0], dupe_row[1]

        # Stats on installers
        inst_row = conn.execute("""
            SELECT COUNT(*), COALESCE(SUM(potential_saving_bytes), 0)
            FROM recommendations WHERE group_key = 'obsolete_installers' AND status = 'PENDING'
        """).fetchone()
        inst_count, inst_savings = inst_row[0], inst_row[1]

        # Stats on screenshots & exports
        other_row = conn.execute("""
            SELECT COUNT(*), COALESCE(SUM(potential_saving_bytes), 0)
            FROM recommendations WHERE group_key IN ('aged_screenshots', 'temporary_exports') AND status = 'PENDING'
        """).fetchone()
        other_count, other_savings = other_row[0], other_row[1]

        # High confidence vs medium confidence
        high_conf_savings = dupe_savings + inst_savings
        total_potential_savings = high_conf_savings + other_savings

        # Query type: DUPLICATES
        if "duplicate" in msg:
            top_dupes = conn.execute("""
                SELECT f.filename, f.size, f.path, r.reason
                FROM recommendations r
                JOIN files f ON r.file_id = f.id
                WHERE r.group_key = 'exact_duplicates' AND r.status = 'PENDING'
                LIMIT 5
            """).fetchall()
            
            response = (
                f"I found **{dupe_count} exact duplicate files** consuming **{format_bytes(dupe_savings)}**.\n\n"
                f"Every candidate has a verified byte-for-byte SHA-256 twin that is preserved. "
                f"You can safely reclaim this space without losing any unique data.\n\n"
            )
            if top_dupes:
                response += "**Top duplicate candidates:**\n"
                for d in top_dupes:
                    response += f"- `{d['filename']}` ({format_bytes(d['size'])})\n"
            return {"response": response, "type": "duplicates", "potential_savings": dupe_savings}

        # Query type: INSTALLERS
        if "installer" in msg or "setup" in msg:
            top_inst = conn.execute("""
                SELECT f.filename, f.size, f.path
                FROM recommendations r
                JOIN files f ON r.file_id = f.id
                WHERE r.group_key = 'obsolete_installers' AND r.status = 'PENDING'
                LIMIT 5
            """).fetchall()
            response = (
                f"I found **{inst_count} old installers** accounting for **{format_bytes(inst_savings)}**.\n\n"
                f"These are installation executables (`.exe`, `.msi`, `.iso`) that haven't been used in over 14 days. "
                f"Since installers can be retrieved anytime online, they are prime candidates for quarantine."
            )
            return {"response": response, "type": "installers", "potential_savings": inst_savings}

        # Query type: SCREENSHOTS
        if "screenshot" in msg:
            return {
                "response": (
                    f"Screenshots analysis: I identified **{other_count} aged screenshots and temporary captures** "
                    f"totaling **{format_bytes(other_savings)}** older than 30 days. "
                    f"You can review them in the Review tab before sending them to the Quarantine Vault."
                ),
                "type": "screenshots",
                "potential_savings": other_savings
            }

        # Query type: FREE SPACE
        if is_free_query:
            target_str = ""
            if free_match:
                target_val = int(free_match.group(1))
                unit = free_match.group(2) or "gb"
                target_str = f" towards your goal of {target_val} {unit.upper()}"

            response = (
                f"Yes! Based on my scan of {total_files} indexed files ({format_bytes(total_bytes)}), "
                f"I identified **{format_bytes(total_potential_savings)}** of potential cleanup{target_str}.\n\n"
                f"**High-Confidence Candidates (Instant Safe Wins):**\n"
                f"- **{format_bytes(dupe_savings)}** — {dupe_count} exact duplicate files\n"
                f"- **{format_bytes(inst_savings)}** — {inst_count} obsolete downloaded installers\n\n"
                f"**Medium-Confidence (Requires User Review):**\n"
                f"- **{format_bytes(other_savings)}** — {other_count} aged screenshots & draft exports\n\n"
                f"[Safe Guardrail Active] Source code projects, sensitive documents, and tax records are strictly locked and will never be touched automatically."
            )
            return {"response": response, "type": "free_space", "potential_savings": total_potential_savings}

        # General inquiry fallback
        categories = conn.execute("""
            SELECT category, COUNT(*) as cnt, SUM(f.size) as total_size
            FROM classifications c
            JOIN files f ON c.file_id = f.id
            WHERE f.is_quarantined = 0 AND f.is_deleted = 0
            GROUP BY category
            ORDER BY total_size DESC
        """).fetchall()

        cat_summary = "\n".join([f"- **{row['category'].replace('_', ' ').title()}**: {row['cnt']} files ({format_bytes(row['total_size'] or 0)})" for row in categories[:5]])

        response = (
            f"Here is your current storage overview ({format_bytes(total_bytes)} across {total_files} indexed files):\n\n"
            f"{cat_summary}\n\n"
            f"I have **{format_bytes(total_potential_savings)}** ready for your review in the Recommendations Hub. "
            f"You can ask me questions like *'Can I free 10 GB?'*, *'Show duplicates'*, or *'Find old installers'*."
        )
        return {"response": response, "type": "general", "potential_savings": total_potential_savings}
