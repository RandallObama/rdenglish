import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 添加单词到单词本 */
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

  let body: { word?: string; chinese?: string; phoneticUK?: string; phoneticUS?: string; level?: string; usage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { word, chinese, phoneticUK, phoneticUS, level, usage } = body;

  if (!word || typeof word !== "string" || word.trim().length < 1 || word.trim().length > 100) {
    return NextResponse.json({ error: "单词不能为空且不超过100字符" }, { status: 400 });
  }
  if (!chinese || typeof chinese !== "string" || chinese.trim().length < 1 || chinese.trim().length > 200) {
    return NextResponse.json({ error: "中文释义不能为空且不超过200字符" }, { status: 400 });
  }
  if (level && !["基础", "进阶", "高级"].includes(level)) {
    return NextResponse.json({ error: "等级无效" }, { status: 400 });
  }
  if (usage && usage.length > 500) {
    return NextResponse.json({ error: "用法说明不超过500字符" }, { status: 400 });
  }

  const entry = await prisma.wordbookWord.create({
    data: {
      wordbookId,
      word: word.trim(),
      chinese: chinese.trim(),
      phoneticUK: phoneticUK?.trim() || null,
      phoneticUS: phoneticUS?.trim() || null,
      level: level || null,
      usage: usage?.trim() || null,
      addedById: userId,
    },
  });

  return NextResponse.json({ id: entry.id, success: true });
}
