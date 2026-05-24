import { Box } from "@chakra-ui/react";
import { PrismaClient } from "./PrismaClient";
import { FIXTURES } from "@/lib/shared/mocks-prisma";

// The root URL serves the Prisma WhatsApp triage demo.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const fixtureList = Object.entries(FIXTURES).map(([id, opener]) => ({
    id,
    text: opener.text,
  }));

  return (
    <Box bg="bg.canvas" color="fg" minH="100vh">
      <Box maxW="1480px" mx="auto" px={{ base: 4, md: "32px" }} pt={{ base: 5, md: "28px" }} pb={{ base: 8, md: "48px" }}>
        <PrismaClient fixtures={fixtureList} />
      </Box>
    </Box>
  );
}
