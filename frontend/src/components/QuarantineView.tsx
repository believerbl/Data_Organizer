import React, { useState } from "react";
import { Shield, RotateCcw, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import type { QuarantineItem } from "../services/api";
import { formatBytes, daysRemaining } from "../utils/formatters";

interface Props {
  quarantineItems: QuarantineItem[];
  onRefresh: () => void;
}

export const QuarantineView: React.FC<Props> = ({ quarantineItems = [], onRefresh }) => {
  const [actingId, setActingId] = useState<number | null>(null);

  const safeItems = quarantineItems || [];
  const totalQuarantineBytes = safeItems.reduce((acc, item) => acc + (item.file_size || 0), 0);

  const handleRestore = async (quarantineId: number) => {
    setActingId(quarantineId);
    try {
      await api.restoreQuarantine(quarantineId);
      alert("File successfully restored to original directory!");
      onRefresh();
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const handlePurge = async (quarantineId: number) => {
    if (!window.confirm("Permanently purge this file? This action cannot be undone.")) {
      return;
    }
    setActingId(quarantineId);
    try {
      await api.purgeQuarantine(quarantineId);
      onRefresh();
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Banner */}
      <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-emerald)"
          }}>
            <Shield size={24} />
          </div>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, marginBottom: 2 }}>
              Safety Quarantine Vault
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Files here are isolated, never instantly deleted. You have 30 days to reverse any decision.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
            {formatBytes(totalQuarantineBytes)}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase" }}>
            {safeItems.length} quarantined items
          </span>
        </div>
      </div>

      {safeItems.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <CheckCircle2 size={42} style={{ color: "var(--accent-emerald)", margin: "0 auto 12px" }} />
          <h4 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Quarantine Vault is empty</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            When you approve recommendations, files will safely reside here for 30 days before permanent deletion.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {safeItems.map((item) => {
            const daysLeft = daysRemaining(item.purge_at);
            const filename = (item.original_path || "").split(/[\\/]/).pop() || item.original_path;

            return (
              <div key={item.id} className="rec-card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{filename}</span>
                      <span className="badge badge-purple" style={{ fontFamily: "var(--font-mono)" }}>
                        {formatBytes(item.file_size || 0)}
                      </span>
                      <span className="badge badge-amber">
                        <Clock size={12} /> {daysLeft} days remaining
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--text-subtle)", wordBreak: "break-all" }}>
                      Original: {item.original_path}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleRestore(item.id)}
                      disabled={actingId === item.id}
                      title="Restore file to exact original location"
                    >
                      <RotateCcw size={14} /> Restore to Original
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handlePurge(item.id)}
                      disabled={actingId === item.id}
                      title="Permanently remove file now"
                      style={{ color: "var(--accent-rose)" }}
                    >
                      <Trash2 size={14} /> Purge Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
