import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CorrectClient from "./client";

export default async function CorrectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <CorrectClient />;
}
