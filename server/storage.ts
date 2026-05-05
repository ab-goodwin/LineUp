import { db } from "./db";
import { 
  users, songs, sessions, sessionDances, locations, buddies, streakChallenges,
  type User, type InsertUser,
  type Song, type InsertSong, type CreateSongRequest, type UpdateSongRequest,
  type Session, type InsertSession, type CreateSessionRequest, type UpdateSessionRequest, type SessionResponse,
  type StatsResponse, type Location
} from "@shared/schema";
import { eq, desc, sql, and, or, ilike, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Auth
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createAuthUser(username: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User>;

  // User Profile (scoped to userId)
  getUser(userId: number): Promise<User>;
  updateUser(userId: number, updates: { firstName?: string; lastName?: string; location?: string }): Promise<User>;
  deleteData(userId: number, type: 'sessions' | 'songs' | 'all'): Promise<void>;

  // Locations (scoped to userId)
  getLocations(userId: number): Promise<Location[]>;
  createLocation(userId: number, name: string): Promise<Location>;
  deleteLocation(id: number, userId: number): Promise<void>;

  // Songs (scoped to userId)
  getSongs(userId: number): Promise<Song[]>;
  getSong(id: number, userId: number): Promise<Song | undefined>;
  createSong(userId: number, song: CreateSongRequest): Promise<Song>;
  updateSong(id: number, userId: number, song: UpdateSongRequest): Promise<Song>;
  deleteSong(id: number, userId: number): Promise<void>;

  // Sessions (scoped to userId)
  getSessions(userId: number): Promise<SessionResponse[]>;
  getSession(id: number, userId: number): Promise<SessionResponse | undefined>;
  createSession(userId: number, session: CreateSessionRequest): Promise<SessionResponse>;
  updateSession(id: number, userId: number, session: UpdateSessionRequest): Promise<SessionResponse>;
  deleteSession(id: number, userId: number): Promise<void>;

  // Stats (scoped to userId)
  getStats(userId: number): Promise<StatsResponse>;

  // Buddies
  searchUsers(query: string, excludeId: number): Promise<{ id: number; username: string; firstName: string }[]>;
  getBuddies(userId: number): Promise<any[]>;
  getPendingRequests(userId: number): Promise<any[]>;
  sendBuddyRequest(requesterId: number, recipientId: number): Promise<void>;
  respondToBuddyRequest(id: number, userId: number, action: "accept" | "decline"): Promise<void>;
  removeBuddy(userId: number, buddyUserId: number): Promise<void>;
  getBuddyPublicStats(buddyUserId: number): Promise<any>;
  getCurrentStreak(userId: number): Promise<number>;

  // Challenges
  getChallenges(userId: number): Promise<any[]>;
  sendChallenge(challengerId: number, challengedId: number, durationDays: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // --- Auth ---
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createAuthUser(username: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User> {
    const [user] = await db.insert(users).values({
      username,
      passwordHash,
      firstName: firstName || "Dancer",
      lastName: lastName || "",
      location: "",
    }).returning();
    return user;
  }

  // --- User Profile ---
  async getUser(userId: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUser(userId: number, updates: { firstName?: string; lastName?: string; location?: string }): Promise<User> {
    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async deleteData(userId: number, type: 'sessions' | 'songs' | 'all'): Promise<void> {
    if (type === 'sessions' || type === 'all') {
      // Get session IDs belonging to this user
      const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
      const sessionIds = userSessions.map(s => s.id);
      if (sessionIds.length > 0) {
        for (const sid of sessionIds) {
          await db.delete(sessionDances).where(eq(sessionDances.sessionId, sid));
        }
        await db.delete(sessions).where(eq(sessions.userId, userId));
      }
    }
    if (type === 'songs' || type === 'all') {
      const userSongs = await db.select({ id: songs.id }).from(songs).where(eq(songs.userId, userId));
      const songIds = userSongs.map(s => s.id);
      if (songIds.length > 0) {
        for (const sid of songIds) {
          await db.delete(sessionDances).where(eq(sessionDances.songId, sid));
        }
        await db.delete(songs).where(eq(songs.userId, userId));
      }
    }
  }

  // --- Locations ---
  async getLocations(userId: number): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.userId, userId)).orderBy(locations.name);
  }

  async createLocation(userId: number, name: string): Promise<Location> {
    const [loc] = await db.insert(locations).values({ userId, name }).returning();
    return loc;
  }

  async deleteLocation(id: number, userId: number): Promise<void> {
    await db.delete(locations).where(and(eq(locations.id, id), eq(locations.userId, userId)));
  }

  // --- Songs ---
  async getSongs(userId: number): Promise<Song[]> {
    return await db.select().from(songs).where(eq(songs.userId, userId)).orderBy(desc(songs.id));
  }

  async getSong(id: number, userId: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(and(eq(songs.id, id), eq(songs.userId, userId)));
    return song;
  }

  async createSong(userId: number, song: CreateSongRequest): Promise<Song> {
    const publicId = Math.floor(100000 + Math.random() * 900000).toString();
    const [newSong] = await db.insert(songs).values({ ...song, userId, publicId }).returning();
    return newSong;
  }

  async updateSong(id: number, userId: number, updates: UpdateSongRequest): Promise<Song> {
    const [updated] = await db.update(songs)
      .set(updates)
      .where(and(eq(songs.id, id), eq(songs.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSong(id: number, userId: number): Promise<void> {
    await db.delete(sessionDances).where(eq(sessionDances.songId, id));
    await db.delete(songs).where(and(eq(songs.id, id), eq(songs.userId, userId)));
  }

  // --- Sessions ---
  async getSessions(userId: number): Promise<SessionResponse[]> {
    const allSessions = await db.select().from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.date));

    const results: SessionResponse[] = [];
    for (const s of allSessions) {
      const dances = await db
        .select({
          id: songs.id,
          userId: songs.userId,
          publicId: songs.publicId,
          danceName: songs.danceName,
          songName: songs.songName,
          artist: songs.artist,
          rating: songs.rating
        })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .where(eq(sessionDances.sessionId, s.id));
      
      results.push({ ...s, dances });
    }
    return results;
  }

  async getSession(id: number, userId: number): Promise<SessionResponse | undefined> {
    const [session] = await db.select().from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    if (!session) return undefined;

    const dances = await db
      .select({
        id: songs.id,
        userId: songs.userId,
        publicId: songs.publicId,
        danceName: songs.danceName,
        songName: songs.songName,
        artist: songs.artist,
        rating: songs.rating
      })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .where(eq(sessionDances.sessionId, session.id));

    return { ...session, dances };
  }

  async createSession(userId: number, req: CreateSessionRequest): Promise<SessionResponse> {
    const { danceIds, ...sessionData } = req;
    const [session] = await db.insert(sessions).values({ ...sessionData, userId }).returning();
    
    if (danceIds && danceIds.length > 0) {
      await db.insert(sessionDances).values(
        danceIds.map(songId => ({ sessionId: session.id, songId }))
      );
    }
    
    return this.getSession(session.id, userId) as Promise<SessionResponse>;
  }

  async updateSession(id: number, userId: number, req: UpdateSessionRequest): Promise<SessionResponse> {
    const { danceIds, ...sessionData } = req;
    
    if (Object.keys(sessionData).length > 0) {
      await db.update(sessions).set(sessionData).where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    }

    if (danceIds) {
      await db.delete(sessionDances).where(eq(sessionDances.sessionId, id));
      if (danceIds.length > 0) {
        await db.insert(sessionDances).values(
          danceIds.map(songId => ({ sessionId: id, songId }))
        );
      }
    }

    return this.getSession(id, userId) as Promise<SessionResponse>;
  }

  async deleteSession(id: number, userId: number): Promise<void> {
    await db.delete(sessionDances).where(eq(sessionDances.sessionId, id));
    await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
  }

  // --- Stats ---
  async getStats(userId: number): Promise<StatsResponse> {
    const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
    const sessionIds = userSessions.map(s => s.id);

    let totalDances = 0;
    let totalDaysDancing = 0;
    let uniqueLocations = 0;
    let mostFreqLoc: { location: string; count: number } | undefined;
    let mostFreqDance: { danceName: string; count: number } | undefined;
    let longestStreak = 0;

    if (sessionIds.length > 0) {
      const [totalDancesResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .where(sql`${sessionDances.sessionId} = ANY(${sql`ARRAY[${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
      totalDances = Number(totalDancesResult?.count || 0);

      const [totalDaysResult] = await db.select({ count: sql<number>`count(distinct date_trunc('day', ${sessions.date}))` })
        .from(sessions)
        .where(eq(sessions.userId, userId));
      totalDaysDancing = Number(totalDaysResult?.count || 0);

      const [uniqueLocResult] = await db.select({ count: sql<number>`count(distinct ${sessions.location})` })
        .from(sessions)
        .where(eq(sessions.userId, userId));
      uniqueLocations = Number(uniqueLocResult?.count || 0);

      const [locResult] = await db.select({
        location: sessions.location,
        count: sql<number>`count(*)`
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .groupBy(sessions.location)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
      if (locResult) mostFreqLoc = { location: locResult.location, count: Number(locResult.count) };

      const [danceResult] = await db.select({
        danceName: songs.danceName,
        count: sql<number>`count(*)`
      })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
      .where(eq(sessions.userId, userId))
      .groupBy(songs.danceName)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
      if (danceResult) mostFreqDance = { danceName: danceResult.danceName, count: Number(danceResult.count) };

      const allSessionDates = await db.select({ date: sessions.date })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(sessions.date);

      if (allSessionDates.length > 0) {
        const dates = Array.from(new Set(allSessionDates.map(s => s.date.toISOString().split('T')[0]))).sort();
        if (dates.length > 0) {
          let currentStreak = 1;
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
    }

    return {
      totalDances,
      longestStreak,
      totalDaysDancing,
      uniqueLocations,
      mostFrequentLocation: mostFreqLoc?.location || "N/A",
      mostFrequentLocationCount: mostFreqLoc?.count || 0,
      mostFrequentDance: mostFreqDance?.danceName || "N/A",
      mostFrequentDanceCount: mostFreqDance?.count || 0,
    };
  }
  // --- Buddies ---
  async searchUsers(query: string, excludeId: number): Promise<{ id: number; username: string; firstName: string }[]> {
    const results = await db
      .select({ id: users.id, username: users.username, firstName: users.firstName })
      .from(users)
      .where(and(
        ilike(users.username, `%${query}%`),
        ne(users.id, excludeId)
      ))
      .limit(10);
    return results.map(r => ({ id: r.id, username: r.username || "", firstName: r.firstName }));
  }

  async getCurrentStreak(userId: number): Promise<number> {
    const allDates = await db
      .select({ date: sessions.date })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.date));
    if (allDates.length === 0) return 0;
    const dates = Array.from(new Set(allDates.map(s => s.date.toISOString().split('T')[0]))).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 3600 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }

  async getBuddyPublicStats(buddyUserId: number): Promise<any> {
    const user = await this.getUserById(buddyUserId);
    if (!user) return null;
    const stats = await this.getStats(buddyUserId);
    const currentStreak = await this.getCurrentStreak(buddyUserId);
    return {
      userId: user.id,
      username: user.username || "",
      firstName: user.firstName,
      totalDances: stats.totalDances,
      longestStreak: stats.longestStreak,
      totalDaysDancing: stats.totalDaysDancing,
      currentStreak,
      favoriteDance: stats.mostFrequentDance,
    };
  }

  async getBuddies(userId: number): Promise<any[]> {
    const accepted = await db
      .select()
      .from(buddies)
      .where(and(
        or(eq(buddies.requesterId, userId), eq(buddies.recipientId, userId)),
        eq(buddies.status, "accepted")
      ));
    const buddyStats = await Promise.all(
      accepted.map(b => {
        const buddyId = b.requesterId === userId ? b.recipientId : b.requesterId;
        return this.getBuddyPublicStats(buddyId);
      })
    );
    return buddyStats.filter(Boolean);
  }

  async getPendingRequests(userId: number): Promise<any[]> {
    const pending = await db
      .select()
      .from(buddies)
      .where(and(eq(buddies.recipientId, userId), eq(buddies.status, "pending")));
    const results = await Promise.all(
      pending.map(async b => {
        const requester = await this.getUserById(b.requesterId);
        if (!requester) return null;
        return {
          id: b.id,
          requesterId: b.requesterId,
          recipientId: b.recipientId,
          status: b.status,
          requesterUsername: requester.username || "",
          requesterFirstName: requester.firstName,
        };
      })
    );
    return results.filter(Boolean);
  }

  async sendBuddyRequest(requesterId: number, recipientId: number): Promise<void> {
    // Check if any relationship already exists
    const existing = await db
      .select()
      .from(buddies)
      .where(or(
        and(eq(buddies.requesterId, requesterId), eq(buddies.recipientId, recipientId)),
        and(eq(buddies.requesterId, recipientId), eq(buddies.recipientId, requesterId))
      ));
    if (existing.length > 0) throw new Error("Request already exists");
    await db.insert(buddies).values({ requesterId, recipientId, status: "pending" });
  }

  async respondToBuddyRequest(id: number, userId: number, action: "accept" | "decline"): Promise<void> {
    const newStatus = action === "accept" ? "accepted" : "declined";
    await db.update(buddies)
      .set({ status: newStatus })
      .where(and(eq(buddies.id, id), eq(buddies.recipientId, userId)));
  }

  async removeBuddy(userId: number, buddyUserId: number): Promise<void> {
    await db.delete(buddies).where(or(
      and(eq(buddies.requesterId, userId), eq(buddies.recipientId, buddyUserId)),
      and(eq(buddies.requesterId, buddyUserId), eq(buddies.recipientId, userId))
    ));
  }

  // --- Challenges ---
  async getChallenges(userId: number): Promise<any[]> {
    const challenges = await db
      .select()
      .from(streakChallenges)
      .where(or(
        eq(streakChallenges.challengerId, userId),
        eq(streakChallenges.challengedId, userId)
      ))
      .orderBy(desc(streakChallenges.createdAt));

    const results = await Promise.all(
      challenges.map(async c => {
        const challenger = await this.getUserById(c.challengerId);
        const challenged = await this.getUserById(c.challengedId);
        const challengerStreak = await this.getCurrentStreak(c.challengerId);
        const challengedStreak = await this.getCurrentStreak(c.challengedId);
        return {
          id: c.id,
          challengerId: c.challengerId,
          challengedId: c.challengedId,
          startDate: c.startDate,
          durationDays: c.durationDays,
          status: c.status,
          challengerUsername: challenger?.username || "",
          challengerFirstName: challenger?.firstName || "",
          challengedUsername: challenged?.username || "",
          challengedFirstName: challenged?.firstName || "",
          challengerStreak,
          challengedStreak,
        };
      })
    );
    return results;
  }

  async sendChallenge(challengerId: number, challengedId: number, durationDays: number): Promise<void> {
    await db.insert(streakChallenges).values({
      challengerId,
      challengedId,
      durationDays,
      status: "active",
      startDate: new Date(),
    });
  }
}

export const storage = new DatabaseStorage();
