// src/app/api/dev/test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { to, subject, html, text } = await req.json();
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const from = process.env.RESEND_FROM || "no-reply@gethypergear.in";

    const result = await resend.emails.send({
      from,
      to: to || process.env.RESEND_ADMIN_TO || from,
      subject: subject || "Resend test",
      html: html || "<p>It works 🎉</p>",
      text,
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (e: any) {
    console.error("[test-email] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to send" }, { status: 500 });
  }
}
