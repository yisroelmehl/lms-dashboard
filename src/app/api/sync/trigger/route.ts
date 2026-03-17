import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runSync } from "@/lib/moodle/sync-engine";

const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(request: NextRequest) {
  // Auth: either session or sync secret
  const session = await auth();
  const secretHeader = request.headers.get("x-sync-secret");

  if (!session?.user && secretHeader !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "full") as
    | "full"
    | "courses"
    | "students"
    | "grades"
    | "completion"
    | "calendar";

  try {
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const result = await runSync(type, userId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
