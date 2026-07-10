import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WriteClient from "./client";

export default async function WritePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <WriteClient />;
}
