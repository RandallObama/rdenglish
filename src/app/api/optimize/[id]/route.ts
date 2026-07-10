import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const record = await prisma.optimization.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      originalText: true,
      optimizedText: true,
      style: true,
      examType: true,
      intensity: true,
      mode: true,
      improvements: true,
      grammarNotes: true,
      vocabNotes: true,
      highlights: true,
      transitionAnalysis: true,
      contextBefore: true,
      contextAfter: true,
      createdAt: true,
    },
  });

  if (!record) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  if (record.userId !== session.user.id) {
    return NextResponse.json({ error: "无权访问此记录" }, { status: 403 });
  }

  return NextResponse.json({
    ...record,
    improvements: record.improvements ? safeJsonParse(record.improvements, []) : [],
    grammarNotes: record.grammarNotes ? safeJsonParse(record.grammarNotes, []) : [],
    vocabNotes: record.vocabNotes ? safeJsonParse(record.vocabNotes, []) : [],
    transitionAnalysis: record.transitionAnalysis ? safeJsonParse(record.transitionAnalysis, null) : null,
  });
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
