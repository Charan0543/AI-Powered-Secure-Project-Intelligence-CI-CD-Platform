/**
 * Prisma Client Database Singleton
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: process.env.PRISMA_LOG ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
