import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(__dirname, "..", ".env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const admins = await prisma.admin.findMany();
  console.log("Admins:", admins.length);
  admins.forEach(a => console.log(`  - ${a.email} (${a.name})`));
  await prisma.$disconnect();
}

main();
