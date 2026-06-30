import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { api } from "@shared/routes";
import { registerSchema, loginSchema, updateProfileSchema, users, danceOffs, danceOffParticipants } from "@shared/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "./auth";
import { supabaseAdmin } from "./supabase";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string | null;
      firstName: string;
      lastName: string;
      location: string;
    }
    interface Request {
      user?: User;
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

  // --- Auth Routes (Supabase) ---
  app.post("/api/register", async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);

      const existingUsername = await storage.getUserByUsername(input.username);
      if (existingUsername) {
        res.status(409).json({ message: "Username already taken" });
        return;
      }

      // Create the Supabase auth user (email pre-confirmed so they can sign in immediately)
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { username: input.username },
      });
      if (createErr || !created?.user) {
        const msg = createErr?.message || "Registration failed";
        const status = /already|registered|exists/i.test(msg) ? 409 : 400;
        res.status(status).json({ message: status === 409 ? "An account with that email already exists" : msg });
        return;
      }

      try {
        const user = await storage.createAuthUser({
          username: input.username,
          email: input.email,
          supabaseAuthId: created.user.id,
          firstName: input.firstName,
          lastName: input.lastName,
        });
        res.status(201).json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          location: user.location,
        });
      } catch (dbErr) {
        // Roll back the orphaned Supabase user if the local row could not be created
        await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
        throw dbErr;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0]?.message || "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.post("/api/login", async (req, res) => {
    let input;
    try {
      input = loginSchema.parse(req.body);
    } catch {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    // Resolve email by username server-side to avoid exposing emails
    const dbUser = await storage.getUserByUsername(input.username);
    if (!dbUser || !dbUser.email) {
      res.status(401).json({ message: "Invalid username or password" });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: dbUser.email,
      password: input.password,
    });
    if (error || !data?.session) {
      res.status(401).json({ message: "Invalid username or password" });
      return;
    }

    res.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        location: dbUser.location,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  });

  app.get("/api/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.user!.id);
    res.json({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      location: user.location,
      phoneNumber: user.phoneNumber ?? undefined,
      avatar: user.avatar ?? undefined,
    });
  });

  // --- Phone & Avatar ---
  app.put("/api/profile/avatar", requireAuth, async (req, res) => {
    const { avatar } = req.body;
    if (avatar !== null && typeof avatar !== "string") {
      res.status(400).json({ message: "Invalid avatar" }); return;
    }
    if (avatar && avatar.length > 200000) {
      res.status(413).json({ message: "Image too large. Please use a smaller image." }); return;
    }
    await storage.updateAvatar(req.user!.id, avatar);
    res.json({ ok: true });
  });

  app.put("/api/profile/phone", requireAuth, async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber || typeof phoneNumber !== "string") {
      res.status(400).json({ message: "phoneNumber required" }); return;
    }
    await storage.updatePhone(req.user!.id, phoneNumber.trim());
    res.json({ ok: true });
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

  app.post("/api/songs/:id/favorite", requireAuth, async (req, res) => {
    try {
      const song = await storage.toggleFavorite(Number(req.params.id), req.user!.id);
      res.json(song);
    } catch {
      res.status(404).json({ message: "Song not found" });
    }
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

  // --- Style Distribution ---
  app.get("/api/stats/style-distribution", requireAuth, async (req, res) => {
    const dist = await storage.getStyleDistribution(req.user!.id);
    res.json(dist);
  });

  // --- Homepage Stats Preferences ---
  app.get("/api/profile/homepage-stats", requireAuth, async (req, res) => {
    const stats = await storage.getHomepageStats(req.user!.id);
    res.json({ stats });
  });

  app.put("/api/profile/homepage-stats", requireAuth, async (req, res) => {
    const { stats } = req.body;
    if (!Array.isArray(stats)) { res.status(400).json({ message: "stats must be an array" }); return; }
    await storage.setHomepageStats(req.user!.id, stats);
    res.json({ ok: true });
  });

  // --- Dance-Off Routes ---
  app.get("/api/danceoffs", requireAuth, async (req, res) => {
    const list = await storage.getDanceOffs(req.user!.id);
    res.json(list);
  });

  app.post("/api/danceoffs", requireAuth, async (req, res) => {
    const { type, title, durationHours, challengedId } = req.body;
    if (!type || !durationHours) { res.status(400).json({ message: "type and durationHours required" }); return; }
    if (durationHours < 1 || durationHours > 12) { res.status(400).json({ message: "durationHours must be 1-12" }); return; }
    if (type === 'h2h' && !challengedId) { res.status(400).json({ message: "challengedId required for h2h" }); return; }
    try {
      const result = await storage.createDanceOff(req.user!.id, type, title || '', durationHours, challengedId);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/danceoffs/join", requireAuth, async (req, res) => {
    const { joinCode } = req.body;
    if (!joinCode) { res.status(400).json({ message: "joinCode required" }); return; }
    try {
      await storage.joinDanceOff(req.user!.id, joinCode);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/danceoffs/results", requireAuth, async (req, res) => {
    await storage.clearDanceOffResults(req.user!.id);
    res.json({ ok: true });
  });

  app.delete("/api/danceoffs/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDanceOffResult(Number(req.params.id), req.user!.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(403).json({ message: err.message });
    }
  });

  // --- Achievement Routes ---
  app.get("/api/achievements", requireAuth, async (req, res) => {
    const statuses = await storage.computeAchievements(req.user!.id);
    res.json(statuses);
  });

  app.get("/api/achievements/unseen", requireAuth, async (req, res) => {
    const statuses = await storage.computeAchievements(req.user!.id);
    const unseen = statuses.filter(s => s.earned && !s.seen);
    res.json({ count: unseen.length, ids: unseen.map(s => s.id) });
  });

  app.put("/api/achievements/seen", requireAuth, async (req, res) => {
    await storage.markAchievementsSeen(req.user!.id);
    res.json({ ok: true });
  });

  app.post("/api/dev/grant-all-achievements", requireAuth, async (req, res) => {
    await storage.grantAllAchievements(req.user!.id);
    res.json({ ok: true });
  });

  app.post("/api/dev/seed", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const seedSongs = [
      { danceName: "Boot Scootin' Boogie", songName: "Boot Scootin' Boogie", artist: "Brooks & Dunn",   rating: 5, style: "LINE" as const },
      { danceName: "Watermelon Crawl",     songName: "Watermelon Crawl",     artist: "Tracy Byrd",      rating: 4, style: "LINE" as const },
      { danceName: "Tush Push",            songName: "Tush Push",            artist: "Billy Ray Cyrus", rating: 5, style: "LINE" as const },
      { danceName: "Country Swing",        songName: "I Got You",            artist: "Erin Kinsey",     rating: 5, style: "CSW"  as const },
      { danceName: "West Coast Swing",     songName: "Save a Horse",         artist: "Big & Rich",      rating: 4, style: "WCS"  as const },
      { danceName: "Two-Step",             songName: "Friends in Low Places",artist: "Garth Brooks",    rating: 5, style: "TWO"  as const },
    ];
    const created = await Promise.all(seedSongs.map(s => storage.createSong(userId, s)));
    const [boot, watermelon, tush, cswing, wcs, two] = created.map(s => s.id);
    const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    await storage.createSession(userId, { date: daysAgo(0), location: "Cowboys Orlando", danceIds: [boot, boot, watermelon, cswing] });
    await storage.createSession(userId, { date: daysAgo(1), location: "The Barn",         danceIds: [boot, tush, wcs] });
    await storage.createSession(userId, { date: daysAgo(3), location: "Cowboys Orlando", danceIds: [watermelon, two, cswing] });
    await storage.createSession(userId, { date: daysAgo(5), location: "The Barn",         danceIds: [boot, tush] });

    // Create (or reuse) a mock opponent user, then insert a completed challenge
    let challengeCreated = false;
    try {
      let [opponent] = await db.select().from(users).where(eq(users.username, 'test_opponent'));
      if (!opponent) {
        [opponent] = await db.insert(users).values({
          username: 'test_opponent',
          firstName: 'Jesse', lastName: 'Maverick', location: 'Nashville, TN',
        }).returning();
      }
      const challengeStart = daysAgo(3);
      const [challenge] = await db.insert(danceOffs).values({
        creatorId: userId, type: 'h2h', title: 'Dance Duel',
        durationHours: 24, startedAt: challengeStart,
        joinCode: null, status: 'completed', challengedId: opponent.id,
      }).returning();
      await db.insert(danceOffParticipants).values([
        { danceOffId: challenge.id, userId: userId,      finalDanceCount: 7 },
        { danceOffId: challenge.id, userId: opponent.id, finalDanceCount: 9 },
      ]);
      challengeCreated = true;
    } catch (err) {
      console.error('[seed] challenge creation failed:', err);
    }

    res.json({ ok: true, songsCreated: created.length, sessionsCreated: 4, challengeCreated });
  });

  return httpServer;
}
