/**
 * Phase 1 Demo Data Seeder
 * Ensures representative demo accounts (Founder, Staff Verifier, Admin, Member, Client)
 * and an active organization exist for immediate testing and evaluation.
 */

const defaultPrisma = require('../db');
const { hashPassword } = require('./authCrypto');
const { logger } = require('./logger');

async function seedDemoData(client = defaultPrisma) {
  try {
    // 1. Staff Verifier
    await client.user.upsert({
      where: { email: 'staff@nexorian.corp' },
      update: { isNexorianStaff: true, isEmailVerified: true },
      create: {
        name: 'Nexorian Staff Verifier',
        email: 'staff@nexorian.corp',
        passwordHash: hashPassword('Staff123!'),
        isEmailVerified: true,
        isNexorianStaff: true,
      },
    });

    // 2. Demo Organization (Enterprise)
    const demoOrg = await client.organization.upsert({
      where: { slug: 'nexorian-tech' },
      update: { isVerified: true, status: 'ACTIVE' },
      create: {
        name: 'Nexorian Technologies',
        slug: 'nexorian-tech',
        companyEmail: 'contact@nexorian.demo',
        domain: 'nexorian.demo',
        status: 'ACTIVE',
        isVerified: true,
      },
    });

    // 3. Founder User
    const founderUser = await client.user.upsert({
      where: { email: 'founder@nexorian.demo' },
      update: { isEmailVerified: true },
      create: {
        name: 'Alex Founder',
        email: 'founder@nexorian.demo',
        passwordHash: hashPassword('Founder123!'),
        isEmailVerified: true,
      },
    });
    await client.membership.upsert({
      where: {
        userId_organizationId: {
          userId: founderUser.id,
          organizationId: demoOrg.id,
        },
      },
      update: { role: 'FOUNDER', status: 'ACTIVE' },
      create: {
        userId: founderUser.id,
        organizationId: demoOrg.id,
        role: 'FOUNDER',
        status: 'ACTIVE',
      },
    });

    // 4. Admin User
    const adminUser = await client.user.upsert({
      where: { email: 'admin@nexorian.demo' },
      update: { isEmailVerified: true },
      create: {
        name: 'Sarah Admin',
        email: 'admin@nexorian.demo',
        passwordHash: hashPassword('Admin123!'),
        isEmailVerified: true,
      },
    });
    await client.membership.upsert({
      where: {
        userId_organizationId: {
          userId: adminUser.id,
          organizationId: demoOrg.id,
        },
      },
      update: { role: 'ADMIN', status: 'ACTIVE' },
      create: {
        userId: adminUser.id,
        organizationId: demoOrg.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // 5. Member User
    const memberUser = await client.user.upsert({
      where: { email: 'worker@nexorian.demo' },
      update: { isEmailVerified: true },
      create: {
        name: 'Dev Member',
        email: 'worker@nexorian.demo',
        passwordHash: hashPassword('Worker123!'),
        isEmailVerified: true,
      },
    });
    await client.membership.upsert({
      where: {
        userId_organizationId: {
          userId: memberUser.id,
          organizationId: demoOrg.id,
        },
      },
      update: { role: 'MEMBER', status: 'ACTIVE' },
      create: {
        userId: memberUser.id,
        organizationId: demoOrg.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    // 6. Client User
    const clientUser = await client.user.upsert({
      where: { email: 'client@nexorian.demo' },
      update: { isEmailVerified: true },
      create: {
        name: 'Acme Client Partner',
        email: 'client@nexorian.demo',
        passwordHash: hashPassword('Client123!'),
        isEmailVerified: true,
      },
    });
    await client.membership.upsert({
      where: {
        userId_organizationId: {
          userId: clientUser.id,
          organizationId: demoOrg.id,
        },
      },
      update: { role: 'CLIENT', status: 'ACTIVE' },
      create: {
        userId: clientUser.id,
        organizationId: demoOrg.id,
        role: 'CLIENT',
        status: 'ACTIVE',
      },
    });

    // 7. Verification Request for Demo Org
    const existingReq = await client.verificationRequest.findFirst({
      where: { organizationId: demoOrg.id },
    });
    if (!existingReq) {
      await client.verificationRequest.create({
        data: {
          organizationId: demoOrg.id,
          status: 'AUTO_APPROVED',
          confidenceScore: 100,
          autoApproveSignals: JSON.stringify([
            { signal: 'CORPORATE_DOMAIN_VERIFIED', weight: 45, passed: true },
            { signal: 'CREATOR_EMAIL_DOMAIN_MATCH', weight: 35, passed: true },
            { signal: 'PROFILE_COMPLETENESS', weight: 20, passed: true },
          ]),
        },
      });
    }

    // 8. Startup Org for Manual Review Testing
    const startupOrg = await client.organization.upsert({
      where: { slug: 'quantum-ai' },
      update: { status: 'ACTIVE' },
      create: {
        name: 'Quantum AI Labs',
        slug: 'quantum-ai',
        companyEmail: 'team@gmail.com',
        domain: 'gmail.com',
        status: 'ACTIVE',
        isVerified: false,
      },
    });

    const existingStartupReq = await client.verificationRequest.findFirst({
      where: { organizationId: startupOrg.id },
    });
    if (!existingStartupReq) {
      await client.verificationRequest.create({
        data: {
          organizationId: startupOrg.id,
          status: 'NEEDS_MANUAL_REVIEW',
          confidenceScore: 55,
          autoApproveSignals: JSON.stringify([
            { signal: 'GENERIC_OR_FREE_DOMAIN', weight: 0, passed: false },
            { signal: 'CREATOR_EMAIL_DOMAIN_MATCH', weight: 35, passed: true },
            { signal: 'PROFILE_COMPLETENESS', weight: 20, passed: true },
          ]),
        },
      });
    }

    logger.info('Demo accounts and organizations seeded successfully.');
  } catch (err) {
    logger.error('Failed to seed demo data', err);
  }
}

module.exports = {
  seedDemoData,
};
