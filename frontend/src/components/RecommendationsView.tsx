import React, { useState } from "react";
import { 
  Sparkles, Shield, Trash2, CheckCircle2, 
  FileText, Image as ImageIcon, Box, HelpCircle, Archive, AlertCircle 
} from "lucide-react";
import { Recommendation, api } from "../services/api";
import { formatBytes, formatDate } from "../utils/formatters";

interface Props {
  recommendations: Recommendation[];
  onRefresh: () => void;
}

export const RecommendationsView: React.FC<Props> = ({ recommendations, onRefresh }) => {
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [actingFileId, setActingFileId] = useState<number | null>(null);

  const filteredRecs = recommendations.filter((r) => {
    if (filterGroup === "all") return true;
    return r.group_key === filterGroup;
  });

  const highConfidenceRecs = recommendations.filter(
    (r) => r.confidence >= 0.90 && r.recommendation_type === "DELETE"
  );

  const totalFilteredSavings = filteredRecs.reduce((acc, r) => acc + r.potential_saving_bytes, 0);

  const handleQuarantine = async (fileId: number) => {
    setActingFileId(fileId);
    try {
      await api.quarantineFile(fileId, 30);
      onRefresh();
    } catch (err: any) {
      alert(`Error quarantining file: ${err.message}`);
    } finally {
      setActingFileId(null);
    }
  };

  const handleQuarantineBatch = async () => {
    if (highConfidenceRecs.length === 0) return;
    const fileIds = highConfidenceRecs.map((r) => r.file_id);
    if (!window.confirm(`Move ${fileIds.length} high-confidence items to safe 30-day Quarantine?`)) {
      return;
    }
    try {
      await api.quarantineBatch(fileIds, 30);
      onRefresh();
    } catch (err: any) {
      alert(`Batch quarantine error: ${err.message}`);
    }
  };

  const handleDismiss = async (recId: number) => {
    try {
      await api.dismissRecommendation(recId);
      onRefresh();
    } catch (err: any) {
      alert(`Error dismissing recommendation: ${err.message}`);
    }
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case "installer": return <Box size={20} />;
      case "screenshot": return <ImageIcon size={20} />;
      case "temporary_export": return <FileText size={20} />;
      case "archive": return <Archive size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 90) {
      return <span className="badge badge-emerald">{percent}% Confident</span>;
    } else if (percent >= 75) {
      return <span className="badge badge-cyan">{percent}% Match</span>;
    } else {
      return <span className="badge badge-amber">{percent}% Probable</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Items" },
            { id: "exact_duplicates", label: "Exact Duplicates" },
            { id: "obsolete_installers", label: "Obsolete Installers" },
            { id: "aged_screenshots", label: "Aged Screenshots" },
            { id: "temporary_exports", label: "Temporary Exports" },
            { id: "large_inactive", label: "Large Inactive" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterGroup(pill.id)}
              style={{
                background: filterGroup === pill.id ? "rgba(99, 102, 241, 0.2)" : "var(--bg-card)",
                border: `1px solid ${filterGroup === pill.id ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                color: filterGroup === pill.id ? "#fff" : "var(--text-muted)",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: "0.82rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Batch Quarantine for High-Confidence */}
        {highConfidenceRecs.length > 0 && (
          <button 
            id="batch-quarantine-btn"
            className="btn btn-primary btn-sm"
            onClick={handleQuarantineBatch}
          >
            <Shield size={14} /> Quarantine High Confidence ({highConfidenceRecs.length} items)
          </button>
        )}
      </div>

      {/* Summary Line */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
        <span>Showing {filteredRecs.length} recommendations</span>
        <span>Potential recoverable space: <strong style={{ color: "var(--accent-cyan)" }}>{formatBytes(totalFilteredSavings)}</strong></span>
      </div>

      {/* Recommendation Cards List */}
      {filteredRecs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <CheckCircle2 size={42} style={{ color: "var(--accent-emerald)", margin: "0 auto 12px" }} />
          <h4 style={{ fontSize: "1.1rem", marginBottom: 6 }}>All clear! No recommendations found.</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Either your selected folders are clean, or run another scan to index new files.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredRecs.map((rec) => (
            <div key={rec.id} className="rec-card">
              <div className="rec-card-header">
                <div className="rec-file-info">
                  <div className="rec-file-icon">
                    {getFileIcon(rec.category)}
                  </div>
                  <div className="rec-file-details">
                    <h4>{rec.filename}</h4>
                    <div className="rec-file-path" title={rec.path}>
                      {rec.path}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {getConfidenceBadge(rec.confidence)}
                  <span className="badge badge-purple" style={{ fontFamily: "var(--font-mono)" }}>
                    {formatBytes(rec.size)}
                  </span>
                </div>
              </div>

              {/* Transparent Explanation Box */}
              <div className="rec-explanation-box">
                <Sparkles size={16} />
                <span>{rec.reason}</span>
              </div>

              {/* Actions Footer */}
              <div className="rec-actions">
                <span style={{ fontSize: "0.76rem", color: "var(--text-subtle)" }}>
                  Modified: {formatDate(rec.modified_at)}
                </span>

                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDismiss(rec.id)}
                  >
                    Keep File
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleQuarantine(rec.file_id)}
                    disabled={actingFileId === rec.file_id}
                  >
                    <Shield size={14} /> Move to Quarantine (30d)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
