import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHECKLIST_FIELDS = [
  "callWithDirector",
  "callWithRabbi",
  "materialsSent",
  "materialsReceived",
  "connectedToPortal",
] as const;

type ChecklistField = (typeof CHECKLIST_FIELDS)[number];

// PATCH /api/student-onboarding/[id] — toggle a checklist field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { field, value } = body;

  if (!CHECKLIST_FIELDS.includes(field as ChecklistField)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  if (typeof value !== "boolean") {
    return NextResponse.json({ error: "Value must be boolean" }, { status: 400 });
  }

  const onboarding = await prisma.studentOnboarding.update({
    where: { id },
    data: { [field]: value },
  });

  // Check if all steps are completed
  const allDone = CHECKLIST_FIELDS.every(
    (f) => onboarding[f as keyof typeof onboarding] === true
  );

  // Update completedAt accordingly
  const updated = await prisma.studentOnboarding.update({
    where: { id },
    data: { completedAt: allDone ? new Date() : null },
  });

  return NextResponse.json(updated);
}
