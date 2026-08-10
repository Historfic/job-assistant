// Who may use the admin console. Set ADMIN_EMAILS to a comma-separated list;
// matching is case-insensitive. With none set, nobody is an admin — the
// console 404s for everyone, including in demo mode.

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
