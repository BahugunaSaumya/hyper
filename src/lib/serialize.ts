import { Timestamp } from "firebase-admin/firestore";

export function serializeTimeStamp<T = any>(data: T): T {
  if (data === null || data === undefined) return data;

  // Firestore Timestamp
  if (data instanceof Timestamp) {
    return {
      _seconds: data.seconds,
      _nanoseconds: data.nanoseconds,
    } as any;
  }

  // Array
  if (Array.isArray(data)) {
    return data.map(serializeTimeStamp) as any;
  }

  // Object
  if (typeof data === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = serializeTimeStamp(v);
    }
    return out;
  }

  return data;
}
