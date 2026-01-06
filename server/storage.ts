import { db } from "./db";
import { 
  users, songs, sessions, sessionDances,
  type User, type InsertUser,
  type Song, type InsertSong, type CreateSongRequest, type UpdateSongRequest,
  type Session, type InsertSession, type CreateSessionRequest, type UpdateSessionRequest, type SessionResponse,
  type StatsResponse
} from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(): Promise<User>;
  updateUser(user: Partial<InsertUser>): Promise<User>;
  deleteData(type: 'sessions' | 'songs' | 'all'): Promise<void>;

  // Songs
  getSongs(): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: CreateSongRequest): Promise<Song>;
  updateSong(id: number, song: UpdateSongRequest): Promise<Song>;
  deleteSong(id: number): Promise<void>;

  // Sessions
  getSessions(): Promise<SessionResponse[]>;
  getSession(id: number): Promise<SessionResponse | undefined>;
  createSession(session: CreateSessionRequest): Promise<SessionResponse>;
  updateSession(id: number, session: UpdateSessionRequest): Promise<SessionResponse>;
  deleteSession(id: number): Promise<void>;

  // Stats
  getStats(): Promise<StatsResponse>;
}

export class DatabaseStorage implements IStorage {
  // --- User ---
  async getUser(): Promise<User> {
    const [user] = await db.select().from(users).limit(1);
    if (user) return user;
    // Create default user if none exists
    const [newUser] = await db.insert(users).values({
      firstName: "Dancer",
      lastName: "",
      location: ""
    }).returning();
    return newUser;
  }

  async updateUser(updates: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser();
    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();
    return updated;
  }

  async deleteData(type: 'sessions' | 'songs' | 'all'): Promise<void> {
    if (type === 'sessions' || type === 'all') {
      await db.delete(sessionDances);
      await db.delete(sessions);
    }
    if (type === 'songs' || type === 'all') {
      // Must delete session linkages first if strictly deleting songs, 
      // but usually we might want to cascade or keep history.
      // Requirement says "removing it’s total count from the overall total count", 
      // so deleting the song and its session records implies deleting from session_dances too.
      await db.delete(sessionDances); 
      await db.delete(songs);
    }
  }

  // --- Songs ---
  async getSongs(): Promise<Song[]> {
    return await db.select().from(songs).orderBy(desc(songs.id));
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async createSong(song: CreateSongRequest): Promise<Song> {
    // Generate 6 digit random ID
    const publicId = Math.floor(100000 + Math.random() * 900000).toString();
    const [newSong] = await db.insert(songs).values({ ...song, publicId }).returning();
    return newSong;
  }

  async updateSong(id: number, updates: UpdateSongRequest): Promise<Song> {
    const [updated] = await db.update(songs)
      .set(updates)
      .where(eq(songs.id, id))
      .returning();
    return updated;
  }

  async deleteSong(id: number): Promise<void> {
    await db.delete(sessionDances).where(eq(sessionDances.songId, id));
    await db.delete(songs).where(eq(songs.id, id));
  }

  // --- Sessions ---
  async getSessions(): Promise<SessionResponse[]> {
    const allSessions = await db.select().from(sessions).orderBy(desc(sessions.date));
    
    // Fetch dances for each session
    const results: SessionResponse[] = [];
    for (const s of allSessions) {
      const dances = await db
        .select({
          id: songs.id,
          publicId: songs.publicId,
          danceName: songs.danceName,
          songName: songs.songName,
          rating: songs.rating
        })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .where(eq(sessionDances.sessionId, s.id));
      
      results.push({ ...s, dances });
    }
    return results;
  }

  async getSession(id: number): Promise<SessionResponse | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!session) return undefined;

    const dances = await db
      .select({
        id: songs.id,
        publicId: songs.publicId,
        danceName: songs.danceName,
        songName: songs.songName,
        rating: songs.rating
      })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .where(eq(sessionDances.sessionId, session.id));

    return { ...session, dances };
  }

  async createSession(req: CreateSessionRequest): Promise<SessionResponse> {
    const { danceIds, ...sessionData } = req;
    const [session] = await db.insert(sessions).values(sessionData).returning();
    
    if (danceIds && danceIds.length > 0) {
      await db.insert(sessionDances).values(
        danceIds.map(songId => ({ sessionId: session.id, songId }))
      );
    }
    
    return this.getSession(session.id) as Promise<SessionResponse>;
  }

  async updateSession(id: number, req: UpdateSessionRequest): Promise<SessionResponse> {
    const { danceIds, ...sessionData } = req;
    
    if (Object.keys(sessionData).length > 0) {
      await db.update(sessions).set(sessionData).where(eq(sessions.id, id));
    }

    if (danceIds) {
      // Replace existing dances
      await db.delete(sessionDances).where(eq(sessionDances.sessionId, id));
      if (danceIds.length > 0) {
        await db.insert(sessionDances).values(
          danceIds.map(songId => ({ sessionId: id, songId }))
        );
      }
    }

    return this.getSession(id) as Promise<SessionResponse>;
  }

  async deleteSession(id: number): Promise<void> {
    await db.delete(sessionDances).where(eq(sessionDances.sessionId, id));
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  // --- Stats ---
  async getStats(): Promise<StatsResponse> {
    // Total Dances (count of records in session_dances)
    const [totalDancesResult] = await db.select({ count: sql<number>`count(*)` }).from(sessionDances);
    const totalDances = Number(totalDancesResult?.count || 0);

    // Total Days Dancing (count of unique dates in sessions)
    const [totalDaysResult] = await db.select({ count: sql<number>`count(distinct ${sessions.date})` }).from(sessions);
    const totalDaysDancing = Number(totalDaysResult?.count || 0);

    // Unique Locations
    const [uniqueLocationsResult] = await db.select({ count: sql<number>`count(distinct ${sessions.location})` }).from(sessions);
    const uniqueLocations = Number(uniqueLocationsResult?.count || 0);

    // Most Frequent Location
    const [mostFreqLoc] = await db.select({ 
      location: sessions.location, 
      count: sql<number>`count(*)` 
    })
    .from(sessions)
    .groupBy(sessions.location)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

    // Most Frequent Dance
    const [mostFreqDance] = await db.select({
      danceName: songs.danceName,
      count: sql<number>`count(*)`
    })
    .from(sessionDances)
    .innerJoin(songs, eq(sessionDances.songId, songs.id))
    .groupBy(songs.danceName)
    .orderBy(desc(sql`count(*)`))
    .limit(1);
    
    // Longest Streak
    // Complex to calculate in SQL for MVP, doing in-memory for simplicity given dataset size
    const allSessionDates = await db.select({ date: sessions.date }).from(sessions).orderBy(sessions.date);
    let longestStreak = 0;
    let currentStreak = 0;
    
    if (allSessionDates.length > 0) {
      // Normalize dates to midnight strings to handle multiple sessions per day
      const dates = Array.from(new Set(allSessionDates.map(s => s.date.toISOString().split('T')[0]))).sort();
      
      if (dates.length > 0) {
        currentStreak = 1;
        longestStreak = 1;
        
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i-1]);
          const curr = new Date(dates[i]);
          const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
          
          if (diffDays === 1) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
          if (currentStreak > longestStreak) longestStreak = currentStreak;
        }
      }
    }

    return {
      totalDances,
      longestStreak,
      totalDaysDancing,
      uniqueLocations,
      mostFrequentLocation: mostFreqLoc?.location || "N/A",
      mostFrequentDance: mostFreqDance?.danceName || "N/A",
    };
  }
}

export const storage = new DatabaseStorage();
