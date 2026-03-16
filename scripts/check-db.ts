import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(__dirname, "..", ".env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const log = await prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } });
  console.log("Latest sync log:", JSON.stringify(log, null, 2));

  const students = await prisma.student.count();
  const courses = await prisma.course.count();
  const enrollments = await prisma.enrollment.count();
  console.log(`Students: ${students}, Courses: ${courses}, Enrollments: ${enrollments}`);

  await prisma.$disconnect();
}

main();
