import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OptimizationHistoryClient from "./client";

export default async function OptimizationHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <OptimizationHistoryClient />;
}
