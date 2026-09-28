/** Field caller: staff JWT, or the project anon key used by the demo login. */

function jwtPayload(token: string): { role?: string } | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const pad = part.replace(/-/g, '+').replace(/_/g, '/')
      + '='.repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(atob(pad));
  } catch {
    return null;
  }
}

export function isAnonBearer(authHeader: string, anonKey: string) {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  if (anonKey && token === anonKey.trim()) return true;
  return jwtPayload(token)?.role === 'anon';
}

export function ownsSession(
  createdBy: string | null | undefined,
  userId: string | null,
  anonField: boolean,
) {
  if (userId) return createdBy === userId;
  return anonField && (createdBy == null);
}
