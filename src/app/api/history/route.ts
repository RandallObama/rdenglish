import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const writings = await prisma.writing.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sourceText: true,
      resultText: true,
      style: true,
      grammarNotes: true,
      vocabNotes: true,
      createdAt: true,
    },
    take: 50,
  });

  return NextResponse.json(
    writings.map((w) => ({
      ...w,
      grammarNotes: w.grammarNotes ? JSON.parse(w.grammarNotes) : [],
      vocabNotes: w.vocabNotes ? JSON.parse(w.vocabNotes) : [],
    }))
  );
}
