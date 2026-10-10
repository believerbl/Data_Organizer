import React, { useState, useEffect } from "react";
import { 
  Sparkles, Shield, CheckCircle2, 
  FileText, Image as ImageIcon, Box, Archive, RefreshCw, ChevronDown 
} from "lucide-react";
import { api } from "../services/api";
import type { Recommendation, RecommendationsResponse } from "../services/api";
import { formatBytes, formatDate } from "../utils/formatters";

interface Props {
  onRefresh: () => void;
}

export const RecommendationsView: React.FC<Props> = ({ onRefresh }) => {
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [items, setItems] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actingFileId, setActingFileId] = useState<number | null>(null);
  const [limit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  const fetchRecs = async (group: string, currentOffset: number, append = false) => {
    setIsLoading(true);
    try {
      const res = await api.getRecommendations(group, limit, currentOffset);
      setData(res);
      if (append) {
        setItems(prev => [...prev, ...(res.items || [])]);
      } else {
        setItems(res.items || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    fetchRecs(filterGroup, 0, false);
  }, [filterGroup]);

  const handleLoadMore = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    fetchRecs(filterGroup, nextOffset, true);
  };

  const handleQuarantine = async (fileId: number) => {
    setActingFileId(fileId);
    try {
      await api.quarantineFile(fileId, 30);
      setItems(prev => prev.filter(r => r.file_id !== fileId));
      onRefresh();
    } catch (err: any) {
      alert(`Error quarantining file: ${err.message}`);
    } finally {
      setActingFileId(null);
    }
  };

  const handleQuarantineBatch = async () => {
    const highConf = items.filter(r => (r.confidence || 0) >= 0.90 && r.recommendation_type === "DELETE");
    if (highConf.length === 0) return;
    const fileIds = highConf.map(r => r.file_id);
    if (!window.confirm(`Move ${fileIds.length} high-confidence items to safe 30-day Quarantine?`)) {
      return;
    }
    try {
      await api.quarantineBatch(fileIds, 30);
      setItems(prev => prev.filter(r => !fileIds.includes(r.file_id)));
      onRefresh();
      fetchRecs(filterGroup, 0, false);
    } catch (err: any) {
      alert(`Batch quarantine error: ${err.message}`);
    }
  };

  const handleDismiss = async (recId: number, fileId: number) => {
    try {
      await api.dismissRecommendation(recId);
      setItems(prev => prev.filter(r => r.file_id !== fileId));
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
    const percent = Math.round((confidence || 0) * 100);
    if (percent >= 90) {
      return <span className="badge badge-emerald">{percent}% Confident</span>;
    } else if (percent >= 75) {
      return <span className="badge badge-cyan">{percent}% Match</span>;
    } else {
      return <span className="badge badge-amber">{percent}% Probable</span>;
    }
  };

  const totalCount = data?.total_count || 0;
  const totalSavings = data?.total_savings_bytes || 0;
  const highConfidenceCount = items.filter(r => (r.confidence || 0) >= 0.90 && r.recommendation_type === "DELETE").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        {/* Filter Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Categories" },
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
        {highConfidenceCount > 0 && (
          <button 
            id="batch-quarantine-btn"
            className="btn btn-primary btn-sm"
            onClick={handleQuarantineBatch}
          >
            <Shield size={14} /> Quarantine High Confidence ({highConfidenceCount} in view)
          </button>
        )}
      </div>

      {/* Summary Line */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.86rem", color: "var(--text-muted)" }}>
        <span>
          Showing top {items.length} of <strong style={{ color: "#fff" }}>{totalCount.toLocaleString()}</strong> recommendations
        </span>
        <span>
          Potential recoverable space: <strong style={{ color: "var(--accent-cyan)", fontSize: "0.95rem" }}>{formatBytes(totalSavings)}</strong>
        </span>
      </div>

      {/* Recommendation Cards List */}
      {items.length === 0 && !isLoading ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <CheckCircle2 size={42} style={{ color: "var(--accent-emerald)", margin: "0 auto 12px" }} />
          <h4 style={{ fontSize: "1.1rem", marginBottom: 6 }}>No recommendations in this category</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Either your files in this category are clean, or select another filter.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((rec) => (
            <div key={`${rec.id}_${rec.file_id}`} className="rec-card">
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
                    {formatBytes(rec.size || 0)}
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
                    onClick={() => handleDismiss(rec.id, rec.file_id)}
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

          {/* Load More Button if more recommendations exist */}
          {items.length < totalCount && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={handleLoadMore}
                disabled={isLoading}
                style={{ padding: "10px 24px" }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="status-dot scanning" /> Loading more...
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> Load Next 50 Recommendations ({totalCount - items.length} remaining)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
