import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - employees who register punches
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  department: text("department"),
  role: text("role").default("employee"),
  faceEmbedding: text("face_embedding"), // JSON string of 512D vector
  enrolledAt: timestamp("enrolled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Punches table - time clock entries
export const punches = pgTable("punches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "entry" or "exit"
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  gpsAccuracy: real("gps_accuracy"),
  faceMatchScore: real("face_match_score"),
  faceMatched: boolean("face_matched").default(false),
  gpsValid: boolean("gps_valid").default(false),
  status: text("status").default("pending"), // "ok" or "pending"
});

// Justifications table - for pending punches
export const justifications = pgTable("justifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  punchId: varchar("punch_id").notNull().references(() => punches.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").default("pending"), // "pending", "approved", "rejected"
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
});

// Audit logs table - for tracking system actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  punches: many(punches),
  justifications: many(justifications),
  auditLogs: many(auditLogs),
}));

export const punchesRelations = relations(punches, ({ one, many }) => ({
  user: one(users, {
    fields: [punches.userId],
    references: [users.id],
  }),
  justifications: many(justifications),
}));

export const justificationsRelations = relations(justifications, ({ one }) => ({
  punch: one(punches, {
    fields: [justifications.punchId],
    references: [punches.id],
  }),
  user: one(users, {
    fields: [justifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  enrolledAt: true,
  faceEmbedding: true,
});

export const insertPunchSchema = createInsertSchema(punches).omit({
  id: true,
  timestamp: true,
});

export const insertJustificationSchema = createInsertSchema(justifications).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Face enrollment schema
export const enrollFaceSchema = z.object({
  imageBase64: z.string().min(1, "Imagem é obrigatória"),
});

// Punch with face match schema
export const punchFaceMatchSchema = z.object({
  imageBase64: z.string().min(1, "Imagem é obrigatória"),
  type: z.enum(["entry", "exit"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  gpsAccuracy: z.number().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPunch = z.infer<typeof insertPunchSchema>;
export type Punch = typeof punches.$inferSelect;

export type InsertJustification = z.infer<typeof insertJustificationSchema>;
export type Justification = typeof justifications.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type LoginInput = z.infer<typeof loginSchema>;
export type EnrollFaceInput = z.infer<typeof enrollFaceSchema>;
export type PunchFaceMatchInput = z.infer<typeof punchFaceMatchSchema>;
