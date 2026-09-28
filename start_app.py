import subprocess
import sys
import os
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
PYTHON_EXE = r"D:\believer\codes\projects\projects_py312\Scripts\python.exe"
FRONTEND_DIR = ROOT_DIR / "frontend"
BACKEND_DIR = ROOT_DIR / "backend"

def main():
    print("=" * 60)
    print("  DATA ORGANIZER — By Parimarjan Shukla")
    print("  Local-first AI Storage Intelligence Agent")
    print("=" * 60)
    print("\n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...")

    # Start FastAPI backend
    backend_proc = subprocess.Popen(
        [
            PYTHON_EXE,
            "-m", "uvicorn",
            "app.main:app",
            "--host", "127.0.0.1",
            "--port", "8000",
            "--reload"
        ],
        cwd=str(BACKEND_DIR)
    )

    time.sleep(1.5)

    print("[2/2] Starting Vite Frontend on http://localhost:5173 ...")
    # Start Vite frontend
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=True
    )

    print("\n>>> Data Organizer is running!")
    print(">>> Open frontend in browser: http://localhost:5173")
    print(">>> API Swagger Docs:        http://127.0.0.1:8000/docs")
    print("\nPress Ctrl+C to terminate both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
