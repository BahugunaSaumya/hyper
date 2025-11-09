// src/lib/order-normalize.ts

export type AnyObj = Record<string, any>;

export const normalizeShipping = (s: AnyObj = {}) => ({
  addr1: s.addr1 ?? s.address1 ?? s.address_line1 ?? s.line1 ?? s.address ?? "",
  addr2: s.addr2 ?? s.address2 ?? s.address_line2 ?? s.line2 ?? "",
  city: s.city ?? s.town ?? s.locality ?? "",
  state: s.state ?? s.province ?? s.region ?? "",
  postal: s.postal ?? s.pincode ?? s.zip ?? s.postcode ?? "",
  country: (s.country ?? s.countryCode ?? s.country_code ?? "IN").toUpperCase(),
});

export const computeTotal = (snap: AnyObj = {}, existing: AnyObj = {}) => {
  const explicit = Number(existing?.amounts?.total ?? snap?.amounts?.total);
  if (!Number.isNaN(explicit) && explicit > 0) return explicit;

  const paise = Number(existing?.payment?.amount ?? snap?.payment?.amount);
  if (!Number.isNaN(paise) && paise > 0) return paise / 100;

  const items = Array.isArray(existing?.items) ? existing.items : Array.isArray(snap?.items) ? snap.items : [];
  if (items.length) {
    return items.reduce((sum: number, it: AnyObj) => {
      const price = Number(it?.unitPrice ?? it?.price ?? 0);
      const qty = Number(it?.qty ?? 1);
      return sum + price * qty;
    }, 0);
  }
  return 0;
};

export const inferCurrency = (snap: AnyObj = {}, existing: AnyObj = {}) =>
  String(existing?.amounts?.currency || snap?.amounts?.currency || "INR").toUpperCase();

export const inferModeFromKey = (keyId: string | undefined | null) =>
  keyId && keyId.startsWith("rzp_test_") ? "test" : "live";

// Robust timestamp selection
export const bestPlacedAt = (o: AnyObj = {}, fallbackDate = new Date()) => {
  const candidates = [
    o?.placedAt,
    o?.createdAt,
    o?.payment?.verifiedAt,
    o?.updatedAt,
    o?.payment?.created_at ? new Date(o.payment.created_at * 1000) : null,
  ].filter(Boolean);

  const toMs = (v: any): number => {
    try {
      if (!v) return 0;
      if (v instanceof Date) return v.getTime();
      if (typeof v === "number") return v;
      if (typeof v === "string") return new Date(v).getTime() || 0;
      if (typeof v.seconds === "number") return v.seconds * 1000;
      if (v.toDate) return v.toDate().getTime();
    } catch {}
    return 0;
  };

  const ms = candidates.map(toMs).filter(Boolean);
  if (!ms.length) return fallbackDate;
  return new Date(Math.min(...ms));
};
