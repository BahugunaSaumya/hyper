export const USER_DASHBOARD_PATH = "/dashboard";
export const LOGIN_PATH = "/login";

export function loginUrl(next?: string) {
  return next ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}` : LOGIN_PATH;
}
