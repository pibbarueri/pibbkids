import { PrismaClient, Role, FunctionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Class groups
  const classGroups = await Promise.all([
    prisma.classGroup.upsert({
      where: { name: "Berçário" },
      update: {},
      create: { name: "Berçário", ageRange: "0-2 anos" },
    }),
    prisma.classGroup.upsert({
      where: { name: "Primeiros Passos" },
      update: {},
      create: { name: "Primeiros Passos", ageRange: "3-4 anos" },
    }),
    prisma.classGroup.upsert({
      where: { name: "Ovelhinhas" },
      update: {},
      create: { name: "Ovelhinhas", ageRange: "5-6 anos" },
    }),
    prisma.classGroup.upsert({
      where: { name: "Detetives" },
      update: {},
      create: { name: "Detetives", ageRange: "7-10 anos" },
    }),
    prisma.classGroup.upsert({
      where: { name: "Quase Lá" },
      update: {},
      create: { name: "Quase Lá", ageRange: "11-12 anos" },
    }),
  ]);

  console.log(`✓ ${classGroups.length} class groups`);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { password: await bcrypt.hash("admin", 12) },
    create: {
      name: "Administrador",
      username: "admin",
      password: await bcrypt.hash("admin", 12),
      role: Role.ADMIN,
      status: "APPROVED",
      functions: {
        create: [{ function: FunctionType.PROFESSOR }],
      },
    },
  });

  console.log(`✓ Admin user: ${admin.username}`);

  // Feature flags (default off).
  await prisma.appSetting.upsert({
    where: { key: "first_access_bypass_cpf" },
    update: {},
    create: { key: "first_access_bypass_cpf", value: "false" },
  });
  console.log("✓ App settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
