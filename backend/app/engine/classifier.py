import re
import time
from pathlib import Path
from app.config import (
    INSTALLER_EXTENSIONS,
    ARCHIVE_EXTENSIONS,
    CODE_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    IMAGE_EXTENSIONS,
    VIDEO_EXTENSIONS,
    AUDIO_EXTENSIONS,
    PROTECTED_KEYWORDS,
    TEMP_EXPORT_PATTERNS,
    SCREENSHOT_AGE_DAYS_THRESHOLD,
    INSTALLER_AGE_DAYS_THRESHOLD
)

SCREENSHOT_PATTERN = re.compile(r"(screenshot|screen\s*shot|snip|capture|img_\d{4,}|dsc_\d{4,})", re.IGNORECASE)
VERSION_PATTERN = re.compile(r"(\sv?\d+|\(\d+\)|_v\d+|_final|_latest|_copy|\scopy)", re.IGNORECASE)

def classify_file(file_info: dict) -> dict:
    """
    Classifies a file based on path, extension, name semantics, and age.
    Produces: category, subcategory, importance_score (0-100), deletion_risk, confidence, tags, reasons.
    """
    path = Path(file_info["path"])
    filename = file_info["filename"].lower()
    ext = file_info["extension"].lower()
    size = file_info["size"]
    modified_at = file_info["modified_at"]
    
    now = time.time()
    age_days = (now - modified_at) / (24 * 3600)
    
    tags = []
    reasons = []
    category = "general"
    subcategory = "other"
    importance_score = 50
    deletion_risk = "medium"
    confidence = 0.70

    # 1. Check for Protected / Sensitive files FIRST
    is_protected = False
    for kw in PROTECTED_KEYWORDS:
        if kw in filename or kw in str(path).lower():
            is_protected = True
            tags.append("sensitive_keyword")
            reasons.append(f"Filename contains sensitive identifier: '{kw}'")
            break

    if is_protected:
        category = "sensitive_document"
        subcategory = "financial_or_identity"
        importance_score = 95
        deletion_risk = "protected"
        confidence = 0.90
        return {
            "category": category,
            "subcategory": subcategory,
            "importance_score": importance_score,
            "deletion_risk": deletion_risk,
            "confidence": confidence,
            "tags": ",".join(tags),
            "reasons": "; ".join(reasons)
        }

    # 2. Check for Installers
    if ext in INSTALLER_EXTENSIONS:
        category = "installer"
        tags.append("executable_installer")
        if age_days > INSTALLER_AGE_DAYS_THRESHOLD or "download" in str(path).lower():
            subcategory = "obsolete_installer"
            importance_score = 15
            deletion_risk = "low"
            confidence = 0.92
            reasons.append(f"Downloaded installer unused for {int(age_days)} days. Can be re-downloaded if needed.")
        else:
            subcategory = "recent_installer"
            importance_score = 45
            deletion_risk = "medium"
            confidence = 0.80
            reasons.append("Recently downloaded setup/installer.")

    # 3. Check for Screenshots
    elif ext in IMAGE_EXTENSIONS and (SCREENSHOT_PATTERN.search(filename) or "screenshot" in str(path).lower()):
        category = "screenshot"
        tags.append("screenshot")
        if age_days > SCREENSHOT_AGE_DAYS_THRESHOLD:
            subcategory = "aged_screenshot"
            importance_score = 25
            deletion_risk = "low"
            confidence = 0.88
            reasons.append(f"Screenshot taken {int(age_days)} days ago. Often transient reference material.")
        else:
            subcategory = "recent_screenshot"
            importance_score = 60
            deletion_risk = "medium"
            confidence = 0.75
            reasons.append("Recent screenshot.")

    # 4. Check for Temporary / Exported files
    elif any(pat in filename for pat in TEMP_EXPORT_PATTERNS):
        category = "temporary_export"
        subcategory = "draft_or_render"
        tags.append("temporary_export")
        importance_score = 20
        deletion_risk = "low"
        confidence = 0.82
        reasons.append("Filename matches pattern of intermediate export, render, or draft.")

    # 5. Check for Versioned / Cloned files (e.g., 'Document (1).pdf' or 'report_final2.docx')
    elif VERSION_PATTERN.search(filename):
        category = "versioned_duplicate"
        subcategory = "possible_older_version"
        tags.append("versioned_name")
        importance_score = 35
        deletion_risk = "medium"
        confidence = 0.78
        reasons.append("Filename contains duplicate or version suffix (e.g., '(1)', '_v2', 'copy').")

    # 6. Check for Source Code & Active Projects
    elif ext in CODE_EXTENSIONS or any(p in str(path).lower() for p in ["src", "project", "repo"]):
        category = "source_code"
        subcategory = "development"
        tags.append("code")
        importance_score = 85
        deletion_risk = "high"
        confidence = 0.90
        reasons.append("Source code or software project asset. Preserved by default.")

    # 7. Check for Archives
    elif ext in ARCHIVE_EXTENSIONS:
        category = "archive"
        tags.append("compressed_archive")
        if age_days > 90 and "download" in str(path).lower():
            subcategory = "old_downloaded_archive"
            importance_score = 30
            deletion_risk = "medium"
            confidence = 0.75
            reasons.append("Old compressed archive in downloads folder.")
        else:
            subcategory = "project_archive"
            importance_score = 65
            deletion_risk = "medium"
            confidence = 0.70
            reasons.append("Compressed archive.")

    # 8. Media: Images & Videos
    elif ext in IMAGE_EXTENSIONS:
        category = "media"
        subcategory = "photo"
        tags.append("image")
        importance_score = 70
        deletion_risk = "high"
        confidence = 0.80
        reasons.append("Personal or saved image.")

    elif ext in VIDEO_EXTENSIONS:
        category = "media"
        subcategory = "video"
        tags.append("video")
        if size > 500 * 1024 * 1024 and age_days > 90:
            importance_score = 45
            deletion_risk = "medium"
            confidence = 0.75
            reasons.append(f"Large video ({size // (1024*1024)} MB) not modified in {int(age_days)} days.")
        else:
            importance_score = 75
            deletion_risk = "high"
            confidence = 0.80
            reasons.append("Video file.")

    # 9. Documents
    elif ext in DOCUMENT_EXTENSIONS:
        category = "document"
        subcategory = "office_document"
        tags.append("document")
        importance_score = 70
        deletion_risk = "medium"
        confidence = 0.75
        reasons.append("Document file.")

    # Large file tag
    if size >= 100 * 1024 * 1024:
        tags.append("large_file")

    return {
        "category": category,
        "subcategory": subcategory,
        "importance_score": importance_score,
        "deletion_risk": deletion_risk,
        "confidence": confidence,
        "tags": ",".join(tags),
        "reasons": "; ".join(reasons)
    }
