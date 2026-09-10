"use server";

import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_COOKIE,
  API_BASE_URL,
  REFRESH_TOKEN_COOKIE,
} from "./constants";
import type { TokenPair } from "./types";

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 8; // 8 hours, matches SIMPLE_JWT ACCESS_TOKEN_LIFETIME
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, matches REFRESH_TOKEN_LIFETIME

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  username: string,
  password: string,
): Promise<LoginResult> {
  let tokens: TokenPair;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error:
          response.status === 401
            ? "Invalid username or password."
            : "Unable to sign in right now. Please try again.",
      };
    }

    tokens = await response.json();
  } catch {
    return {
      success: false,
      error: "Could not reach the server. Please check your connection.",
    };
  }

  await setTokenCookies(tokens);
  return { success: true };
}

export async function setTokenCookies(tokens: TokenPair) {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  if (tokens.refresh) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
