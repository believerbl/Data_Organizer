import os
import shutil
import tempfile
import time
from pathlib import Path

# Add backend to sys.path
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.db import init_db, get_db
from app.engine.scanner import scan_directories
from app.engine.recommender import generate_recommendations
from app.engine.quarantine import quarantine_file, restore_file
from app.engine.health_score import compute_health_metrics
from app.engine.advisor import query_advisor

def run_test():
    print(">>> Initializing Data Organizer Database...")
    init_db()
    
    # Clean previous test entries
    with get_db() as conn:
        conn.execute("DELETE FROM recommendations")
        conn.execute("DELETE FROM classifications")
        conn.execute("DELETE FROM content_meta")
        conn.execute("DELETE FROM quarantine")
        conn.execute("DELETE FROM files")
        conn.commit()

    # Create temporary sandbox folder
    temp_dir = tempfile.mkdtemp(prefix="data_organizer_test_")
    print(f">>> Created test sandbox at: {temp_dir}")

    try:
        # Create test files
        # 1. Exact duplicates
        file1 = os.path.join(temp_dir, "original_dataset.csv")
        file2 = os.path.join(temp_dir, "duplicate_dataset.csv")
        dummy_content = b"ID,Name,Amount\n1,Alpha,100\n2,Beta,200\n3,Gamma,300\n" * 50
        with open(file1, "wb") as f:
            f.write(dummy_content)
        time.sleep(0.05)
        with open(file2, "wb") as f:
            f.write(dummy_content)

        # 2. Obsolete installer
        installer = os.path.join(temp_dir, "old_setup_v1.0.exe")
        with open(installer, "wb") as f:
            f.write(b"MOCK_EXE_HEADER" * 100)
        # Set modified time to 30 days ago
        old_time = time.time() - (30 * 24 * 3600)
        os.utime(installer, (old_time, old_time))

        # 3. Protected sensitive file
        tax_file = os.path.join(temp_dir, "tax_return_2025.pdf")
        with open(tax_file, "wb") as f:
            f.write(b"%PDF-1.4 Mock tax return" * 10)

        # Run Scan
        print(">>> Scanning test sandbox...")
        scan_res = scan_directories([temp_dir])
        print(f"Scanned {scan_res['total_files']} files, {scan_res['total_bytes']} bytes.")

        # Generate recommendations
        recs_count = generate_recommendations()
        print(f">>> Generated {recs_count} recommendations.")

        # Check recommendations in DB
        with get_db() as conn:
            recs = conn.execute("SELECT title, recommendation_type, reason, confidence FROM recommendations").fetchall()
            for r in recs:
                print(f"  * [{r['recommendation_type']}] {r['title']} (Confidence: {r['confidence']*100:.0f}%)")
                print(f"    Reason: {r['reason']}")

            # Verify tax file was NOT recommended for deletion
            tax_rec = conn.execute("""
                SELECT r.* FROM recommendations r
                JOIN files f ON r.file_id = f.id
                WHERE f.filename = 'tax_return_2025.pdf' AND r.recommendation_type = 'DELETE'
            """).fetchone()
            assert tax_rec is None, "Safety failure: Protected tax file was recommended for deletion!"
            print(">>> Verified: Protected files guarded correctly!")

            # Test Quarantine on duplicate from current temp directory
            dup_row = conn.execute(
                "SELECT id FROM files WHERE filename = 'duplicate_dataset.csv' AND path LIKE ?",
                (f"{temp_dir}%",)
            ).fetchone()
            dup_id = dup_row["id"]
            print(f">>> Moving duplicate (file_id={dup_id}) to Quarantine Vault...")
            q_res = quarantine_file(dup_id, retention_days=30)
            print(f"  Quarantined to: {q_res['quarantine_path']}")
            assert not os.path.exists(file2), "Original file should no longer be at original path"
            assert os.path.exists(q_res["quarantine_path"]), "File should exist in quarantine"

            # Test Restore
            print(">>> Testing 1-Click Restore from Quarantine...")
            rest_res = restore_file(q_res["quarantine_id"])
            print(f"  Restored to: {rest_res['restored_path']}")
            assert os.path.exists(file2), "File should be restored to original path"
            print(">>> Verified: Restore mechanism works perfectly!")

        # Test Health Metrics
        metrics = compute_health_metrics()
        print(f">>> Overall Health Score: {metrics['overall_health_score']}/100")

        # Test Natural Language Advisor
        advisor_res = query_advisor("Can I free space?")
        print(">>> Advisor Response:")
        print(advisor_res["response"])

        print("\n>>> ALL TESTS PASSED SUCCESSFULLY! Data Organizer backend is rock-solid.")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    run_test()
