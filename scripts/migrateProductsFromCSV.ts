// scripts/migrateProductsFromCSV.ts
// Run with: node -r esbuild-register scripts/migrateProductsFromCSV.ts path/to/products.csv

import fs from "node:fs/promises";
import admin from "firebase-admin";
import path from "node:path";
import { computeEffectivePrice, slugify } from "../src/lib/price";

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

type Raw = Record<string, string>;

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
        if (text[i + 1] === '"') {
          cur += '"'; i += 2; continue;
        } else { inQuotes = false; i++; continue; }
      } else { cur += ch; i++; continue; }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ",") { row.push(cur.trim()); cur = ""; i++; continue; }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        if (row.length || cur.trim()) { row.push(cur.trim()); rows.push(row); }
        row = []; cur = ""; i++; continue;
      }
      cur += ch; i++;
    }
  }
  if (row.length || cur.trim()) { row.push(cur.trim()); rows.push(row); }
  return rows;
}

function rowsToObjects(rows: string[][]): Raw[] {
  if (!rows.length) return [];
  const header = rows[0].map(h => (h || "").trim());
  return rows.slice(1).map(r => {
    const obj: Raw = {};
    header.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

function toNum(x: any): number | undefined {
  if (x == null || x === "") return undefined;
  const n = Number(String(x).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
  const csvText = await fs.readFile(csvPath, "utf8");
  const rows = parseCSV(csvText);
  const objs = rowsToObjects(rows);

  const db = admin.firestore();
  const batch = db.batch();
  let count = 0;

  for (const o of objs) {
    const title = o.title?.trim() || "";
    if (!title) continue;

    const id = (o.id?.trim()) || slugify(title);
    const sizes = (o.sizes || "")
      .split("|")
      .map(s => s.trim())
      .filter(Boolean);

    const data = {
      id,
      slug: slugify(o.slug || title),
      title,
      desc: o.desc || "",
      mrp: toNum(o.MRP) ?? 0,
      discountedPrice: toNum(o["discounted price"]),
      discountPct: toNum(o["discount percentage"]),
      presalePrice: toNum(o["presale price"]),
      presalePct: toNum(o["presale price percentage"]),
      category: o.category || "",
      sizes,
      image: o.image || "",
      rating: toNum(o.rating),
      quantity: toNum(o.quantity) ?? 0,
    };

    const price = computeEffectivePrice({
      mrp: data.mrp,
      discountedPrice: data.discountedPrice,
      presalePrice: data.presalePrice,
    });

    const doc = {
      ...data,
      price,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = db.collection("products").doc(id);
    batch.set(ref, doc, { merge: true });
    count++;

    // Commit every 400 ops to avoid batch limit
    if (count % 400 === 0) {
      await batch.commit();
    }
  }

  // Final commit if any pending
  await batch.commit();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
