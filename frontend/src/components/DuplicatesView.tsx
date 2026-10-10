import React, { useState } from "react";
import { Shield, CheckCircle, FileCheck, Layers } from "lucide-react";
import { api } from "../services/api";
import type { DuplicateGroup } from "../services/api";
import { formatBytes, formatDate } from "../utils/formatters";

interface Props {
  duplicateGroups: DuplicateGroup[];
  onRefresh: () => void;
}

export const DuplicatesView: React.FC<Props> = ({ duplicateGroups = [], onRefresh }) => {
  const [actingFileId, setActingFileId] = useState<number | null>(null);

  const safeGroups = duplicateGroups || [];

  const totalDuplicateBytes = safeGroups.reduce((acc, g) => {
    const dupesSize = (g.duplicates || []).reduce((dAcc, d) => dAcc + (d.size || 0), 0);
    return acc + dupesSize;
  }, 0);

  const totalDuplicatesCount = safeGroups.reduce((acc, g) => acc + (g.duplicates || []).length, 0);

  const handleQuarantine = async (fileId: number) => {
    setActingFileId(fileId);
    try {
      await api.quarantineFile(fileId, 30);
      onRefresh();
    } catch (err: any) {
      alert(`Error quarantining duplicate: ${err.message}`);
    } finally {
      setActingFileId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Stat Banner */}
      <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>
            Exact Cryptographic Duplicates
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>
            Identified via two-tier SHA-256 verification. One primary copy is always preserved.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-amber)" }}>
            {formatBytes(totalDuplicateBytes)}
          </div>
          <span style={{ fontSize: "0.76rem", color: "var(--text-subtle)", textTransform: "uppercase" }}>
            Across {totalDuplicatesCount} redundant files
          </span>
        </div>
      </div>

      {safeGroups.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <CheckCircle size={42} style={{ color: "var(--accent-emerald)", margin: "0 auto 12px" }} />
          <h4 style={{ fontSize: "1.1rem", marginBottom: 6 }}>No duplicate files detected</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Your indexed files are unique and free of duplicate clutter.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {safeGroups.map((group, idx) => (
            <div key={group.hash || idx} className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Layers size={18} style={{ color: "var(--accent-cyan)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-subtle)" }}>
                    SHA-256: {(group.hash || "").substring(0, 16)}...
                  </span>
                </div>
                <span className="badge badge-amber">
                  {formatBytes(group.primary?.size || 0)} per copy
                </span>
              </div>

              {/* Side-by-Side: Primary Keeper vs Duplicates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Primary Keeper */}
                {group.primary && (
                  <div style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: 12,
                    padding: 14
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span className="badge badge-emerald">
                        <FileCheck size={12} /> Primary (Kept)
                      </span>
                      <span style={{ fontSize: "0.76rem", color: "var(--text-subtle)" }}>
                        Created: {formatDate(group.primary.created_at)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 4, wordBreak: "break-all" }}>
                      {group.primary.filename}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                      {group.primary.path}
                    </div>
                  </div>
                )}

                {/* Redundant Copies */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(group.duplicates || []).map((dup) => (
                    <div
                      key={dup.id}
                      style={{
                        background: "rgba(244, 63, 94, 0.06)",
                        border: "1px solid rgba(244, 63, 94, 0.25)",
                        borderRadius: 12,
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="badge badge-rose">
                          Redundant Copy
                        </span>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleQuarantine(dup.id)}
                          disabled={actingFileId === dup.id}
                        >
                          <Shield size={13} /> Quarantine
                        </button>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: "0.92rem", wordBreak: "break-all" }}>
                        {dup.filename}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                        {dup.path}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
