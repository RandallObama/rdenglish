import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    take: 3,
  });
  console.log("Users:", JSON.stringify(users, null, 2));

  const challenges = await prisma.weekendChallenge.findMany();
  console.log(`\nChallenges (${challenges.length}):`);
  challenges.forEach((c) =>
    console.log(`  ${c.date} | ${c.difficulty} | ${c.topic} | ${c.status}`)
  );

  const result = await prisma.weekendChallenge.updateMany({
    where: { status: "pending_review" },
    data: { status: "approved" },
  });
  console.log(`\nApproved: ${result.count}`);

  await prisma.$disconnect();
}

main().catch(console.error);
