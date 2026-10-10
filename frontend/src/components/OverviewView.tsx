import React, { useState } from "react";
import { 
  ShieldCheck, HardDrive, Sparkles, FolderSync, 
  ArrowRight, Play, Check 
} from "lucide-react";
import { api } from "../services/api";
import type { HealthStats } from "../services/api";
import { formatBytes } from "../utils/formatters";

interface Props {
  stats: HealthStats | null;
  onRefresh: () => void;
  onNavigateToRecs: () => void;
  availableTargets: string[];
}

export const OverviewView: React.FC<Props> = ({ stats, onRefresh, onNavigateToRecs, availableTargets }) => {
  const [selectedTargets, setSelectedTargets] = useState<string[]>(availableTargets.slice(0, 3));
  const [customPath, setCustomPath] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const toggleTarget = (target: string) => {
    if (selectedTargets.includes(target)) {
      setSelectedTargets(selectedTargets.filter(t => t !== target));
    } else {
      setSelectedTargets([...selectedTargets, target]);
    }
  };

  const handleStartScan = async () => {
    const targetsToScan = [...selectedTargets];
    if (customPath.trim()) {
      targetsToScan.push(customPath.trim());
    }

    if (targetsToScan.length === 0) {
      alert("Please select at least one folder to scan.");
      return;
    }

    setIsScanning(true);
    setScanMessage("Scanning filesystem & computing hashes...");
    try {
      const res = await api.startScan(targetsToScan);
      setScanMessage(`Scan complete! ${res.result?.total_files || 0} files indexed.`);
      onRefresh();
    } catch (err: any) {
      setScanMessage(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const score = stats?.overall_health_score ?? 85;
  // Circumference for 45 radius circle = 2 * PI * 45 ≈ 282.74
  const circumference = 282.74;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const scoreColor = score >= 80 ? "var(--accent-emerald)" : score >= 60 ? "var(--accent-amber)" : "var(--accent-rose)";

  const potentialSavings = stats?.indexed?.potential_savings_bytes || 0;
  const pendingCount = stats?.indexed?.pending_recommendations_count || 0;
  const percentUsed = stats?.disk?.percent_used ?? 0;

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
                Found {pendingCount} safe review candidates (including exact duplicates and obsolete installers).
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

      {/* Main Grid: Health Score & Drive Usage */}
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
                <defs>
                  <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
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

        {/* Disk Capacity Card */}
        <div className="glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
                Drive Storage
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                Live primary drive usage & allocation
              </p>
            </div>
            <span className="badge badge-emerald">
              <HardDrive size={14} /> NTFS Mounted
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.9rem" }}>
              <span style={{ fontWeight: 600 }}>
                {formatBytes(stats?.disk?.used_bytes || 0)} used of {formatBytes(stats?.disk?.total_bytes || 0)}
              </span>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {percentUsed.toFixed(1)}%
              </span>
            </div>
            {/* Multi-segment capacity bar */}
            <div style={{
              width: "100%",
              height: 12,
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: 6,
              overflow: "hidden",
              display: "flex"
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, percentUsed))}%`,
                background: "var(--grad-primary)",
                borderRadius: "6px 0 0 6px"
              }} />
            </div>
          </div>

          <div className="grid-3" style={{ marginTop: 20 }}>
            <div style={{ background: "var(--bg-card-secondary)", padding: 12, borderRadius: 10 }}>
              <div style={{ fontSize: "0.74rem", color: "var(--text-subtle)", textTransform: "uppercase" }}>Free Space</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: 2 }}>
                {formatBytes(stats?.disk?.free_bytes || 0)}
              </div>
            </div>
            <div style={{ background: "var(--bg-card-secondary)", padding: 12, borderRadius: 10 }}>
              <div style={{ fontSize: "0.74rem", color: "var(--text-subtle)", textTransform: "uppercase" }}>Duplicates</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: 2 }}>
                {formatBytes(stats?.indexed?.duplicate_bytes || 0)}
              </div>
            </div>
            <div style={{ background: "var(--bg-card-secondary)", padding: 12, borderRadius: 10 }}>
              <div style={{ fontSize: "0.74rem", color: "var(--text-subtle)", textTransform: "uppercase" }}>Quarantined</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-rose)", marginTop: 2 }}>
                {formatBytes(stats?.indexed?.quarantined_bytes || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligent Scan Launcher */}
      <div className="glass-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
              Intelligent Filesystem Scanner
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Select folders to index and inspect. Operates locally with zero cloud upload.
            </p>
          </div>
          <button 
            id="start-scan-btn"
            className="btn btn-primary"
            onClick={handleStartScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <FolderSync size={16} className="status-dot scanning" /> Scanning...
              </>
            ) : (
              <>
                <Play size={16} /> Start Scan
              </>
            )}
          </button>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 600 }}>
            Target Folders:
          </span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(availableTargets || []).map((target) => {
              const isChecked = selectedTargets.includes(target);
              const folderName = target.split(/[\\/]/).pop() || target;
              return (
                <div
                  key={target}
                  onClick={() => toggleTarget(target)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: isChecked ? "rgba(99, 102, 241, 0.15)" : "var(--bg-card-secondary)",
                    border: `1px solid ${isChecked ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    color: isChecked ? "#fff" : "var(--text-muted)",
                    fontSize: "0.86rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: isChecked ? "var(--accent-primary)" : "rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff"
                  }}>
                    {isChecked && <Check size={12} />}
                  </div>
                  <span>{folderName}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 8 }}>
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
