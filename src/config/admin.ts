// src/config/admin.ts

/** Super admins: code-only list. Only these emails can modify admin settings. */
export const SUPER_ADMIN_EMAILS: string[] = [
  "shanubahuguna@gmail.com",
];

/** Default admin allow-lists (file-based). */
export const ADMIN_EMAILS: string[] = [
  "shanubahuguna@gmail.com",
  "bahugunas60@gmail.com",
];

/** Optional: admins by UID. They have admin access, but are NOT super admins. */
export const ADMIN_UIDS: string[] = [];
