import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerSchema, loginSchema, updateProfileSchema } from "@shared/schema";
import { z } from "zod";
import { passport, requireAuth } from "./auth";
import bcrypt from "bcryptjs";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string | null;
      firstName: string;
      lastName: string;
      location: string;
    }
  }
}

// Spotify token cache
let spotifyTokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (spotifyTokenCache && Date.now() < spotifyTokenCache.expiresAt) {
    return spotifyTokenCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get Spotify token");

  const data = await res.json();
  spotifyTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return spotifyTokenCache.token;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Auth Routes ---
  app.post("/api/register", async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        res.status(409).json({ message: "Username already taken" });
        return;
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await storage.createAuthUser(input.username, passwordHash, input.firstName);
      
      req.login(user, (err) => {
        if (err) {
          res.status(500).json({ message: "Login after registration failed" });
          return;
        }
        res.status(201).json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          location: user.location,
        });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0]?.message || "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        res.status(401).json({ message: info?.message || "Invalid credentials" });
        return;
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          location: user.location,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ message: "Logout failed" });
        return;
      }
      res.json({ success: true });
    });
  });

  app.get("/api/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    res.json({
      id: req.user.id,
      username: req.user.username,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      location: req.user.location,
    });
  });

  // --- Spotify Search ---
  app.get("/api/spotify/search", requireAuth, async (req, res) => {
    const q = req.query.q as string;
    if (!q) {
      res.json([]);
      return;
    }
    try {
      const token = await getSpotifyToken();
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=8`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!searchRes.ok) throw new Error("Spotify search failed");
      const data = await searchRes.json();
      const tracks = (data.tracks?.items || []).map((item: any) => ({
        name: item.name,
        artist: item.artists.map((a: any) => a.name).join(", "),
        albumArt: item.album?.images?.[2]?.url || item.album?.images?.[0]?.url || null,
      }));
      res.json(tracks);
    } catch (err: any) {
      if (err.message === "Spotify not configured") {
        res.status(503).json({ message: "Spotify not configured" });
        return;
      }
      res.status(500).json({ message: "Spotify search failed" });
    }
  });

  // --- Location Routes ---
  app.get("/api/locations", requireAuth, async (req, res) => {
    const locs = await storage.getLocations(req.user!.id);
    res.json(locs);
  });

  app.post("/api/locations", requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ message: "Name is required" });
      return;
    }
    const loc = await storage.createLocation(req.user!.id, name.trim());
    res.status(201).json(loc);
  });

  app.delete("/api/locations/:id", requireAuth, async (req, res) => {
    await storage.deleteLocation(Number(req.params.id), req.user!.id);
    res.status(204).send();
  });

  // --- Profile Routes ---
  app.get(api.profile.get.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.user!.id);
    res.json(user);
  });

  app.put(api.profile.update.path, requireAuth, async (req, res) => {
    try {
      const input = updateProfileSchema.parse(req.body);
      const user = await storage.updateUser(req.user!.id, input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0]?.message || err.message });
        return;
      }
      throw err;
    }
  });

  app.post(api.profile.deleteData.path, requireAuth, async (req, res) => {
    const { type } = req.body;
    await storage.deleteData(req.user!.id, type);
    res.json({ success: true, message: `Deleted ${type} data` });
  });

  // --- Song Routes ---
  app.get(api.songs.list.path, requireAuth, async (req, res) => {
    const songs = await storage.getSongs(req.user!.id);
    res.json(songs);
  });

  app.post(api.songs.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.songs.create.input.parse(req.body);
      const song = await storage.createSong(req.user!.id, input);
      res.status(201).json(song);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0]?.message || err.message });
        return;
      }
      throw err;
    }
  });

  app.put(api.songs.update.path, requireAuth, async (req, res) => {
    try {
      const input = api.songs.update.input.parse(req.body);
      const song = await storage.updateSong(Number(req.params.id), req.user!.id, input);
      if (!song) {
        res.status(404).json({ message: "Song not found" });
        return;
      }
      res.json(song);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0]?.message || err.message });
        return;
      }
      throw err;
    }
  });

  app.delete(api.songs.delete.path, requireAuth, async (req, res) => {
    await storage.deleteSong(Number(req.params.id), req.user!.id);
    res.status(204).send();
  });

  // --- Session Routes ---
  app.get(api.sessions.list.path, requireAuth, async (req, res) => {
    const sessions = await storage.getSessions(req.user!.id);
    res.json(sessions);
  });

  app.get(api.sessions.get.path, requireAuth, async (req, res) => {
    const session = await storage.getSession(Number(req.params.id), req.user!.id);
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }
    res.json(session);
  });

  app.post(api.sessions.create.path, requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.date === "string") body.date = new Date(body.date);

      const input = api.sessions.create.input.parse(body);
      const session = await storage.createSession(req.user!.id, input);
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0]?.message || err.message });
        return;
      }
      throw err;
    }
  });

  app.put(api.sessions.update.path, requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.date === "string") body.date = new Date(body.date);

      const input = api.sessions.update.input.parse(body);
      const session = await storage.updateSession(Number(req.params.id), req.user!.id, input);
      if (!session) {
        res.status(404).json({ message: "Session not found" });
        return;
      }
      res.json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0]?.message || err.message });
        return;
      }
      throw err;
    }
  });

  app.delete(api.sessions.delete.path, requireAuth, async (req, res) => {
    await storage.deleteSession(Number(req.params.id), req.user!.id);
    res.status(204).send();
  });

  // --- Stats Route ---
  app.get(api.stats.get.path, requireAuth, async (req, res) => {
    const stats = await storage.getStats(req.user!.id);
    res.json(stats);
  });

  // --- Buddy Routes ---
  app.get("/api/users/search", requireAuth, async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) { res.json([]); return; }
    const results = await storage.searchUsers(q, req.user!.id);
    res.json(results);
  });

  app.get("/api/buddies", requireAuth, async (req, res) => {
    const list = await storage.getBuddies(req.user!.id);
    res.json(list);
  });

  app.get("/api/buddies/requests", requireAuth, async (req, res) => {
    const pending = await storage.getPendingRequests(req.user!.id);
    res.json(pending);
  });

  app.post("/api/buddies/request", requireAuth, async (req, res) => {
    const { recipientId } = req.body;
    if (!recipientId || typeof recipientId !== "number") {
      res.status(400).json({ message: "recipientId required" }); return;
    }
    try {
      await storage.sendBuddyRequest(req.user!.id, recipientId);
      res.status(201).json({ ok: true });
    } catch (err: any) {
      res.status(409).json({ message: err.message || "Already requested" });
    }
  });

  app.put("/api/buddies/request/:id", requireAuth, async (req, res) => {
    const { action } = req.body;
    if (action !== "accept" && action !== "decline") {
      res.status(400).json({ message: "action must be accept or decline" }); return;
    }
    await storage.respondToBuddyRequest(Number(req.params.id), req.user!.id, action);
    res.json({ ok: true });
  });

  app.delete("/api/buddies/:userId", requireAuth, async (req, res) => {
    await storage.removeBuddy(req.user!.id, Number(req.params.userId));
    res.status(204).send();
  });

  app.get("/api/buddies/challenges", requireAuth, async (req, res) => {
    const list = await storage.getChallenges(req.user!.id);
    res.json(list);
  });

  app.post("/api/buddies/challenge", requireAuth, async (req, res) => {
    const { challengedId, durationDays } = req.body;
    if (!challengedId || !durationDays) {
      res.status(400).json({ message: "challengedId and durationDays required" }); return;
    }
    await storage.sendChallenge(req.user!.id, challengedId, durationDays);
    res.status(201).json({ ok: true });
  });

  return httpServer;
}
