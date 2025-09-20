// src/app/api/admin/migrate-csv/route.ts
export const runtime = "nodejs"; // ensure Node runtime for fs/path

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import { getDb } from "@/lib/firebaseAdmin";
import fs from "node:fs/promises";
import path from "node:path";
const hyphenOnly = (s: string) =>
  String(s || "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/** RFC4180-ish CSV parser (handles quotes, commas, newlines in fields) */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        cur += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        row.push(cur.trim());
        cur = "";
        i++;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") i++;
        if (row.length > 0 || cur.trim() !== "") {
          row.push(cur.trim());
          rows.push(row);
        }
        row = [];
        cur = "";
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
  }
  if (row.length > 0 || cur.trim() !== "") {
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

function rowsToObjects<T = Record<string, string>>(rows: string[][]): T[] {
  if (!rows.length) return [];
  const header = rows[0].map(h => (h || "").trim());
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj as unknown as T;
  });
}

function toNumber(x: any): number | undefined {
  if (x == null || x === "") return undefined;
  const n = Number(String(x).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    // Read from /public/assets/hyper-products-sample.csv
    const csvPath = path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
    const csvText = await fs.readFile(csvPath, "utf8");
    const rows = parseCSV(csvText);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "CSV empty" }, { status: 400 });
    }

    const objects = rowsToObjects<Record<string, string>>(rows);
    const db = getDb();
    const batch = db.batch();
    let count = 0;

    for (const obj of objects) {
      // Choose a stable doc id: prefer explicit id, else slug(title)
      const title = (obj.title || "").trim();
      const explicitId = (obj.id || "").trim();
      const id = explicitId || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!id) continue;

      const data: Record<string, any> = { ...obj };

      // Normalize numeric fields commonly seen in your CSV
      const numericFields = [
        "MRP",
        "discounted price",
        "presale price",
        "discount percentage",
        "presale price percentage",
        "price",
        "quantity",
        "rating",
      ];
      for (const f of numericFields) {
        const n = toNumber(obj[f]);
        if (n !== undefined) data[f] = n;
      }

      // Normalize sizes -> array
      if (typeof obj.sizes === "string") {
        data.sizes = obj.sizes
          .split("|")
          .map(s => s.trim())
          .filter(Boolean);
      }

      // Derive convenience fields you use in UI
      data.slug = (obj.slug || id);
      data.mrp = data.mrp ?? obj.MRP;
      data.discountedPrice = data.discountedPrice ?? obj["discounted price"];
      data.presalePrice = data.presalePrice ?? obj["presale price"];
      data.price =
        toNumber(obj["discounted price"]) ??
        toNumber(obj["presale price"]) ??
        toNumber(obj["MRP"]) ??
        undefined;

      batch.set(db.collection("products").doc(id), data, { merge: true });
      count++;
    }

    await batch.commit();
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    console.error("[migrate-csv] error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to migrate CSV" }, { status: 500 });
  }
}
