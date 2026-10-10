import hashlib
import os

CHUNK_SIZE = 1024 * 1024  # 1MB chunks
SAMPLE_SIZE = 64 * 1024   # 64KB for partial hash

def is_cloud_placeholder(file_path: str) -> bool:
    """
    Checks if a file is an offline cloud placeholder (e.g. OneDrive, Dropbox, iCloud)
    to avoid triggering unwanted background cloud downloads.
    """
    try:
        stat_res = os.stat(file_path)
        attrs = getattr(stat_res, 'st_file_attributes', 0)
        # FILE_ATTRIBUTE_OFFLINE (0x1000)
        # FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS (0x00400000)
        # FILE_ATTRIBUTE_RECALL_ON_OPEN (0x00040000)
        return bool(attrs & (0x1000 | 0x00400000 | 0x00040000))
    except Exception:
        return False

def compute_partial_hash(file_path: str) -> str | None:
    """
    Computes a fast fingerprint of a file by hashing its head, middle, and tail.
    Safely skips offline cloud files.
    """
    if is_cloud_placeholder(file_path):
        return None

    try:
        size = os.path.getsize(file_path)
        if size == 0:
            return "empty_file"
        
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            if size <= SAMPLE_SIZE * 3:
                hasher.update(f.read())
            else:
                # Read head
                hasher.update(f.read(SAMPLE_SIZE))
                # Read middle
                f.seek(size // 2)
                hasher.update(f.read(SAMPLE_SIZE))
                # Read tail
                f.seek(size - SAMPLE_SIZE)
                hasher.update(f.read(SAMPLE_SIZE))
        return hasher.hexdigest()
    except (PermissionError, FileNotFoundError, OSError):
        return None

def compute_full_hash(file_path: str) -> str | None:
    """
    Computes the full SHA-256 cryptographic hash of a file.
    Safely skips offline cloud files.
    """
    if is_cloud_placeholder(file_path):
        return None

    try:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(CHUNK_SIZE):
                hasher.update(chunk)
        return hasher.hexdigest()
    except (PermissionError, FileNotFoundError, OSError):
        return None
