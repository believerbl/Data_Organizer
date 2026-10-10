import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { OverviewView } from "./components/OverviewView";
import { RecommendationsView } from "./components/RecommendationsView";
import { DuplicatesView } from "./components/DuplicatesView";
import { QuarantineView } from "./components/QuarantineView";
import { AdvisorView } from "./components/AdvisorView";
import { api } from "./services/api";
import type { 
  HealthStats, Recommendation, DuplicateGroup, QuarantineItem, 
  ScanTargetsResponse, ScanStatusResponse 
} from "./services/api";
import { FolderSync } from "lucide-react";

export function App() {
  const [currentTab, setCurrentTab] = useState<string>("overview");
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [quarantineItems, setQuarantineItems] = useState<QuarantineItem[]>([]);
  const [scanTargets, setScanTargets] = useState<ScanTargetsResponse | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatusResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const prevIsScanning = useRef(false);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    setBackendError(null);
    try {
      const [statsData, recsData, dupesData, quarData, targetsData, statusData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getRecommendations().catch(() => []),
        api.getDuplicates().catch(() => []),
        api.getQuarantine().catch(() => []),
        api.getTargets().catch(() => ({ drives: [], user_folders: [], default_targets: [] })),
        api.getScanStatus().catch(() => null),
      ]);

      if (statsData) setStats(statsData);
      setRecommendations(recsData);
      setDuplicateGroups(dupesData);
      setQuarantineItems(quarData);
      if (targetsData) setScanTargets(targetsData);
      if (statusData) setScanStatus(statusData);
    } catch (err: any) {
      setBackendError("Could not reach backend service at http://127.0.0.1:8000. Please start the backend.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Global background scan polling loop (never stops when switching tabs)
  useEffect(() => {
    let intervalId: any = null;

    const pollStatus = async () => {
      try {
        const current = await api.getScanStatus();
        setScanStatus(current);

        // Detect transition from scanning -> finished
        if (prevIsScanning.current && !current.is_scanning) {
          loadAllData();
        }
        prevIsScanning.current = current.is_scanning;
      } catch (e) {
        // Backend temporarily busy
      }
    };

    if (scanStatus?.is_scanning) {
      intervalId = setInterval(pollStatus, 800);
    } else {
      intervalId = setInterval(pollStatus, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scanStatus?.is_scanning, loadAllData]);

  const handleStartScan = async (targets: string[]) => {
    try {
      const res = await api.startScan(targets);
      if (res.status) {
        setScanStatus(res.status);
      }
    } catch (err: any) {
      alert(`Scan failed to start: ${err.message}`);
    }
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case "overview":
        return (
          <OverviewView
            stats={stats}
            scanTargets={scanTargets}
            scanStatus={scanStatus}
            onStartScan={handleStartScan}
            onRefresh={loadAllData}
            onNavigateToRecs={() => setCurrentTab("recommendations")}
          />
        );
      case "recommendations":
        return (
          <RecommendationsView
            recommendations={recommendations}
            onRefresh={loadAllData}
          />
        );
      case "duplicates":
        return (
          <DuplicatesView
            duplicateGroups={duplicateGroups}
            onRefresh={loadAllData}
          />
        );
      case "quarantine":
        return (
          <QuarantineView
            quarantineItems={quarantineItems}
            onRefresh={loadAllData}
          />
        );
      case "advisor":
        return <AdvisorView />;
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case "overview": return { title: "Dashboard & Health", subtitle: "Continuous multi-drive storage evaluation and entropy control" };
      case "recommendations": return { title: "Recommendations Review Hub", subtitle: "Explainable AI recommendations backed by transparent confidence scores" };
      case "duplicates": return { title: "Duplicate Clones Inspector", subtitle: "Byte-for-byte SHA-256 duplicate clusters with guaranteed primary copy preservation" };
      case "quarantine": return { title: "Quarantine Vault", subtitle: "Safety net holding area with 30-day retention countdown and instant 1-click restore" };
      case "advisor": return { title: "Storage Advisor Assistant", subtitle: "Conversational reasoning layer over all your indexed drives" };
      default: return { title: "Data Organizer", subtitle: "" };
    }
  };

  const headerInfo = getTabTitle();

  return (
    <div className="app-container">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingRecsCount={recommendations.length}
        duplicatesCount={duplicateGroups.length}
        quarantineCount={quarantineItems.length}
        isScanning={Boolean(scanStatus?.is_scanning)}
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
      />

      <main className="main-content">
        {/* Global Persistent Scan Progress Bar across ALL tabs */}
        {scanStatus?.is_scanning && (
          <div style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)",
            border: "1px solid rgba(6, 182, 212, 0.4)",
            borderRadius: 14,
            padding: "14px 20px",
            marginBottom: 24,
            boxShadow: "0 6px 20px rgba(6, 182, 212, 0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FolderSync size={18} className="status-dot scanning" style={{ color: "var(--accent-cyan)" }} />
                <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                  Intelligent Drive Scan in Progress ({scanStatus.progress_percent}%)
                </span>
              </div>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {scanStatus.current_index > 0 ? `${scanStatus.current_index} / ${scanStatus.total_files} files` : "Discovering files..."}
              </span>
            </div>

            {/* Smooth animated progress line */}
            <div style={{
              width: "100%",
              height: 6,
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: 3,
              overflow: "hidden"
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(5, scanStatus.progress_percent))}%`,
                height: "100%",
                background: "var(--grad-primary)",
                borderRadius: 3,
                transition: "width 0.4s ease"
              }} />
            </div>

            {scanStatus.current_file && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                color: "var(--text-subtle)",
                marginTop: 6,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                Scanning: {scanStatus.current_file}
              </div>
            )}
          </div>
        )}

        <header className="content-header">
          <div>
            <h2>{headerInfo.title}</h2>
            <p>{headerInfo.subtitle}</p>
          </div>
        </header>

        {backendError && (
          <div style={{
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            borderRadius: 12,
            padding: "16px 20px",
            color: "#ff6b81",
            marginBottom: 24,
            fontSize: "0.9rem"
          }}>
            <strong>Connection Warning:</strong> {backendError}
          </div>
        )}

        {renderActiveView()}
      </main>
    </div>
  );
}

export default App;
