import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema, 
  enrollFaceSchema, 
  punchFaceMatchSchema,
  insertJustificationSchema 
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

  return httpServer;
}
