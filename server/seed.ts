import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const existingUser = await db.select().from(users).limit(1);
  
  if (existingUser.length > 0) {
    console.log("Database already has users, skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("123456", 10);

  await db.insert(users).values([
    {
      username: "joao.silva",
      password: hashedPassword,
      name: "João Silva",
      email: "joao.silva@empresa.com",
      department: "Tecnologia",
      role: "employee",
    },
    {
      username: "maria.santos",
      password: hashedPassword,
      name: "Maria Santos",
      email: "maria.santos@empresa.com",
      department: "Recursos Humanos",
      role: "manager",
    },
    {
      username: "admin",
      password: hashedPassword,
      name: "Administrador",
      email: "admin@empresa.com",
      department: "Administração",
      role: "admin",
    },
  ]);

  console.log("Seed completed successfully!");
  console.log("Demo users created:");
  console.log("  - joao.silva / 123456");
  console.log("  - maria.santos / 123456");
  console.log("  - admin / 123456");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
