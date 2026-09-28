const API_BASE = "http://127.0.0.1:8000/api";

export interface HealthStats {
  overall_health_score: number;
  sub_scores: {
    capacity: number;
    duplicates: number;
    junk_cleanliness: number;
    organization: number;
    safety: number;
  };
  disk: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    percent_used: number;
  };
  indexed: {
    total_files: number;
    total_bytes: number;
    duplicate_bytes: number;
    junk_bytes: number;
    protected_files_count: number;
    quarantined_count: number;
    quarantined_bytes: number;
    pending_recommendations_count: number;
    potential_savings_bytes: number;
  };
}

export interface Recommendation {
  id: number;
  file_id: number;
  recommendation_type: string;
  group_key: string;
  title: string;
  reason: string;
  confidence: number;
  potential_saving_bytes: number;
  status: string;
  created_at: number;
  path: string;
  filename: string;
  size: number;
  modified_at: number;
  category: string;
  deletion_risk: string;
  importance_score: number;
}

export interface DuplicateGroup {
  hash: string;
  total_size: number;
  primary: {
    id: number;
    path: string;
    filename: string;
    size: number;
    created_at: number;
    modified_at: number;
    category: string;
    deletion_risk: string;
  };
  duplicates: Array<{
    id: number;
    path: string;
    filename: string;
    size: number;
    created_at: number;
    modified_at: number;
    category: string;
    deletion_risk: string;
  }>;
}

export interface QuarantineItem {
  id: number;
  file_id: number;
  original_path: string;
  quarantine_path: string;
  file_size: number;
  quarantined_at: number;
  retention_days: number;
  purge_at: number;
  file_hash: string;
  status: string;
}

export const api = {
  async getStats(): Promise<HealthStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  async getTargets(): Promise<{ default_targets: string[]; drives: any[] }> {
    const res = await fetch(`${API_BASE}/scan/targets`);
    if (!res.ok) throw new Error("Failed to fetch scan targets");
    return res.json();
  },

  async startScan(targets: string[], max_files?: number): Promise<any> {
    const res = await fetch(`${API_BASE}/scan/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets, max_files }),
    });
    if (!res.ok) throw new Error("Scan request failed");
    return res.json();
  },

  async getScanStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/scan/status`);
    return res.json();
  },

  async getRecommendations(): Promise<Recommendation[]> {
    const res = await fetch(`${API_BASE}/recommendations`);
    if (!res.ok) throw new Error("Failed to fetch recommendations");
    return res.json();
  },

  async quarantineFile(fileId: number, retentionDays = 30): Promise<any> {
    const res = await fetch(`${API_BASE}/recommendations/quarantine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId, retention_days: retentionDays }),
    });
    if (!res.ok) throw new Error("Failed to quarantine file");
    return res.json();
  },

  async quarantineBatch(fileIds: number[], retentionDays = 30): Promise<any> {
    const res = await fetch(`${API_BASE}/recommendations/quarantine-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_ids: fileIds, retention_days: retentionDays }),
    });
    if (!res.ok) throw new Error("Batch quarantine failed");
    return res.json();
  },

  async dismissRecommendation(recId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/recommendations/dismiss/${recId}`, {
      method: "POST",
    });
    return res.json();
  },

  async getDuplicates(): Promise<DuplicateGroup[]> {
    const res = await fetch(`${API_BASE}/duplicates`);
    if (!res.ok) throw new Error("Failed to fetch duplicates");
    return res.json();
  },

  async getQuarantine(): Promise<QuarantineItem[]> {
    const res = await fetch(`${API_BASE}/quarantine`);
    if (!res.ok) throw new Error("Failed to fetch quarantine list");
    return res.json();
  },

  async restoreQuarantine(quarantineId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/quarantine/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quarantine_id: quarantineId }),
    });
    if (!res.ok) throw new Error("Failed to restore file");
    return res.json();
  },

  async purgeQuarantine(quarantineId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/quarantine/purge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quarantine_id: quarantineId }),
    });
    if (!res.ok) throw new Error("Failed to purge file");
    return res.json();
  },

  async sendChatMessage(message: string): Promise<{ response: string; type: string; potential_savings?: number }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("Chat request failed");
    return res.json();
  },
};
