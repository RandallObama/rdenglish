import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import OptimizeClient from "./client";

export default async function OptimizePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <OptimizeClient />
    </Suspense>
  );
}
