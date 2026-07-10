import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotebookClient from "./client";

export default async function NotebookPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <NotebookClient />;
}
