import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the terms acceptance
    const termsAcceptance = await (prisma as any).termsAcceptance.findUnique({
      where: { id },
    });

    if (!termsAcceptance) {
      return NextResponse.json(
        { error: "Terms acceptance not found" },
        { status: 404 }
      );
    }

    // Check if user is the student or an admin
    // For now, we'll allow download for authenticated users
    // Implement stricter access control if needed

    if (!termsAcceptance.pdfContent) {
      return NextResponse.json(
        { error: "PDF not available" },
        { status: 404 }
      );
    }

    // Return PDF as binary
    const fileName = termsAcceptance.pdfFileName || `terms-${termsAcceptance.studentId}.pdf`;
    
    return new NextResponse(termsAcceptance.pdfContent, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return NextResponse.json(
      { error: "Failed to download PDF" },
      { status: 500 }
    );
  }
}
