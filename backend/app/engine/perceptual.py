from pathlib import Path
from PIL import Image
import imagehash
from app.config import IMAGE_EXTENSIONS

def compute_image_meta(file_path: str) -> dict | None:
    """
    Extracts image dimensions and perceptual hash for visual similarity detection.
    Catches screenshots, resized variants, and near-duplicates.
    """
    path = Path(file_path)
    if path.suffix.lower() not in IMAGE_EXTENSIONS:
        return None

    try:
        with Image.open(file_path) as img:
            width, height = img.size
            # Convert to RGB to avoid issues with RGBA/palette modes
            rgb_img = img.convert("RGB")
            # dHash is robust and fast for perceptual duplicate grouping
            dhash_val = str(imagehash.dhash(rgb_img))
            return {
                "is_image": 1,
                "width": width,
                "height": height,
                "visual_hash": dhash_val
            }
    except Exception:
        # Broken image, animated GIF, or unsupported format
        return None

def compute_hamming_distance(hash1: str, hash2: str) -> int:
    """
    Computes difference between two perceptual hashes.
    Distance 0 = identical visual representation.
    Distance <= 5 = very high similarity (crop/re-encode/resize).
    """
    try:
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return h1 - h2
    except Exception:
        return 999
