import { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { OverviewView } from "./components/OverviewView";
import { RecommendationsView } from "./components/RecommendationsView";
import { DuplicatesView } from "./components/DuplicatesView";
import { QuarantineView } from "./components/QuarantineView";
import { AdvisorView } from "./components/AdvisorView";
import { api } from "./services/api";
import type { HealthStats, Recommendation, DuplicateGroup, QuarantineItem } from "./services/api";

export function App() {
  const [currentTab, setCurrentTab] = useState<string>("overview");
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [quarantineItems, setQuarantineItems] = useState<QuarantineItem[]>([]);
  const [availableTargets, setAvailableTargets] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    setBackendError(null);
    try {
      const [statsData, recsData, dupesData, quarData, targetsData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getRecommendations().catch(() => []),
        api.getDuplicates().catch(() => []),
        api.getQuarantine().catch(() => []),
        api.getTargets().catch(() => ({ default_targets: [], drives: [] })),
      ]);

      if (statsData) setStats(statsData);
      setRecommendations(recsData);
      setDuplicateGroups(dupesData);
      setQuarantineItems(quarData);
      if (targetsData.default_targets) {
        setAvailableTargets(targetsData.default_targets);
      }
    } catch (err: any) {
      setBackendError("Could not reach backend service at http://127.0.0.1:8000. Please start the backend.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const renderActiveView = () => {
    switch (currentTab) {
      case "overview":
        return (
          <OverviewView
            stats={stats}
            onRefresh={loadAllData}
            onNavigateToRecs={() => setCurrentTab("recommendations")}
            availableTargets={availableTargets}
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
      case "overview": return { title: "Dashboard & Health", subtitle: "Continuous local storage evaluation and entropy control" };
      case "recommendations": return { title: "Recommendations Review Hub", subtitle: "Explainable AI recommendations backed by transparent confidence scores" };
      case "duplicates": return { title: "Duplicate Clones Inspector", subtitle: "Byte-for-byte SHA-256 duplicate clusters with guaranteed primary copy preservation" };
      case "quarantine": return { title: "Quarantine Vault", subtitle: "Safety net holding area with 30-day retention countdown and instant 1-click restore" };
      case "advisor": return { title: "Storage Advisor Assistant", subtitle: "Conversational reasoning layer over your indexed filesystem" };
      default: return { title: "Storage Agent", subtitle: "" };
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
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
      />

      <main className="main-content">
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
