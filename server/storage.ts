import { 
  users, punches, justifications, auditLogs,
  type User, type InsertUser, 
  type Punch, type InsertPunch,
  type Justification, type InsertJustification,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  updateUserFaceEmbedding(id: string, embedding: string): Promise<User>;

  // Punches
  createPunch(punch: InsertPunch): Promise<Punch>;
  getPunchesByUser(userId: string, period?: "all" | "week" | "month"): Promise<Punch[]>;
  getAllPunches(period?: "all" | "week" | "month"): Promise<Punch[]>;
  getPendingPunchesByUser(userId: string): Promise<Punch[]>;
  getLastPunchByUser(userId: string): Promise<Punch | undefined>;
  updatePunchStatus(id: string, status: string): Promise<Punch>;
  getPunch(id: string): Promise<Punch | undefined>;

  // Justifications
  createJustification(justification: InsertJustification): Promise<Justification>;
  getJustificationsByUser(userId: string): Promise<Justification[]>;
  getAllPendingJustifications(): Promise<Array<Justification & { userName: string; punchTimestamp: Date; punchType: string }>>;
  getJustificationByPunch(punchId: string): Promise<Justification | undefined>;
  updateJustification(id: string, status: string, reviewedBy: string): Promise<Justification>;
  getJustification(id: string): Promise<Justification | undefined>;

  // Audit
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalPunches: number;
    pendingJustifications: number;
    todayPunches: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserFaceEmbedding(id: string, embedding: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ faceEmbedding: embedding, enrolledAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Punches
  async createPunch(punch: InsertPunch): Promise<Punch> {
    const [newPunch] = await db.insert(punches).values(punch).returning();
    return newPunch;
  }

  async getPunchesByUser(userId: string, period: "all" | "week" | "month" = "all"): Promise<Punch[]> {
    const now = new Date();
    let startDate: Date | undefined;

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (startDate) {
      return db
        .select()
        .from(punches)
        .where(and(eq(punches.userId, userId), gte(punches.timestamp, startDate)))
        .orderBy(desc(punches.timestamp));
    }

    return db
      .select()
      .from(punches)
      .where(eq(punches.userId, userId))
      .orderBy(desc(punches.timestamp));
  }

  async getAllPunches(period: "all" | "week" | "month" = "all"): Promise<Punch[]> {
    const now = new Date();
    let startDate: Date | undefined;

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (startDate) {
      return db
        .select()
        .from(punches)
        .where(gte(punches.timestamp, startDate))
        .orderBy(desc(punches.timestamp));
    }

    return db
      .select()
      .from(punches)
      .orderBy(desc(punches.timestamp));
  }

  async getPunch(id: string): Promise<Punch | undefined> {
    const [punch] = await db.select().from(punches).where(eq(punches.id, id));
    return punch || undefined;
  }

  async getPendingPunchesByUser(userId: string): Promise<Punch[]> {
    return db
      .select()
      .from(punches)
      .where(and(eq(punches.userId, userId), eq(punches.status, "pending")))
      .orderBy(desc(punches.timestamp));
  }

  async getLastPunchByUser(userId: string): Promise<Punch | undefined> {
    const [punch] = await db
      .select()
      .from(punches)
      .where(eq(punches.userId, userId))
      .orderBy(desc(punches.timestamp))
      .limit(1);
    return punch || undefined;
  }

  async updatePunchStatus(id: string, status: string): Promise<Punch> {
    const [punch] = await db
      .update(punches)
      .set({ status })
      .where(eq(punches.id, id))
      .returning();
    return punch;
  }

  // Justifications
  async createJustification(justification: InsertJustification): Promise<Justification> {
    const [newJustification] = await db
      .insert(justifications)
      .values(justification)
      .returning();
    return newJustification;
  }

  async getJustificationsByUser(userId: string): Promise<Justification[]> {
    return db
      .select()
      .from(justifications)
      .where(eq(justifications.userId, userId))
      .orderBy(desc(justifications.createdAt));
  }

  async getJustificationByPunch(punchId: string): Promise<Justification | undefined> {
    const [justification] = await db
      .select()
      .from(justifications)
      .where(eq(justifications.punchId, punchId));
    return justification || undefined;
  }

  async getAllPendingJustifications(): Promise<Array<Justification & { userName: string; punchTimestamp: Date; punchType: string }>> {
    const results = await db
      .select({
        id: justifications.id,
        userId: justifications.userId,
        punchId: justifications.punchId,
        reason: justifications.reason,
        status: justifications.status,
        reviewedBy: justifications.reviewedBy,
        reviewedAt: justifications.reviewedAt,
        createdAt: justifications.createdAt,
        userName: users.name,
        punchTimestamp: punches.timestamp,
        punchType: punches.type,
      })
      .from(justifications)
      .leftJoin(users, eq(justifications.userId, users.id))
      .leftJoin(punches, eq(justifications.punchId, punches.id))
      .where(eq(justifications.status, "pending"))
      .orderBy(desc(justifications.createdAt));
    
    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      punchId: row.punchId,
      reason: row.reason,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      userName: row.userName || "Desconhecido",
      punchTimestamp: row.punchTimestamp || new Date(),
      punchType: row.punchType || "entry",
    }));
  }

  async updateJustification(id: string, status: string, reviewedBy: string): Promise<Justification> {
    const [justification] = await db
      .update(justifications)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(justifications.id, id))
      .returning();
    return justification;
  }

  async getJustification(id: string): Promise<Justification | undefined> {
    const [justification] = await db
      .select()
      .from(justifications)
      .where(eq(justifications.id, id));
    return justification || undefined;
  }

  // Audit
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  // Stats
  async getStats(): Promise<{
    totalUsers: number;
    totalPunches: number;
    pendingJustifications: number;
    todayPunches: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersCount] = await db.select({ count: count() }).from(users);
    const [punchesCount] = await db.select({ count: count() }).from(punches);
    const [pendingCount] = await db
      .select({ count: count() })
      .from(justifications)
      .where(eq(justifications.status, "pending"));
    const [todayCount] = await db
      .select({ count: count() })
      .from(punches)
      .where(gte(punches.timestamp, today));

    return {
      totalUsers: usersCount.count,
      totalPunches: punchesCount.count,
      pendingJustifications: pendingCount.count,
      todayPunches: todayCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
