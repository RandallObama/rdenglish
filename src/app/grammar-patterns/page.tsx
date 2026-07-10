import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GrammarPatternsView } from "@/components/GrammarPatternsView";

export default async function GrammarPatternsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <GrammarPatternsView />;
}
