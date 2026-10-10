import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, HardDrive, Sparkles, FolderSync, 
  ArrowRight, Play, Check, Database 
} from "lucide-react";
import { api } from "../services/api";
import type { HealthStats, ScanTargetsResponse } from "../services/api";
import { formatBytes } from "../utils/formatters";

interface Props {
  stats: HealthStats | null;
  scanTargets: ScanTargetsResponse | null;
  onRefresh: () => void;
  onNavigateToRecs: () => void;
}

export const OverviewView: React.FC<Props> = ({ stats, scanTargets, onRefresh, onNavigateToRecs }) => {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [customPath, setCustomPath] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Initialize with all detected drives and user folders selected by default
  useEffect(() => {
    if (scanTargets && selectedTargets.length === 0) {
      const allDrivesAndFolders = [
        ...(scanTargets.drives || []).map(d => d.path),
        ...(scanTargets.user_folders || []).map(f => f.path)
      ];
      setSelectedTargets(allDrivesAndFolders);
    }
  }, [scanTargets]);

  const toggleTarget = (target: string) => {
    if (selectedTargets.includes(target)) {
      setSelectedTargets(selectedTargets.filter(t => t !== target));
    } else {
      setSelectedTargets([...selectedTargets, target]);
    }
  };

  const selectAllTargets = () => {
    if (!scanTargets) return;
    const all = [
      ...(scanTargets.drives || []).map(d => d.path),
      ...(scanTargets.user_folders || []).map(f => f.path)
    ];
    if (selectedTargets.length === all.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(all);
    }
  };

  const handleStartScan = async () => {
    const targetsToScan = [...selectedTargets];
    if (customPath.trim()) {
      targetsToScan.push(customPath.trim());
    }

    if (targetsToScan.length === 0) {
      alert("Please select at least one drive or folder to scan.");
      return;
    }

    setIsScanning(true);
    setScanMessage(`Scanning ${targetsToScan.length} targets across all selected drives...`);
    try {
      const res = await api.startScan(targetsToScan);
      setScanMessage(`Scan complete! ${res.result?.total_files || 0} files indexed across drives.`);
      onRefresh();
    } catch (err: any) {
      setScanMessage(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const score = stats?.overall_health_score ?? 85;
  const circumference = 282.74;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 80 ? "var(--accent-emerald)" : score >= 60 ? "var(--accent-amber)" : "var(--accent-rose)";

  const potentialSavings = stats?.indexed?.potential_savings_bytes || 0;
  const pendingCount = stats?.indexed?.pending_recommendations_count || 0;
  const totalDiskBytes = stats?.disk?.total_bytes || 0;
  const usedDiskBytes = stats?.disk?.used_bytes || 0;
  const freeDiskBytes = stats?.disk?.free_bytes || 0;
  const overallPercent = stats?.disk?.percent_used ?? 0;
  const drivesList = stats?.disk?.drives || scanTargets?.drives || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Quick Action Hero Banner */}
      {potentialSavings > 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: 16,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 30px rgba(99, 102, 241, 0.12)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--grad-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 4 }}>
                Instant Recovery Candidate: {formatBytes(potentialSavings)}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Found {pendingCount} safe review candidates across your drives (exact duplicates, obsolete installers).
              </p>
            </div>
          </div>
          <button 
            id="hero-review-button"
            className="btn btn-primary" 
            onClick={onNavigateToRecs}
          >
            Review Recommendations <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Main Grid: Health Score & Multi-Drive Storage */}
      <div className="grid-2">
        {/* Health Score Card */}
        <div className="glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
                Storage Health
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                Multi-dimensional digital entropy evaluation
              </p>
            </div>
            <span className="badge badge-cyan">
              <ShieldCheck size={14} /> AI Monitored
            </span>
          </div>

          <div className="health-gauge-container">
            <div className="radial-progress">
              <svg width="110" height="110">
                <circle className="radial-track" cx="55" cy="55" r="45" />
                <circle 
                  className="radial-indicator" 
                  cx="55" 
                  cy="55" 
                  r="45"
                  stroke={scoreColor}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="gauge-center-text">
                <span className="score-value" style={{ color: scoreColor }}>{score}</span>
                <span className="score-label">Health</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Duplicates Cleanliness</span>
                <span style={{ fontWeight: 600 }}>{stats?.sub_scores?.duplicates ?? 100}/100</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Junk / Installers Cleanliness</span>
                <span style={{ fontWeight: 600 }}>{stats?.sub_scores?.junk_cleanliness ?? 100}/100</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Drive Capacity Headroom</span>
                <span style={{ fontWeight: 600 }}>{stats?.sub_scores?.capacity ?? 80}/100</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Safety & Protection Lock</span>
                <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>{stats?.sub_scores?.safety ?? 95}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Drive Storage Card */}
        <div className="glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
                Drive Storage ({drivesList.length} Connected)
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                Total system storage across all drives
              </p>
            </div>
            <span className="badge badge-emerald">
              <HardDrive size={14} /> Multi-Drive
            </span>
          </div>

          {/* Overall System Space Bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.86rem" }}>
              <span style={{ fontWeight: 600 }}>
                Total System: {formatBytes(usedDiskBytes)} used of {formatBytes(totalDiskBytes)} ({formatBytes(freeDiskBytes)} free)
              </span>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {overallPercent.toFixed(1)}%
              </span>
            </div>
            <div style={{
              width: "100%",
              height: 10,
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: 5,
              overflow: "hidden"
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, overallPercent))}%`,
                height: "100%",
                background: "var(--grad-primary)",
                borderRadius: 5
              }} />
            </div>
          </div>

          {/* Individual Drive Bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {drivesList.map((d: any, idx: number) => {
              const driveName = d.drive || d.path || `Drive ${idx+1}`;
              const driveTotal = d.total_bytes || d.total || 0;
              const driveUsed = d.used_bytes || (driveTotal - (d.free_bytes || d.free || 0));
              const driveFree = d.free_bytes || d.free || 0;
              const drivePercent = d.percent_used || (driveTotal > 0 ? (driveUsed / driveTotal) * 100 : 0);

              return (
                <div key={driveName} style={{
                  background: "var(--bg-card-secondary)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-subtle)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <Database size={14} style={{ color: "var(--accent-cyan)" }} />
                      {driveName}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {formatBytes(driveFree)} free of {formatBytes(driveTotal)} ({drivePercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{
                    width: "100%",
                    height: 6,
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: 3,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, drivePercent))}%`,
                      height: "100%",
                      background: drivePercent > 90 ? "var(--grad-danger)" : drivePercent > 75 ? "var(--grad-warm)" : "var(--grad-safe)",
                      borderRadius: 3
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Intelligent Multi-Drive Scanner */}
      <div className="glass-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
              Intelligent Multi-Drive Scanner
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Select all drives or target folders to index. All processing happens 100% locally.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={selectAllTargets}
            >
              {selectedTargets.length > 0 ? "Toggle / Select All" : "Select All Drives"}
            </button>
            <button 
              id="start-scan-btn"
              className="btn btn-primary"
              onClick={handleStartScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <FolderSync size={16} className="status-dot scanning" /> Scanning Drives...
                </>
              ) : (
                <>
                  <Play size={16} /> Scan Selected ({selectedTargets.length})
                </>
              )}
            </button>
          </div>
        </div>

        {scanMessage && (
          <div style={{
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: "0.85rem",
            color: "var(--accent-cyan)",
            marginBottom: 16
          }}>
            {scanMessage}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Section 1: Connected Drives */}
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--accent-cyan)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              💽 System Drives (Full Partitions):
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {(scanTargets?.drives || []).map((drive) => {
                const isChecked = selectedTargets.includes(drive.path);
                return (
                  <div
                    key={drive.path}
                    onClick={() => toggleTarget(drive.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      background: isChecked ? "rgba(99, 102, 241, 0.18)" : "var(--bg-card-secondary)",
                      border: `1px solid ${isChecked ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                      color: isChecked ? "#fff" : "var(--text-muted)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      background: isChecked ? "var(--accent-primary)" : "rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff"
                    }}>
                      {isChecked && <Check size={14} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                        {drive.label || drive.path}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-subtle)" }}>
                        Full Partition Indexing
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: User Home Folders */}
          {(scanTargets?.user_folders || []).length > 0 && (
            <div>
              <span style={{ fontSize: "0.78rem", color: "var(--accent-emerald)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                📁 Specific User Folders:
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(scanTargets?.user_folders || []).map((folder) => {
                  const isChecked = selectedTargets.includes(folder.path);
                  return (
                    <div
                      key={folder.path}
                      onClick={() => toggleTarget(folder.path)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 14px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: isChecked ? "rgba(16, 185, 129, 0.15)" : "var(--bg-card-secondary)",
                        border: `1px solid ${isChecked ? "var(--accent-emerald)" : "var(--border-subtle)"}`,
                        color: isChecked ? "#fff" : "var(--text-muted)",
                        fontSize: "0.86rem",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: isChecked ? "var(--accent-emerald)" : "rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff"
                      }}>
                        {isChecked && <Check size={12} />}
                      </div>
                      <span>{folder.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Folder Path */}
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-subtle)", display: "block", marginBottom: 6 }}>
              Or enter custom folder path:
            </span>
            <input
              type="text"
              id="custom-path-input"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. D:\MyProjects or C:\Users\Downloads"
              style={{
                width: "100%",
                background: "var(--bg-card-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#fff",
                fontSize: "0.88rem",
                outline: "none"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
