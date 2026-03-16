import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";
import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(__dirname, "..", ".env") });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin users
  const admin1 = await prisma.admin.upsert({
    where: { email: "admin@lemaanyilmedo.org" },
    update: {},
    create: {
      email: "admin@lemaanyilmedo.org",
      name: "מנהל ראשי",
      hashedPassword: hashSync("admin123", 12),
    },
  });

  const admin2 = await prisma.admin.upsert({
    where: { email: "manager@lemaanyilmedo.org" },
    update: {},
    create: {
      email: "manager@lemaanyilmedo.org",
      name: "מנהל לימודים",
      hashedPassword: hashSync("manager123", 12),
    },
  });

  console.log("Created admin users:", admin1.email, admin2.email);
  console.log("");
  console.log("Login credentials:");
  console.log("  Admin 1: admin@lemaanyilmedo.org / admin123");
  console.log("  Admin 2: manager@lemaanyilmedo.org / manager123");
  console.log("");
  console.log("IMPORTANT: Change these passwords after first login!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
