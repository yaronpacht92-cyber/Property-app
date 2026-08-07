import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LocalFileStorageAdapter } from "@/adapters/storage/local";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, PERMISSIONS.DOCUMENTS_READ)) {
    return NextResponse.json({ error: "You do not have permission to view documents." }, { status: 403 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing download link." }, { status: 400 });
  }

  let payload: { storageKey: string; exp: number };
  try {
    payload = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    return NextResponse.json({ error: "This download link is not valid." }, { status: 400 });
  }

  if (!payload.exp || payload.exp < Date.now()) {
    return NextResponse.json(
      { error: "This download link has expired. Please open the document again." },
      { status: 400 },
    );
  }

  const document = await prisma.document.findFirst({
    where: {
      storageKey: payload.storageKey,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "We could not find that document." }, { status: 404 });
  }

  if (document.scanStatus === "INFECTED") {
    return NextResponse.json(
      { error: "This file failed a security check and cannot be downloaded." },
      { status: 403 },
    );
  }

  try {
    const storage = new LocalFileStorageAdapter();
    const data = await storage.read(document.storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${document.name.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "This sample document does not have a stored file yet. Upload a new document to download it.",
      },
      { status: 404 },
    );
  }
}
