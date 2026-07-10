import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WordbookDetailClient from "./client";

export default async function WordbookDetailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <WordbookDetailClient />;
}
