import { NextResponse } from "next/server";
import { clear } from "@/lib/cache";
import { isAdminUser } from "@/lib/admin/guards";
import { getAuth } from "firebase-admin/auth";

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing auth token");
  }

  const token = authHeader.replace("Bearer ", "");
  const decoded = await getAuth().verifyIdToken(token);
  if (!isAdminUser({ email: decoded.email } as any, [
    "hyperfitness.in@gmail.com"
  ])) {
    throw new Error("Unauthorized");
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    clear();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 401 }
    );
  }
}
