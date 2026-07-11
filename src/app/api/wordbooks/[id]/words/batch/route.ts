import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BatchWord {
  word?: string;
  chinese?: string;
  level?: string;
  usage?: string;
}

/** 批量添加单词到单词本 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: wordbookId } = await params;
  const userId = session.user.id;

  // 验证是成员
  const membership = await prisma.wordbookMember.findUnique({
    where: { wordbookId_userId: { wordbookId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  let body: { words?: BatchWord[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { words } = body;

  if (!words || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: "单词列表不能为空" }, { status: 400 });
  }

  if (words.length > 100) {
    return NextResponse.json({ error: "单次最多添加 100 个单词" }, { status: 400 });
  }

  // 过滤有效的单词
  const valid: Array<{ word: string; chinese: string; level: string | null; usage: string | null }> = [];
  for (const w of words) {
    const word = w.word?.trim();
    const chinese = w.chinese?.trim();
    if (!word || word.length < 1 || word.length > 100) continue;
    if (!chinese || chinese.length < 1 || chinese.length > 200) continue;
    const level = w.level && ["基础", "进阶", "高级"].includes(w.level) ? w.level : null;
    const usage = w.usage?.trim()?.slice(0, 500) || null;
    valid.push({ word, chinese, level, usage });
  }

  if (valid.length === 0) {
    return NextResponse.json({ error: "没有有效的单词" }, { status: 400 });
  }

  // 查询已存在的单词（去重）
  const existingWords = await prisma.wordbookWord.findMany({
    where: {
      wordbookId,
      word: { in: valid.map((v) => v.word) },
    },
    select: { word: true },
  });
  const existingSet = new Set(existingWords.map((e) => e.word));

  const toCreate = valid.filter((v) => !existingSet.has(v.word));

  if (toCreate.length > 0) {
    await prisma.wordbookWord.createMany({
      data: toCreate.map((v) => ({
        wordbookId,
        word: v.word,
        chinese: v.chinese,
        level: v.level,
        usage: v.usage,
        addedById: userId,
      })),
    });
  }

  return NextResponse.json({
    added: toCreate.length,
    skipped: valid.length - toCreate.length,
  });
}
