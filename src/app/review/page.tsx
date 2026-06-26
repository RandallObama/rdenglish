import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReviewClient } from "./client";

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 管理员检查 — 服务端初步校验
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!adminIds.includes(session.user.id)) {
    redirect("/dashboard");
  }

  return <ReviewClient />;
}
