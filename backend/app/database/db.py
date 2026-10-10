import sqlite3
import os
from contextlib import contextmanager
from app.config import DB_PATH

def init_db():
    os.makedirs(DB_PATH.parent, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    
    with conn:
        # Files metadata table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            extension TEXT NOT NULL,
            size INTEGER NOT NULL,
            created_at REAL NOT NULL,
            modified_at REAL NOT NULL,
            accessed_at REAL,
            hash TEXT,
            partial_hash TEXT,
            mime_type TEXT,
            scanned_at REAL NOT NULL,
            is_quarantined INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0
        );
        """)

        # Fast lookup indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_partial_hash ON files(partial_hash);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_modified ON files(modified_at);")

        # Content metadata (visual hashes, dimensions)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS content_meta (
            file_id INTEGER PRIMARY KEY,
            visual_hash TEXT,
            is_image INTEGER DEFAULT 0,
            width INTEGER,
            height INTEGER,
            is_archive INTEGER DEFAULT 0,
            archive_file_count INTEGER,
            FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
        );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_content_visual_hash ON content_meta(visual_hash);")

        # Classification & Importance
        conn.execute("""
        CREATE TABLE IF NOT EXISTS classifications (
            file_id INTEGER PRIMARY KEY,
            category TEXT NOT NULL,
            subcategory TEXT,
            importance_score INTEGER NOT NULL,
            deletion_risk TEXT NOT NULL,
            confidence REAL NOT NULL,
            tags TEXT,
            reasons TEXT,
            FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
        );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_class_category ON classifications(category);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_class_risk ON classifications(deletion_risk);")

        # Recommendations
        conn.execute("""
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            recommendation_type TEXT NOT NULL,
            group_key TEXT NOT NULL,
            title TEXT NOT NULL,
            reason TEXT NOT NULL,
            confidence REAL NOT NULL,
            potential_saving_bytes INTEGER NOT NULL,
            status TEXT DEFAULT 'PENDING',
            created_at REAL NOT NULL,
            FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
        );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rec_status ON recommendations(status);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rec_type ON recommendations(recommendation_type);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rec_status_savings ON recommendations(status, potential_saving_bytes DESC, file_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rec_group_status ON recommendations(group_key, status, potential_saving_bytes DESC);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rec_file_id ON recommendations(file_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_hash_quar_del ON files(hash, is_quarantined, is_deleted, size);")

        # Quarantine Vault (with restore ability)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS quarantine (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER,
            original_path TEXT NOT NULL,
            quarantine_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            quarantined_at REAL NOT NULL,
            retention_days INTEGER DEFAULT 30,
            purge_at REAL NOT NULL,
            file_hash TEXT,
            status TEXT DEFAULT 'QUARANTINED',
            restored_at REAL,
            FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE SET NULL
        );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_quarantine_status ON quarantine(status);")

        # User Decisions log
        conn.execute("""
        CREATE TABLE IF NOT EXISTS user_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recommendation_id INTEGER,
            file_path TEXT NOT NULL,
            decision TEXT NOT NULL,
            timestamp REAL NOT NULL,
            notes TEXT
        );
        """)

        # Scan History
        conn.execute("""
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scanned_paths TEXT NOT NULL,
            total_files INTEGER NOT NULL,
            total_bytes INTEGER NOT NULL,
            potential_savings_bytes INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            created_at REAL NOT NULL
        );
        """)

    conn.close()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
    finally:
        conn.close()
