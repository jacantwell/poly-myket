import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/groups");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Poly-Myket</h1>
        <p className="text-lg text-muted-foreground">
          Bet on your friends&apos; real-life commitments. Create a group, set
          a challenge, and wager credits on whether they&apos;ll follow through.
        </p>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Create or join a group with friends</p>
          <p>Bet on commitments like &quot;Joe will build his shelf by Friday&quot;</p>
          <p>Winners split the losers&apos; credits proportionally</p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/sign-in">Get Started</Link>
        </Button>
      </div>
    </div>
  );
}
