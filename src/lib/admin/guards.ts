import { User } from "firebase/auth";

/**
 * Check if user email is in allowed admin list
 */
export function isAdminUser(
  user: User | null,
  allowedEmails: string[]
): boolean {
  if (!user?.email) return false;
  return allowedEmails.includes(user.email);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(
  user: User | null,
  superAdminEmails: string[]
): boolean {
  if (!user?.email) return false;
  return superAdminEmails.includes(user.email);
}

/**
 * Hard guard – throw if not allowed
 * Useful for server actions / API routes
 */
export function assertAdmin(
  user: User | null,
  allowedEmails: string[]
) {
  if (!isAdminUser(user, allowedEmails)) {
    throw new Error("Unauthorized: Admin access required");
  }
}
