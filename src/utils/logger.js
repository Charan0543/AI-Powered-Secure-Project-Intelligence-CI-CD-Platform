/**
 * Privacy-Preserving Logger for Nexorian
 * Sanitizes and redacts passwords, OTP codes, invitation tokens, and sensitive URLs from all logs.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'verificationcode',
  'token',
  'invitationtoken',
  'inviteurl',
  'authorization',
  'cookie',
]);

/**
 * Masks an email address for privacy (e.g. j***@example.com)
 * @param {string} email 
 * @returns {string}
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '***';
  }
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Recursively redacts sensitive keys from objects before logging
 * @param {any} data 
 * @returns {any}
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey === 'email' && typeof value === 'string') {
      sanitized[key] = maskEmail(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const logger = {
  info: (msg, meta = null) => {
    if (meta) {
      console.log(`[INFO] ${msg}`, JSON.stringify(sanitizeForLogging(meta)));
    } else {
      console.log(`[INFO] ${msg}`);
    }
  },
  warn: (msg, meta = null) => {
    if (meta) {
      console.warn(`[WARN] ${msg}`, JSON.stringify(sanitizeForLogging(meta)));
    } else {
      console.warn(`[WARN] ${msg}`);
    }
  },
  error: (msg, error = null) => {
    if (error && error.message) {
      console.error(`[ERROR] ${msg}: ${error.message}`);
    } else if (error) {
      console.error(`[ERROR] ${msg}`, JSON.stringify(sanitizeForLogging(error)));
    } else {
      console.error(`[ERROR] ${msg}`);
    }
  },
};

module.exports = {
  logger,
  maskEmail,
  sanitizeForLogging,
};
