import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import FriendsClient from "./client";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <FriendsClient />;
}
