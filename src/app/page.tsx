import { Hero } from "@/components/Hero";
import { PricingPreview } from "@/components/PricingPreview";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <>
      <Hero />
      <PricingPreview />
    </>
  );
}
