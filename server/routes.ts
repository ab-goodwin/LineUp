import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // --- Profile Routes ---
  app.get(api.profile.get.path, async (_req, res) => {
    const user = await storage.getUser();
    res.json(user);
  });

  app.put(api.profile.update.path, async (req, res) => {
    try {
      const input = api.profile.update.input.parse(req.body);
      const user = await storage.updateUser(input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.message });
        return;
      }
      throw err;
    }
  });

  app.post(api.profile.deleteData.path, async (req, res) => {
    const { type } = req.body;
    await storage.deleteData(type);
    res.json({ success: true, message: `Deleted ${type} data` });
  });

  // --- Song Routes ---
  app.get(api.songs.list.path, async (_req, res) => {
    const songs = await storage.getSongs();
    res.json(songs);
  });

  app.post(api.songs.create.path, async (req, res) => {
    try {
      const input = api.songs.create.input.parse(req.body);
      const song = await storage.createSong(input);
      res.status(201).json(song);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.message });
        return;
      }
      throw err;
    }
  });

  app.put(api.songs.update.path, async (req, res) => {
    try {
      const input = api.songs.update.input.parse(req.body);
      const song = await storage.updateSong(Number(req.params.id), input);
      if (!song) {
        res.status(404).json({ message: "Song not found" });
        return;
      }
      res.json(song);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.message });
        return;
      }
      throw err;
    }
  });

  app.delete(api.songs.delete.path, async (req, res) => {
    await storage.deleteSong(Number(req.params.id));
    res.status(204).send();
  });

  // --- Session Routes ---
  app.get(api.sessions.list.path, async (_req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.get(api.sessions.get.path, async (req, res) => {
    const session = await storage.getSession(Number(req.params.id));
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }
    res.json(session);
  });

  app.post(api.sessions.create.path, async (req, res) => {
    try {
      // Coerce date string to Date object if needed, handled by zod schema usually but manual check helps
      const body = { ...req.body };
      if (typeof body.date === 'string') body.date = new Date(body.date);
      
      const input = api.sessions.create.input.parse(body);
      const session = await storage.createSession(input);
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.message });
        return;
      }
      throw err;
    }
  });

  app.put(api.sessions.update.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.date === 'string') body.date = new Date(body.date);

      const input = api.sessions.update.input.parse(body);
      const session = await storage.updateSession(Number(req.params.id), input);
      if (!session) {
        res.status(404).json({ message: "Session not found" });
        return;
      }
      res.json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.message });
        return;
      }
      throw err;
    }
  });

  app.delete(api.sessions.delete.path, async (req, res) => {
    await storage.deleteSession(Number(req.params.id));
    res.status(204).send();
  });

  // --- Stats Route ---
  app.get(api.stats.get.path, async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Seed Data
  const songs = await storage.getSongs();
  if (songs.length === 0) {
    console.log("Seeding database...");
    const s1 = await storage.createSong({ danceName: "Tush Push", songName: "Chattahoochee", rating: 5 });
    const s2 = await storage.createSong({ danceName: "Electric Slide", songName: "Electric Boogie", rating: 3 });
    const s3 = await storage.createSong({ danceName: "Copperhead Road", songName: "Copperhead Road", rating: 4 });
    const s4 = await storage.createSong({ danceName: "Watermelon Crawl", songName: "Watermelon Crawl", rating: 5 });
    const s5 = await storage.createSong({ danceName: "Good Time", songName: "Good Time", rating: 4 });
    
    // Seed a session
    await storage.createSession({
      date: new Date(),
      location: "The Barn",
      danceIds: [s1.id, s3.id, s4.id]
    });
    console.log("Seeding complete.");
  }

  return httpServer;
}
