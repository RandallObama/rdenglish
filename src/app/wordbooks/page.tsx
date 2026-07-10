import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WordbooksClient from "./client";

export default async function WordbooksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <WordbooksClient />;
}
