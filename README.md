# Data Organizer

[**Created by Parimarjan Shukla**](https://github.com/believerbl)
*Local-First AI Digital Storage Management & Semantic Janitor*

---

## 🌟 Executive Summary

**Data Organizer** is an intelligent digital-storage agent built to combat **Digital Entropy**: the accumulation of duplicate downloads, obsolete software installers, aged screenshots, forgotten exports, and versioned copies across personal computers and drives.

Unlike traditional cleaners that blindly delete files based on age or size, **Data Organizer** is built on an unbreakable safety principle:

$$\text{UNDERSTAND} \longrightarrow \text{CLASSIFY} \longrightarrow \text{EXPLAIN} \longrightarrow \text{ASK} \longrightarrow \text{ACT}$$

> [!IMPORTANT]
> **Safety Invariant**: Data Organizer **never** performs destructive immediate deletions (`SCAN -> GUESS -> DELETE`). Every action routes through a **30-Day Reversible Quarantine Vault** with instant **1-Click Restore**, backed by transparent confidence scores and explanations.

---

## 🛠️ Architecture & Tech Stack

- **Backend**:
  - Python 3.12 (using dedicated project virtual environment at `D:\believer\codes\projects\projects_py312`)
  - **FastAPI** + **Uvicorn** for REST endpoints and background job processing
  - **SQLite** with Write-Ahead Logging (WAL) and comprehensive metadata schema
  - **Pillow** & **ImageHash** for perceptual image duplicate grouping (`dHash` / `pHash`)
  - **Hashlib** for fast two-tier deduplication (Head/Middle/Tail partial fingerprint + full SHA-256 confirmation)
  - **psutil** for live drive telemetry (NTFS drive statistics, free vs. used capacity)
- **Frontend**:
  - **Vite** + **React** + **TypeScript**
  - High-aesthetic custom Vanilla CSS design system (Tailored dark mode, glassmorphic surfaces, dynamic SVG health gauges, micro-animations)
  - **Lucide Icons** for iconography
- **Data Protection**:
  - Zero cloud uploads (all indexing, hashing, and semantic reasoning execute 100% locally)
  - Built-in guardrails protecting source code repositories, tax records, IDs, financial documents, and active projects

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **Storage Health Score (0-100)** | Multi-dimensional rating reflecting Capacity headroom, Duplicate ratio, Junk cleanliness, and Protection locks. |
| **Two-Tier Deduplication** | Detects exact byte-for-byte twins. Displays clustered side-by-side views where the original primary copy is preserved. |
| **Semantic Classifier** | Identifies obsolete downloaded installers (`.exe`, `.msi`, `.iso` > 14 days), aged screenshots (> 30 days), and draft exports. |
| **Safety Quarantine Vault** | Files are isolated in `.quarantine/` with a 30-day retention countdown and a 1-click **Restore to Original Location** button. |
| **AI Storage Advisor** | Conversational chat interface to ask natural questions like *"Can I free 10 GB?"* or *"What's consuming space in Downloads?"*. |
| **Batch Quick Wins** | 1-click approval to safely quarantine all 90%+ high-confidence redundant files at once. |

---

## 💻 How to Run

### Method 1: Windows Double-Click (Easiest)
Simply double-click:
```bat
start.bat
```

### Method 2: Single Python Command
From the project root:
```powershell
& "D:\believer\codes\projects\projects_py312\Scripts\python.exe" start_app.py
```

### Method 3: Separate Terminals
**Terminal 1 (Backend)**:
```powershell
cd backend
& "D:\believer\codes\projects\projects_py312\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend)**:
```powershell
cd frontend
npm run dev
```

Open your browser to:
- **Application Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Interactive API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

[project link](https://github.com/believerbl/Data_Organizer)
