import { useEffect, useState } from "react";
import { ADMIN_EMAILS, ADMIN_UIDS, SUPER_ADMIN_EMAILS } from "@/config/admin";

type AdminConfigDoc = { adminEmails: string[]; adminUids?: string[] };

async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function SuperAdminPanel({ token }: { token: string }) {
    const [adminEmails, setAdminEmails] = useState<string>("");
    const [busy, setBusy] = useState<boolean>(false);
    const [msg, setMsg] = useState<string>("");

    // Load current config
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!token) return;
                const res = await fetch("/api/admin/config", { headers: { authorization: `Bearer ${token}` } });
                const j = await safeJson<AdminConfigDoc>(res);
                if (mounted && res.ok && j?.adminEmails) setAdminEmails(j.adminEmails.join(", "));
            } catch { /* ignore */ }
        })();
        return () => { mounted = false; };
    }, [token]);

    async function save() {
        if (!token) return;
        setBusy(true); setMsg("");
        try {
            const list = adminEmails
                .split(",")
                .map((x: string) => x.trim())
                .filter((x: string) => !!x);

            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ adminEmails: list }),
            });

            const j = await safeJson<AdminConfigDoc & { ok?: boolean }>(res);
            if (!res.ok) throw new Error((j as any)?.error || "Failed to save config");
            setMsg("Saved.");
        } catch (e: any) {
            setMsg(e?.message || "Failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-2xl border p-4">
            <p className="text-sm mb-2">Manage <b>Admin Emails</b> (comma-separated). Only super admins can edit.</p>
            <textarea
                value={adminEmails}
                onChange={(e) => setAdminEmails(e.target.value)}
                className="w-full border rounded-md p-2 text-sm h-28"
                placeholder="admin1@example.com, admin2@example.com"
            />
            <div className="mt-3 flex items-center gap-3">
                <button
                    onClick={save}
                    disabled={busy}
                    className={`px-4 py-2 rounded-full border text-sm ${busy ? "opacity-50" : "hover:bg-black hover:text-white"}`}
                >
                    {busy ? "Saving…" : "Save"}
                </button>
                {msg && <span className="text-sm text-gray-600">{msg}</span>}
            </div>
        </div>
    );
}