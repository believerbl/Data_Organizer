import hashlib
import os

CHUNK_SIZE = 1024 * 1024  # 1MB chunks
SAMPLE_SIZE = 64 * 1024   # 64KB for partial hash

def compute_partial_hash(file_path: str) -> str | None:
    """
    Computes a fast fingerprint of a file by hashing its head, middle, and tail.
    Extremely efficient for weeding out non-duplicates before full cryptographic hashing.
    """
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
    Only called when two or more files share identical size and partial hash.
    """
    try:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(CHUNK_SIZE):
                hasher.update(chunk)
        return hasher.hexdigest()
    except (PermissionError, FileNotFoundError, OSError):
        return None
