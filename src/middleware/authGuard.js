/**
 * Authentication Guard
 * Validates session token server-side and attaches req.user and req.session.
 */

const defaultPrisma = require('../db');
const { logger } = require('../utils/logger');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    let token = null;

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-session-token']) {
      token = req.headers['x-session-token'].trim();
    } else if (req.query && req.query.sessionToken) {
      token = req.query.sessionToken;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in.',
        code: 'UNAUTHORIZED',
      });
    }

    const session = await defaultPrisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) {
        await defaultPrisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return res.status(401).json({
        error: 'Session expired or invalid. Please sign in again.',
        code: 'SESSION_EXPIRED',
      });
    }

    req.user = session.user;
    req.session = session;
    next();
  } catch (err) {
    logger.error('Auth guard error', err);
    return res.status(500).json({ error: 'Internal authentication error.' });
  }
}

module.exports = {
  requireAuth,
};