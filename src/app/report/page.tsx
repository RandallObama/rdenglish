import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportView from "@/components/ReportView";

export default async function ReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <ReportView />;
}
