// Emails are compared case-insensitively and without surrounding spaces, so
// every place that identifies an account by email normalizes it the same way.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
