import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";

// One-time route to create the super_admin user.
// Fails if a super_admin already exists.
export async function POST() {
  const existing = await prisma.admin.findFirst({ where: { role: "super_admin" } });
  if (existing) {
    return NextResponse.json({ error: "super_admin already exists" }, { status: 409 });
  }

  const admin = await prisma.admin.create({
    data: {
      email: "superadmin@lemaanyilmedo.org",
      name: "מנהל עליון",
      hashedPassword: hashSync("admin5770", 12),
      role: "super_admin",
    },
  });

  return NextResponse.json({ ok: true, email: admin.email });
}
