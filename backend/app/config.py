from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent
DB_PATH = BASE_DIR / "storage_agent.db"
QUARANTINE_DIR = WORKSPACE_DIR / ".quarantine"

# Default system folders to scan (Windows-friendly)
USER_HOME = Path.home()
DEFAULT_SCAN_TARGETS = [
    str(USER_HOME / "Downloads"),
    str(USER_HOME / "Desktop"),
    str(USER_HOME / "Documents"),
    str(USER_HOME / "Pictures"),
    str(USER_HOME / "Videos"),
]

IGNORE_DIR_NAMES = {
    "$recycle.bin",
    "system volume information",
    "appdata",
    ".git",
    "node_modules",
    ".vscode",
    ".idea",
    "__pycache__",
    ".quarantine",
    "windows",
    "program files",
    "program files (x86)",
    "programdata",
    ".venv",
    "venv",
    "site-packages",
    "dist-packages",
    "myenv",
    "env",
    ".envs",
    ".cache",
    "temp",
    "tmp",
}

# Size definitions
LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024       # 100 MB
HUGE_FILE_THRESHOLD_BYTES = 1 * 1024 * 1024 * 1024    # 1 GB
SCREENSHOT_AGE_DAYS_THRESHOLD = 30                    # 30 days
INSTALLER_AGE_DAYS_THRESHOLD = 14                     # 14 days
OLD_FILE_DAYS_THRESHOLD = 180                         # 6 months

# Known file classifications
INSTALLER_EXTENSIONS = {".exe", ".msi", ".iso", ".dmg", ".pkg", ".deb", ".rpm", ".apk"}
ARCHIVE_EXTENSIONS = {".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz"}
CODE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".java", ".c", ".cpp",
    ".rs", ".go", ".php", ".rb", ".swift", ".kt", ".json", ".yaml", ".yml", ".sql"
}
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt", ".md", ".csv"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff", ".svg", ".heic"}
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"}

# Sensitive indicators (never aggressively recommend deletion)
PROTECTED_KEYWORDS = [
    "tax", "invoice", "receipt", "passport", "visa", "resume", "contract",
    "statement", "medical", "certificate", "id_card", "license", "salary",
    "w2", "1099", "confidential", "legal", "bank"
]

TEMP_EXPORT_PATTERNS = [
    "render", "export", "untitled", "draft", "temp", "copy",
    "final_final", "test_", "sample", "output_", "intermediate"
]
