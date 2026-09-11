const AADHAAR_PATTERN = /^\d{12}$/;

export function isValidAadhaar(value: string): boolean {
  return AADHAAR_PATTERN.test(value.trim());
}
