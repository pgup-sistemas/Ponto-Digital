import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("123456", 10);

  // Check if admin exists, if not create it
  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      name: "Administrador",
      email: "admin@empresa.com",
      department: "Administração",
      role: "admin",
    });
    console.log("Admin user created: admin / 123456");
  } else {
    // Update existing admin to ensure they have admin role
    await db.update(users).set({ role: "admin" }).where(eq(users.username, "admin"));
    console.log("Admin user already exists, role verified");
  }

  // Check if demo employees exist
  const existingJoao = await db.select().from(users).where(eq(users.username, "joao.silva")).limit(1);
  if (existingJoao.length === 0) {
    await db.insert(users).values({
      username: "joao.silva",
      password: hashedPassword,
      name: "João Silva",
      email: "joao.silva@empresa.com",
      department: "Tecnologia",
      role: "employee",
    });
    console.log("Demo user created: joao.silva / 123456");
  }

  const existingMaria = await db.select().from(users).where(eq(users.username, "maria.santos")).limit(1);
  if (existingMaria.length === 0) {
    await db.insert(users).values({
      username: "maria.santos",
      password: hashedPassword,
      name: "Maria Santos",
      email: "maria.santos@empresa.com",
      department: "Recursos Humanos",
      role: "manager",
    });
    console.log("Demo user created: maria.santos / 123456");
  }

  console.log("\nSeed completed successfully!");
  console.log("Available users:");
  console.log("  - admin / 123456 (Administrador)");
  console.log("  - joao.silva / 123456 (Funcionário)");
  console.log("  - maria.santos / 123456 (Gestor)");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
