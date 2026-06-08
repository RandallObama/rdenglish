import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUsage } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const usage = await checkUsage(session.user.id);
  return NextResponse.json(usage);
}
