import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChallengeClient } from "./client";

export default async function ChallengePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <ChallengeClient />;
}
