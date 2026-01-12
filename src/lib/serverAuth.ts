import { cookies, headers } from "next/headers";
import { getAuth } from "./firebaseAdmin";

export async function getServerUser() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token =
    cookieStore.get("firebaseToken")?.value ||
    headerStore.get("authorization")?.replace("Bearer ", "");

  if (!token) return null;

  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export function isAdmin(email?: string) {
  return !!email && ["admin@yourstore.com"].includes(email);
}
