import { supabaseAdmin } from "./supabase";
import { storage } from "./storage";
import type { Request, Response, NextFunction } from "express";

// Validates the Supabase JWT from the Authorization header, then resolves the
// local users-table row via supabase_auth_id and attaches it as req.user.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const dbUser = await storage.getUserBySupabaseAuthId(data.user.id);
    if (!dbUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      location: dbUser.location,
    };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}
