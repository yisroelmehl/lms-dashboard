import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDriveFiles } from "@/lib/services/google-drive";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const pageToken = searchParams.get("pageToken") || undefined;

  if (!folderId) {
    return NextResponse.json({ error: "חסר מזהה תיקיה" }, { status: 400 });
  }

  try {
    const result = await listDriveFiles(folderId, pageToken);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Drive Browse]", error);
    return NextResponse.json(
      { error: error.message || "שגיאה בטעינת קבצים" },
      { status: 500 }
    );
  }
}
