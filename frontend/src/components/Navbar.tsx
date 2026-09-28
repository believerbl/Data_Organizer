import React from "react";
import { 
  LayoutDashboard, Sparkles, Copy, Shield, Bot, HardDrive, 
  Lock, RefreshCw 
} from "lucide-react";

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingRecsCount: number;
  duplicatesCount: number;
  quarantineCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  pendingRecsCount,
  duplicatesCount,
  quarantineCount,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <aside className="sidebar">
      {/* Brand Identity */}
      <div className="brand">
        <div className="brand-icon">
          <HardDrive size={22} color="#fff" />
        </div>
        <div className="brand-text">
          <h1>Data Organizer</h1>
          <span>By Parimarjan Shukla</span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="nav-menu">
        <button
          id="nav-overview"
          className={`nav-item ${currentTab === "overview" ? "active" : ""}`}
          onClick={() => onSelectTab("overview")}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>

        <button
          id="nav-recommendations"
          className={`nav-item ${currentTab === "recommendations" ? "active" : ""}`}
          onClick={() => onSelectTab("recommendations")}
        >
          <Sparkles size={18} />
          <span>Review Hub</span>
          {pendingRecsCount > 0 && (
            <span className="nav-badge">{pendingRecsCount}</span>
          )}
        </button>

        <button
          id="nav-duplicates"
          className={`nav-item ${currentTab === "duplicates" ? "active" : ""}`}
          onClick={() => onSelectTab("duplicates")}
        >
          <Copy size={18} />
          <span>Duplicates</span>
          {duplicatesCount > 0 && (
            <span className="nav-badge amber">{duplicatesCount}</span>
          )}
        </button>

        <button
          id="nav-quarantine"
          className={`nav-item ${currentTab === "quarantine" ? "active" : ""}`}
          onClick={() => onSelectTab("quarantine")}
        >
          <Shield size={18} />
          <span>Quarantine</span>
          {quarantineCount > 0 && (
            <span className="nav-badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "var(--accent-emerald)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
              {quarantineCount}
            </span>
          )}
        </button>

        <button
          id="nav-advisor"
          className={`nav-item ${currentTab === "advisor" ? "active" : ""}`}
          onClick={() => onSelectTab("advisor")}
        >
          <Bot size={18} />
          <span>AI Advisor</span>
        </button>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <RefreshCw size={13} className={isRefreshing ? "status-dot scanning" : ""} />
          <span>Refresh Data</span>
        </button>

        <div className="system-status-indicator">
          <div className="status-dot" />
          <span>Local Index Engine</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text-subtle)" }}>
          <Lock size={12} />
          <span>Zero Cloud Uploads • Private</span>
        </div>
      </div>
    </aside>
  );
};
