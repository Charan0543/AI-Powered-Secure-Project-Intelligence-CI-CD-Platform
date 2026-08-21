/**
 * Authentication & Cryptography Utilities
 * Uses Node.js built-in crypto module (scrypt algorithm) with unique salts.
 */

const crypto = require('crypto');

/**
 * Hashes a plaintext password using crypto.scrypt with a random 16-byte salt
 * @param {string} password Plaintext password
 * @returns {string} Salt and hashed key separated by colon (salt:hash)
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string
 * @param {string} password Plaintext password
 * @param {string} storedHash Stored salt:hash string
 * @returns {boolean} True if password matches, false otherwise
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [salt, originalKey] = parts;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const keyBuffer = Buffer.from(originalKey, 'hex');
    const derivedBuffer = Buffer.from(derivedKey, 'hex');

    if (keyBuffer.length !== derivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Generates a secure, 6-digit numeric verification code
 * @returns {string} 6-digit numeric string (e.g. "481920")
 */
function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generates a secure URL-safe invitation token
 * @returns {string} 48-char hex token
 */
function generateInvitationToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateVerificationCode,
  generateInvitationToken,
};
