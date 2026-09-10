import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE_URL, REFRESH_TOKEN_COOKIE } from "@/lib/constants";
import { setTokenCookies } from "@/lib/auth-actions";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { detail: "No refresh token available." },
      { status: 401 },
    );
  }

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    const cookieStoreForClear = await cookies();
    cookieStoreForClear.delete("access_token");
    cookieStoreForClear.delete(REFRESH_TOKEN_COOKIE);
    return NextResponse.json(
      { detail: "Session expired. Please log in again." },
      { status: 401 },
    );
  }

  const data = await response.json();

  // SIMPLE_JWT ROTATE_REFRESH_TOKENS=True means the response also includes a
  // new "refresh" value that must replace the old one.
  await setTokenCookies({ access: data.access, refresh: data.refresh });

  return NextResponse.json({ access: data.access });
}
