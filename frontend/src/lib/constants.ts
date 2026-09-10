export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const PUBLIC_ROUTES = ["/login"];
export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/bookings",
  "/expenses",
  "/reports",
];
