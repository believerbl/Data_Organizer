export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "Unknown";
  // Handle both second and millisecond timestamps
  const date = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysRemaining(purgeAt: number): number {
  const now = Date.now() / 1000;
  const diffSec = purgeAt - now;
  return Math.max(0, Math.ceil(diffSec / (24 * 3600)));
}
