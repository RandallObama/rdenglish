"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import ReportView from "@/components/ReportView";
import { Loader2 } from "lucide-react";

export default function ReportPage() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  return <ReportView />;
}
