import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema, 
  enrollFaceSchema, 
  punchFaceMatchSchema,
  insertJustificationSchema,
  adminUpdateUserSchema,
  reviewJustificationSchema
} from "@shared/schema";
import { 
  generateToken, 
  comparePassword, 
  hashPassword, 
  authMiddleware, 
  type AuthRequest 
} from "./auth";
import { generateFaceEmbedding, matchFace, validateGPS } from "./face-match";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const { username, password } = parsed.data;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }

      const passwordValid = await comparePassword(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }

      const token = generateToken(user);

      await storage.createAuditLog({
        userId: user.id,
        action: "login",
        details: "Login realizado com sucesso",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // User Routes
  app.post("/api/users", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const existingUser = await storage.getUserByUsername(parsed.data.username);
      if (existingUser) {
        return res.status(409).json({ message: "Usuário já existe" });
      }

      const hashedPassword = await hashPassword(parsed.data.password);
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/users/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/users/:id/enroll-face", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      if (req.user!.id !== id) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      const parsed = enrollFaceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const { imageBase64 } = parsed.data;

      // Generate face embedding (in memory only - no image stored)
      const embedding = generateFaceEmbedding(imageBase64);
      const embeddingJson = JSON.stringify(embedding);

      // Update user with face embedding
      const user = await storage.updateUserFaceEmbedding(id, embeddingJson);

      await storage.createAuditLog({
        userId: id,
        action: "enroll_face",
        details: "Cadastro facial realizado",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ message: "Cadastro facial realizado com sucesso", user: userWithoutPassword });
    } catch (error) {
      console.error("Enroll face error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Punch Routes
  app.post("/api/punches/face-match", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = punchFaceMatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const { imageBase64, type, latitude, longitude, gpsAccuracy } = parsed.data;
      const userId = req.user!.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Validate GPS
      const gpsValid = validateGPS(latitude, longitude, gpsAccuracy);

      // Face matching
      let faceMatched = false;
      let faceMatchScore = 0;

      if (user.faceEmbedding) {
        const result = matchFace(imageBase64, user.faceEmbedding);
        faceMatched = result.matched;
        faceMatchScore = result.score;
      }

      // Determine status: ok if face_match == true AND GPS ok, otherwise pending
      const status = faceMatched && gpsValid ? "ok" : "pending";

      const punch = await storage.createPunch({
        userId,
        type,
        latitude,
        longitude,
        gpsAccuracy,
        faceMatchScore,
        faceMatched,
        gpsValid,
        status,
      });

      await storage.createAuditLog({
        userId,
        action: "punch_register",
        details: `Ponto ${type} registrado - Status: ${status}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json(punch);
    } catch (error) {
      console.error("Punch error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/punches", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const period = (req.query.period as "all" | "week" | "month") || "all";
      const punches = await storage.getPunchesByUser(req.user!.id, period);
      res.json(punches);
    } catch (error) {
      console.error("Get punches error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/punches/last", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const punch = await storage.getLastPunchByUser(req.user!.id);
      if (!punch) {
        return res.status(404).json({ message: "Nenhum ponto encontrado" });
      }
      res.json(punch);
    } catch (error) {
      console.error("Get last punch error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/punches/pending", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const punches = await storage.getPendingPunchesByUser(req.user!.id);
      res.json(punches);
    } catch (error) {
      console.error("Get pending punches error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Justification Routes
  app.post("/api/justifications", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = insertJustificationSchema.safeParse({
        ...req.body,
        userId: req.user!.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const justification = await storage.createJustification(parsed.data);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "justification_submit",
        details: `Justificativa enviada para ponto ${parsed.data.punchId}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json(justification);
    } catch (error) {
      console.error("Create justification error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/justifications", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const justifications = await storage.getJustificationsByUser(req.user!.id);
      res.json(justifications);
    } catch (error) {
      console.error("Get justifications error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin middleware
  const adminMiddleware = async (req: AuthRequest, res: any, next: any) => {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "manager")) {
      return res.status(403).json({ message: "Acesso restrito a administradores" });
    }
    next();
  };

  // Admin Routes - Statistics
  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin Routes - User Management
  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password, faceEmbedding, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/admin/users", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const existingUser = await storage.getUserByUsername(parsed.data.username);
      if (existingUser) {
        return res.status(409).json({ message: "Usuário já existe" });
      }

      const hashedPassword = await hashPassword(parsed.data.password);
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "user_create",
        details: `Usuário ${user.username} criado`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const { password: _, faceEmbedding: __, ...userWithoutSensitive } = user;
      res.status(201).json(userWithoutSensitive);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      const parsed = adminUpdateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { username, name, email, department, role, password } = parsed.data;

      const updateData: any = {};
      if (username) updateData.username = username;
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (department !== undefined) updateData.department = department;
      if (role) updateData.role = role;
      if (password) updateData.password = await hashPassword(password);

      // Require at least one field to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo para atualizar" });
      }

      const user = await storage.updateUser(id, updateData);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "user_update",
        details: `Usuário ${user.username} atualizado`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const { password: _, faceEmbedding: __, ...userWithoutSensitive } = user;
      res.json(userWithoutSensitive);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (id === req.user!.id) {
        return res.status(400).json({ message: "Não é possível excluir seu próprio usuário" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      await storage.deleteUser(id);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "user_delete",
        details: `Usuário ${user.username} excluído`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin Routes - Justification Review
  app.get("/api/admin/justifications", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const justifications = await storage.getAllPendingJustifications();
      res.json(justifications);
    } catch (error) {
      console.error("Get pending justifications error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/admin/justifications/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      const parsed = reviewJustificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
      }

      const { status } = parsed.data;

      const justification = await storage.getJustification(id);
      if (!justification) {
        return res.status(404).json({ message: "Justificativa não encontrada" });
      }

      // Idempotency check - prevent double review
      if (justification.status !== "pending") {
        return res.status(400).json({ message: "Justificativa já foi analisada" });
      }

      const updated = await storage.updateJustification(id, status, req.user!.id);

      // If approved, update punch status to "ok"
      if (status === "approved") {
        await storage.updatePunchStatus(justification.punchId, "ok");
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "justification_review",
        details: `Justificativa ${id} ${status === "approved" ? "aprovada" : "rejeitada"}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(updated);
    } catch (error) {
      console.error("Review justification error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin Routes - All Punches
  app.get("/api/admin/punches", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const period = (req.query.period as "all" | "week" | "month") || "all";
      const punches = await storage.getAllPunches(period);
      res.json(punches);
    } catch (error) {
      console.error("Get all punches error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Export Routes - CSV
  app.get("/api/export/punches", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const period = (req.query.period as "all" | "week" | "month") || "month";
      const isAdmin = req.user!.role === "admin" || req.user!.role === "manager";
      const allUsers = req.query.all === "true" && isAdmin;

      let punchesData;
      if (allUsers) {
        punchesData = await storage.getAllPunches(period);
      } else {
        punchesData = await storage.getPunchesByUser(req.user!.id, period);
      }

      // Get user data for names
      const allUsersData = await storage.getAllUsers();
      const userMap = new Map(allUsersData.map(u => [u.id, u.name]));

      // Generate CSV
      const headers = ["Data", "Hora", "Tipo", "Status", "Face Match", "GPS Valido", "Latitude", "Longitude", "Usuario"];
      const rows = punchesData.map(punch => {
        const date = new Date(punch.timestamp);
        return [
          date.toLocaleDateString("pt-BR"),
          date.toLocaleTimeString("pt-BR"),
          punch.type === "entry" ? "Entrada" : "Saída",
          punch.status === "ok" ? "OK" : "Pendente",
          punch.faceMatched ? "Sim" : "Não",
          punch.gpsValid ? "Sim" : "Não",
          punch.latitude?.toFixed(6) || "",
          punch.longitude?.toFixed(6) || "",
          userMap.get(punch.userId) || "Desconhecido"
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "export_punches",
        details: `Exportação de ${punchesData.length} registros`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=pontos_${new Date().toISOString().split("T")[0]}.csv`);
      res.send("\uFEFF" + csv); // BOM for Excel UTF-8
    } catch (error) {
      console.error("Export punches error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  return httpServer;
}
