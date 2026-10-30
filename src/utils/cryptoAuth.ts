import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Checks if a string is already a valid bcrypt hash
 */
export function isBcryptHash(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  // bcrypt hashes start with $2a$, $2b$, or $2y$ followed by 2 cost digits and 53 base64-like characters
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value.trim());
}

/**
 * Hashes a plaintext password or PIN using bcrypt.
 * If already hashed, returns the input safely.
 */
export function hashCredential(plainText?: string | null): string {
  if (!plainText || typeof plainText !== 'string') return '';
  const trimmed = plainText.trim();
  if (!trimmed) return '';
  if (isBcryptHash(trimmed)) return trimmed;
  return bcrypt.hashSync(trimmed, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password or PIN attempt against a stored credential.
 * Supports transparent upgrade from legacy plaintext passwords.
 */
export function verifyCredential(attempt?: string | null, stored?: string | null): boolean {
  if (!attempt || !stored) return false;
  const cleanAttempt = attempt.trim();
  const cleanStored = stored.trim();
  if (!cleanAttempt || !cleanStored) return false;

  if (isBcryptHash(cleanStored)) {
    try {
      return bcrypt.compareSync(cleanAttempt, cleanStored);
    } catch {
      return false;
    }
  }

  // Legacy plaintext match
  return cleanAttempt === cleanStored;
}
