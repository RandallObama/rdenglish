import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CorrectionHistoryClient from "./client";

export default async function CorrectionHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <CorrectionHistoryClient />;
}
