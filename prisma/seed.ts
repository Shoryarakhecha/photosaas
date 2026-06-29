// prisma/seed.ts
// Run: npm run db:seed
// Creates a demo tenant + owner account for testing

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-photography" },
    update: {},
    create: {
      name: "Demo Photography",
      slug: "demo-photography",
      plan: "FREE",
    },
  });

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // Create owner user
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "owner@demo.com",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Demo Owner",
      email: "owner@demo.com",
      passwordHash,
      role: "OWNER",
    },
  });

  console.log(`✅ Owner: ${owner.email}`);
  console.log("\n📋 Test credentials:");
  console.log("   Email: owner@demo.com");
  console.log("   Password: demo1234");
  console.log("   Org slug: demo-photography");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
