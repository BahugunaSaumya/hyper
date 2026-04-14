export function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts._seconds !== undefined) {
    return new Date(ts._seconds * 1000 + Math.floor((ts._nanoseconds || 0) / 1e6));
  }
  return null;
}

export function formatIST(ts: any) {
  const d = tsToDate(ts);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(",", "");
}

