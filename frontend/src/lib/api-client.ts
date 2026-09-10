"use client";

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { getClientCookie } from "./client-cookies";
import { ACCESS_TOKEN_COOKIE, API_BASE_URL } from "./constants";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getClientCookie(ACCESS_TOKEN_COOKIE);
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await axios.post<{ access: string }>(
      "/api/auth/refresh",
      null,
      { withCredentials: true },
    );
    return response.data.access;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Coalesce concurrent 401s into a single refresh call.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return apiClient(originalRequest);
      }

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
