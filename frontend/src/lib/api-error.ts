import { isAxiosError } from "axios";

function flattenErrorValue(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenErrorValue);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(
      flattenErrorValue,
    );
  }
  return [];
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      const messages = flattenErrorValue(data);
      if (messages.length > 0) return messages.join(" ");
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
