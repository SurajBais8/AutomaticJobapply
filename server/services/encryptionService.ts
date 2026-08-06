import crypto from 'crypto';

// Secret key for credential encryption (derived or fallback)
const SECRET_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'ai-job-apply-assistant-secure-key-32b!';
const ALGORITHM = 'aes-256-cbc';

// Helper to ensure 32-byte key
function getKey(): Buffer {
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

/**
 * Encrypts plain text password to hex string
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypts encrypted hex string back to plain text password
 */
export function decryptPassword(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText; // Fallback if plain text
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return '';
  }
}
