"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS, ADMIN_UIDS } from "@/config/admin";

async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useUsers(enabled: boolean) {
  const { user } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** ✅ admin guard */
  const allowed = useMemo(() => {
    if (!user) return false;
    const email = user.email || "";
    return ADMIN_EMAILS.includes(email) || ADMIN_UIDS.includes(user.uid);
  }, [user]);

  /** ✅ fetch users */
  const loadUsers = useCallback(async () => {
    if (!user || !allowed) return;

    let mounted = true;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken(true);
      if (!mounted) return;

      const res = await fetch(`/api/admin/users?perUserOrders=3`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const data = await safeJson<any>(res);
      if (!mounted) return;

      if (!res.ok || !data) {
        setError("Failed to load users");
        return;
      }

      setUsers(data.users || []);
    } catch (e: any) {
      if (mounted) setError(e.message || "Failed to load users");
    } finally {
      if (mounted) setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user, allowed]);

  /** ✅ fetch single user */
  const openUser = useCallback(
    async (uid: string) => {
      if (!user || !allowed) return;

      try {
        const token = await user.getIdToken(true);
        const res = await fetch(`/api/admin/users/${uid}`, {
          headers: { authorization: `Bearer ${token}` },
        });

        const data = await safeJson<any>(res);
        if (res.ok) setSelectedUser(data);
      } catch {
        /* optional: handle error */
      }
    },
    [user, allowed]
  );
  /** ✅ auto load */
  useEffect(() => {
    if (enabled) loadUsers();
  }, [enabled, loadUsers]);
  return {
    users,
    selectedUser,
    openUser
  };
}
