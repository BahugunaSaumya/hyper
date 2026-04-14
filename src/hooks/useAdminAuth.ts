"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS, ADMIN_UIDS, SUPER_ADMIN_EMAILS } from "@/config/admin";

export function useAdminAuth() {
  const { user } = useAuth() as any;

  const allowed = useMemo(() => {
    if (!user) return false;
    return ADMIN_EMAILS.includes(user.email) || ADMIN_UIDS.includes(user.uid);
  }, [user]);

  const isSuper = useMemo(() => {
    return SUPER_ADMIN_EMAILS
      .map(e => e.toLowerCase())
      .includes((user?.email || "").toLowerCase());
  }, [user]);

  return { user, allowed, isSuper };
}
