import { db } from "./db";
import { 
  users, songs, sessions, sessionDances, locations, buddies, streakChallenges, verificationCodes,
  danceOffs, danceOffParticipants, userAchievements,
  type User, type InsertUser,
  type Song, type InsertSong, type CreateSongRequest, type UpdateSongRequest,
  type Session, type InsertSession, type CreateSessionRequest, type UpdateSessionRequest, type SessionResponse,
  type StatsResponse, type Location
} from "@shared/schema";
import { ACHIEVEMENT_DEFS, type AchievementStatus } from "@shared/achievements";
import { eq, desc, sql, and, or, ilike, ne, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

function getISOWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNum}`;
}

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
  toggleFavorite(songId: number, userId: number): Promise<Song>;

  // Sessions (scoped to userId)
  getSessions(userId: number): Promise<SessionResponse[]>;
  getSession(id: number, userId: number): Promise<SessionResponse | undefined>;
  createSession(userId: number, session: CreateSessionRequest): Promise<SessionResponse>;
  updateSession(id: number, userId: number, session: UpdateSessionRequest): Promise<SessionResponse>;
  deleteSession(id: number, userId: number): Promise<void>;

  // Stats (scoped to userId)
  getStats(userId: number): Promise<StatsResponse>;

  // Avatar & Phone
  updateAvatar(userId: number, avatar: string | null): Promise<void>;
  updatePhone(userId: number, phoneNumber: string): Promise<void>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createVerificationCode(userId: number, type: string): Promise<string>;
  verifyAndReset(phone: string, code: string, resetType: string, newValue: string): Promise<boolean>;

  // Buddies
  searchUsers(query: string, excludeId: number): Promise<{ id: number; username: string; firstName: string; avatar?: string }[]>;
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

  // Dance-Offs
  getDanceOffs(userId: number): Promise<any[]>;
  createDanceOff(creatorId: number, type: 'h2h' | 'showdown', title: string, durationHours: number, challengedId?: number): Promise<{ id: number; joinCode: string | null }>;
  joinDanceOff(userId: number, joinCode: string): Promise<void>;
  clearDanceOffResults(userId: number): Promise<void>;
  deleteDanceOffResult(id: number, userId: number): Promise<void>;

  // Style Distribution
  getStyleDistribution(userId: number): Promise<{ style: string; count: number }[]>;

  // Achievements
  computeAchievements(userId: number): Promise<AchievementStatus[]>;
  markAchievementsSeen(userId: number): Promise<void>;
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
          rating: songs.rating,
          style: songs.style,
          styleCustom: songs.styleCustom,
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
        rating: songs.rating,
        style: songs.style,
        styleCustom: songs.styleCustom,
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
    let mostFreqDance: { songName: string; danceName: string; count: number } | undefined;
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
        songName: sql<string>`COALESCE(NULLIF(${songs.songName}, ''), ${songs.danceName})`,
        danceName: songs.danceName,
        count: sql<number>`count(*)`
      })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
      .where(eq(sessions.userId, userId))
      .groupBy(songs.songName, songs.danceName)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
      if (danceResult) mostFreqDance = { songName: danceResult.songName, danceName: danceResult.danceName, count: Number(danceResult.count) };

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

    // Additional stats
    let dancesThisMonth = 0;
    let mostRecentDance = "N/A";
    let mostRecentStyle = "";
    let mostDancedDay: { date: string; count: number } | null = null;
    let avgDancesPerSession = 0;
    let top3Dances: { danceName: string; songName: string; count: number }[] = [];
    let top3SwingSongs: { songName: string; danceName: string; style: string; count: number }[] = [];
    let lineDancesThisYear = 0;
    let swingDancesThisYear = 0;
    let totalDancesThisYear = 0;
    let lineDancesThisMonth = 0;
    let swingDancesThisMonth = 0;
    let totalLineDancesAllTime = 0;
    let totalSwingDancesAllTime = 0;
    let currentFavorite = "N/A";

    // Most recently added song (by id, not by session date)
    const [recentSong] = await db.select({ songName: songs.songName, danceName: songs.danceName, style: songs.style })
      .from(songs).where(eq(songs.userId, userId))
      .orderBy(desc(songs.id)).limit(1);
    if (recentSong) {
      mostRecentDance = recentSong.songName || recentSong.danceName;
      mostRecentStyle = recentSong.style;
    }

    if (sessionIds.length > 0) {
      // Dances this month
      const now = new Date();
      const [thisMonthResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
        .where(and(
          eq(sessions.userId, userId),
          sql`EXTRACT(MONTH FROM ${sessions.date}) = ${now.getMonth() + 1}`,
          sql`EXTRACT(YEAR FROM ${sessions.date}) = ${now.getFullYear()}`
        ));
      dancesThisMonth = Number(thisMonthResult?.count || 0);

      // Most danced day
      const [topDayResult] = await db.select({
        date: sessions.date,
        count: sql<number>`count(*)`
      })
      .from(sessionDances)
      .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
      .where(eq(sessions.userId, userId))
      .groupBy(sessions.date)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
      if (topDayResult) {
        mostDancedDay = {
          date: topDayResult.date.toISOString().split('T')[0],
          count: Number(topDayResult.count),
        };
      }

      // Avg dances per session
      const sessionCount = sessionIds.length;
      avgDancesPerSession = sessionCount > 0
        ? Math.round((totalDances / sessionCount) * 10) / 10
        : 0;

      // Top 3 line dances (style = 'LINE')
      const top3 = await db.select({
        danceName: songs.danceName,
        songName: songs.songName,
        count: sql<number>`count(*)`
      })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
      .where(and(eq(sessions.userId, userId), eq(songs.style, 'LINE')))
      .groupBy(songs.danceName, songs.songName)
      .orderBy(desc(sql`count(*)`))
      .limit(3);
      top3Dances = top3.map(r => ({ danceName: r.danceName, songName: r.songName, count: Number(r.count) }));

      // Top 3 swing songs (style != 'LINE')
      const top3Swing = await db.select({
        songName: songs.songName,
        danceName: songs.danceName,
        style: songs.style,
        count: sql<number>`count(*)`
      })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
      .where(and(eq(sessions.userId, userId), ne(songs.style, 'LINE')))
      .groupBy(songs.songName, songs.danceName, songs.style)
      .orderBy(desc(sql`count(*)`))
      .limit(3);
      top3SwingSongs = top3Swing.map(r => ({ songName: r.songName, danceName: r.danceName, style: r.style, count: Number(r.count) }));

      // Line dances this year
      const [lineDancesYearResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
        .where(and(eq(sessions.userId, userId), eq(songs.style, 'LINE'), sql`EXTRACT(YEAR FROM ${sessions.date}) = ${now.getFullYear()}`));
      lineDancesThisYear = Number(lineDancesYearResult?.count || 0);

      // Swing dances this year
      const [swingDancesYearResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
        .where(and(eq(sessions.userId, userId), ne(songs.style, 'LINE'), sql`EXTRACT(YEAR FROM ${sessions.date}) = ${now.getFullYear()}`));
      swingDancesThisYear = Number(swingDancesYearResult?.count || 0);
      totalDancesThisYear = lineDancesThisYear + swingDancesThisYear;

      // Line dances this month
      const [lineDancesMonthResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
        .where(and(
          eq(sessions.userId, userId), eq(songs.style, 'LINE'),
          sql`EXTRACT(MONTH FROM ${sessions.date}) = ${now.getMonth() + 1}`,
          sql`EXTRACT(YEAR FROM ${sessions.date}) = ${now.getFullYear()}`
        ));
      lineDancesThisMonth = Number(lineDancesMonthResult?.count || 0);

      // Swing dances this month
      const [swingDancesMonthResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
        .where(and(
          eq(sessions.userId, userId), ne(songs.style, 'LINE'),
          sql`EXTRACT(MONTH FROM ${sessions.date}) = ${now.getMonth() + 1}`,
          sql`EXTRACT(YEAR FROM ${sessions.date}) = ${now.getFullYear()}`
        ));
      swingDancesThisMonth = Number(swingDancesMonthResult?.count || 0);

      // All-time line / swing totals
      const [lineTotalResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
        .where(and(eq(sessions.userId, userId), eq(songs.style, 'LINE')));
      totalLineDancesAllTime = Number(lineTotalResult?.count || 0);

      const [swingTotalResult] = await db.select({ count: sql<number>`count(*)` })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .innerJoin(sessions, eq(sessionDances.sessionId, sessions.id))
        .where(and(eq(sessions.userId, userId), ne(songs.style, 'LINE')));
      totalSwingDancesAllTime = Number(swingTotalResult?.count || 0);
    }

    // Current favorite song
    const [favSong] = await db.select({ danceName: songs.danceName, songName: songs.songName })
      .from(songs)
      .where(and(eq(songs.userId, userId), eq(songs.isFavorite, true)))
      .limit(1);
    if (favSong) currentFavorite = favSong.danceName || favSong.songName;

    return {
      totalDances,
      longestStreak,
      totalDaysDancing,
      uniqueLocations,
      mostFrequentLocation: mostFreqLoc?.location || "N/A",
      mostFrequentLocationCount: mostFreqLoc?.count || 0,
      mostFrequentSongName: mostFreqDance?.songName || "N/A",
      mostFrequentDance: mostFreqDance?.danceName || "N/A",
      mostFrequentDanceCount: mostFreqDance?.count || 0,
      dancesThisMonth,
      mostRecentDance,
      mostRecentStyle,
      mostDancedDay,
      avgDancesPerSession,
      top3Dances,
      top3SwingSongs,
      lineDancesThisYear,
      swingDancesThisYear,
      totalDancesThisYear,
      lineDancesThisMonth,
      swingDancesThisMonth,
      totalLineDancesAllTime,
      totalSwingDancesAllTime,
      currentFavorite,
    };
  }
  // --- Buddies ---
  async searchUsers(query: string, excludeId: number): Promise<{ id: number; username: string; firstName: string; avatar?: string }[]> {
    const results = await db
      .select({ id: users.id, username: users.username, firstName: users.firstName, avatar: users.avatar })
      .from(users)
      .where(and(
        ilike(users.username, `%${query}%`),
        ne(users.id, excludeId)
      ))
      .limit(10);
    return results.map(r => ({ id: r.id, username: r.username || "", firstName: r.firstName, avatar: r.avatar ?? undefined }));
  }

  async updateAvatar(userId: number, avatar: string | null): Promise<void> {
    await db.update(users).set({ avatar }).where(eq(users.id, userId));
  }

  async updatePhone(userId: number, phoneNumber: string): Promise<void> {
    await db.update(users).set({ phoneNumber }).where(eq(users.id, userId));
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phone));
    return user;
  }

  async createVerificationCode(userId: number, type: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    // Invalidate old codes for this user/type
    await db.update(verificationCodes)
      .set({ used: true })
      .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.type, type)));
    await db.insert(verificationCodes).values({ userId, code, type, expiresAt, used: false });
    return code;
  }

  async verifyAndReset(phone: string, code: string, resetType: string, newValue: string): Promise<boolean> {
    const user = await this.getUserByPhone(phone);
    if (!user) return false;
    const [record] = await db.select().from(verificationCodes).where(
      and(
        eq(verificationCodes.userId, user.id),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, resetType),
        eq(verificationCodes.used, false)
      )
    );
    if (!record || record.expiresAt < new Date()) return false;
    // Mark used
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, record.id));
    if (resetType === "password") {
      const hash = await bcrypt.hash(newValue, 12);
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));
    } else if (resetType === "username") {
      const existing = await this.getUserByUsername(newValue);
      if (existing && existing.id !== user.id) throw new Error("Username already taken");
      await db.update(users).set({ username: newValue }).where(eq(users.id, user.id));
    }
    return true;
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
    const [songCountResult] = await db.select({ count: sql<number>`count(*)` })
      .from(songs).where(eq(songs.userId, buddyUserId));
    const songCount = Number(songCountResult?.count || 0);

    // Line / swing song counts from library (not session dances)
    const [lineDanceCountResult] = await db.select({ count: sql<number>`count(*)` })
      .from(songs)
      .where(and(eq(songs.userId, buddyUserId), eq(songs.style, 'LINE')));
    const lineDanceCount = Number(lineDanceCountResult?.count || 0);

    const [swingDanceCountResult] = await db.select({ count: sql<number>`count(*)` })
      .from(songs)
      .where(and(eq(songs.userId, buddyUserId), ne(songs.style, 'LINE')));
    const swingDanceCount = Number(swingDanceCountResult?.count || 0);

    // Current favorite song
    const [favSong] = await db.select({ danceName: songs.danceName, songName: songs.songName })
      .from(songs)
      .where(and(eq(songs.userId, buddyUserId), eq(songs.isFavorite, true)))
      .limit(1);
    const currentFavoriteSong = favSong ? (favSong.danceName || favSong.songName) : null;

    return {
      userId: user.id,
      username: user.username || "",
      firstName: user.firstName,
      avatar: user.avatar ?? undefined,
      totalDances: stats.totalDances,
      longestStreak: stats.longestStreak,
      totalDaysDancing: stats.totalDaysDancing,
      currentStreak,
      favoriteDance: stats.mostFrequentDance,
      songCount,
      lineDanceCount,
      swingDanceCount,
      currentFavoriteSong,
    };
  }

  async toggleFavorite(songId: number, userId: number): Promise<Song> {
    const [existing] = await db.select({ isFavorite: songs.isFavorite })
      .from(songs).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
    if (!existing) throw new Error("Song not found");
    if (existing.isFavorite) {
      const [updated] = await db.update(songs).set({ isFavorite: false })
        .where(and(eq(songs.id, songId), eq(songs.userId, userId))).returning();
      return updated;
    } else {
      await db.update(songs).set({ isFavorite: false }).where(eq(songs.userId, userId));
      const [updated] = await db.update(songs).set({ isFavorite: true })
        .where(and(eq(songs.id, songId), eq(songs.userId, userId))).returning();
      return updated;
    }
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
          requesterAvatar: requester.avatar ?? undefined,
        };
      })
    );
    return results.filter(Boolean);
  }

  async sendBuddyRequest(requesterId: number, recipientId: number): Promise<void> {
    const existing = await db
      .select()
      .from(buddies)
      .where(or(
        and(eq(buddies.requesterId, requesterId), eq(buddies.recipientId, recipientId)),
        and(eq(buddies.requesterId, recipientId), eq(buddies.recipientId, requesterId))
      ));
    if (existing.length > 0) {
      if (existing[0].status === "declined") {
        await db.delete(buddies).where(eq(buddies.id, existing[0].id));
      } else {
        throw new Error("Request already exists");
      }
    }
    await db.insert(buddies).values({ requesterId, recipientId, status: "pending" });
  }

  async getStyleDistribution(userId: number): Promise<{ style: string; count: number }[]> {
    const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
    if (userSessions.length === 0) return [];
    const ids = userSessions.map(s => s.id);
    const rows = await db
      .select({ style: songs.style, count: sql<number>`count(*)` })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .where(inArray(sessionDances.sessionId, ids))
      .groupBy(songs.style);
    return rows.map(r => ({ style: r.style, count: Number(r.count) }));
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

  // --- Homepage Stats Preferences ---
  async getHomepageStats(userId: number): Promise<string[] | null> {
    const user = await this.getUserById(userId);
    if (!user || !user.homepageStats) return null;
    try { return JSON.parse(user.homepageStats); } catch { return null; }
  }

  async setHomepageStats(userId: number, stats: string[]): Promise<void> {
    await db.update(users).set({ homepageStats: JSON.stringify(stats) }).where(eq(users.id, userId));
  }

  // --- Dance-Off Challenges ---
  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async createDanceOff(creatorId: number, type: 'h2h' | 'showdown', title: string, durationHours: number, challengedId?: number): Promise<{ id: number; joinCode: string | null }> {
    const joinCode = type === 'showdown' ? this.generateJoinCode() : null;
    const [danceOff] = await db.insert(danceOffs).values({
      creatorId, type, title, durationHours, joinCode,
      status: 'active',
      challengedId: challengedId ?? null,
      startedAt: new Date(),
    }).returning();

    await db.insert(danceOffParticipants).values({ danceOffId: danceOff.id, userId: creatorId });
    if (type === 'h2h' && challengedId) {
      await db.insert(danceOffParticipants).values({ danceOffId: danceOff.id, userId: challengedId });
    }

    return { id: danceOff.id, joinCode };
  }

  async joinDanceOff(userId: number, joinCode: string): Promise<void> {
    const [danceOff] = await db.select().from(danceOffs)
      .where(and(eq(danceOffs.joinCode, joinCode.toUpperCase()), eq(danceOffs.type, 'showdown'), eq(danceOffs.status, 'active')));
    if (!danceOff) throw new Error("Invalid or expired join code");
    if (danceOff.creatorId === userId) throw new Error("You can't join your own showdown");
    const [existing] = await db.select().from(danceOffParticipants)
      .where(and(eq(danceOffParticipants.danceOffId, danceOff.id), eq(danceOffParticipants.userId, userId)));
    if (existing) throw new Error("You've already joined this challenge");
    await db.insert(danceOffParticipants).values({ danceOffId: danceOff.id, userId });
  }

  async finalizeDanceOff(id: number): Promise<void> {
    const [danceOff] = await db.select().from(danceOffs).where(eq(danceOffs.id, id));
    if (!danceOff) return;
    const parts = await db.select().from(danceOffParticipants).where(eq(danceOffParticipants.danceOffId, id));
    const endTime = new Date(danceOff.startedAt.getTime() + danceOff.durationHours * 3600 * 1000);
    for (const p of parts) {
      // Use an 18-hour lookback window on startedAt to handle timezone differences
      // (e.g. US users creating challenges in the evening where startedAt UTC date is "tomorrow")
      const userSessions = await db.select({ id: sessions.id }).from(sessions)
        .where(and(
          eq(sessions.userId, p.userId),
          sql`${sessions.date}::date BETWEEN (${danceOff.startedAt}::timestamp - INTERVAL '18 hours')::date AND ${endTime}::date`
        ));
      let finalCount = 0;
      if (userSessions.length > 0) {
        const ids = userSessions.map(s => s.id);
        const [r] = await db.select({ count: sql<number>`count(*)` })
          .from(sessionDances).where(inArray(sessionDances.sessionId, ids));
        finalCount = Number(r?.count || 0);
      }
      await db.update(danceOffParticipants).set({ finalDanceCount: finalCount }).where(eq(danceOffParticipants.id, p.id));
    }
    await db.update(danceOffs).set({ status: 'completed' }).where(eq(danceOffs.id, id));
  }

  async clearDanceOffResults(userId: number): Promise<void> {
    const userParticipations = await db
      .select({ danceOffId: danceOffParticipants.danceOffId })
      .from(danceOffParticipants)
      .innerJoin(danceOffs, eq(danceOffs.id, danceOffParticipants.danceOffId))
      .where(and(eq(danceOffParticipants.userId, userId), eq(danceOffs.status, 'completed')));
    for (const { danceOffId } of userParticipations) {
      await db.delete(danceOffParticipants).where(eq(danceOffParticipants.danceOffId, danceOffId));
      await db.delete(danceOffs).where(eq(danceOffs.id, danceOffId));
    }
  }

  async deleteDanceOffResult(id: number, userId: number): Promise<void> {
    const [participation] = await db.select()
      .from(danceOffParticipants)
      .where(and(eq(danceOffParticipants.danceOffId, id), eq(danceOffParticipants.userId, userId)));
    if (!participation) throw new Error("Not a participant in this challenge");
    await db.delete(danceOffParticipants).where(eq(danceOffParticipants.danceOffId, id));
    await db.delete(danceOffs).where(eq(danceOffs.id, id));
  }

  async getDanceOffs(userId: number): Promise<any[]> {
    const created = await db.select({ id: danceOffs.id }).from(danceOffs).where(eq(danceOffs.creatorId, userId));
    const joined = await db.select({ id: danceOffParticipants.danceOffId }).from(danceOffParticipants).where(eq(danceOffParticipants.userId, userId));
    const allIds = [...new Set([...created.map(d => d.id), ...joined.map(p => p.id)])];
    const results = await Promise.all(allIds.map(id => this.getDanceOffDetail(id)));
    return results.filter(Boolean).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getDanceOffDetail(id: number): Promise<any | null> {
    const [danceOff] = await db.select().from(danceOffs).where(eq(danceOffs.id, id));
    if (!danceOff) return null;
    const now = new Date();
    const endTime = new Date(danceOff.startedAt.getTime() + danceOff.durationHours * 3600 * 1000);
    if (now >= endTime && danceOff.status === 'active') {
      await this.finalizeDanceOff(id);
      const [updated] = await db.select().from(danceOffs).where(eq(danceOffs.id, id));
      if (updated) Object.assign(danceOff, updated);
    }
    const parts = await db.select().from(danceOffParticipants).where(eq(danceOffParticipants.danceOffId, id));
    const participantResults = await Promise.all(parts.map(async p => {
      const user = await this.getUserById(p.userId);
      let liveDanceCount: number | undefined;
      if (danceOff.status === 'active') {
        // Use 18-hour lookback to handle timezone differences for US users
        const userSessions = await db.select({ id: sessions.id }).from(sessions)
          .where(and(
            eq(sessions.userId, p.userId),
            sql`${sessions.date}::date BETWEEN (${danceOff.startedAt}::timestamp - INTERVAL '18 hours')::date AND ${danceOff.startedAt}::date`
          ));
        if (userSessions.length > 0) {
          const ids = userSessions.map(s => s.id);
          const [r] = await db.select({ count: sql<number>`count(*)` }).from(sessionDances).where(inArray(sessionDances.sessionId, ids));
          liveDanceCount = Number(r?.count || 0);
        } else {
          liveDanceCount = 0;
        }
      }
      return {
        userId: p.userId,
        username: user?.username || "",
        firstName: user?.firstName || "",
        avatar: user?.avatar ?? undefined,
        finalDanceCount: p.finalDanceCount,
        liveDanceCount,
      };
    }));
    return {
      id: danceOff.id,
      type: danceOff.type,
      title: danceOff.title,
      durationHours: danceOff.durationHours,
      startedAt: danceOff.startedAt.toISOString(),
      joinCode: danceOff.joinCode,
      status: danceOff.status,
      creatorId: danceOff.creatorId,
      challengedId: danceOff.challengedId,
      participants: participantResults,
      msRemaining: Math.max(0, endTime.getTime() - now.getTime()),
    };
  }

  async computeAchievements(userId: number): Promise<AchievementStatus[]> {
    const userSessions = await db.select({
      id: sessions.id,
      date: sessions.date,
      location: sessions.location,
    }).from(sessions).where(eq(sessions.userId, userId)).orderBy(sessions.date);

    const sessionIds = userSessions.map(s => s.id);

    let danceRows: { sessionId: number; danceName: string }[] = [];
    if (sessionIds.length > 0) {
      danceRows = await db.select({
        sessionId: sessionDances.sessionId,
        danceName: songs.danceName,
      }).from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .where(inArray(sessionDances.sessionId, sessionIds));
    }

    const totalDances = danceRows.length;

    const dancesBySession = new Map<number, string[]>();
    for (const row of danceRows) {
      if (!dancesBySession.has(row.sessionId)) dancesBySession.set(row.sessionId, []);
      dancesBySession.get(row.sessionId)!.push(row.danceName);
    }
    const maxDancesInSession = dancesBySession.size > 0
      ? Math.max(...[...dancesBySession.values()].map(d => d.length)) : 0;

    const lateNightSessions = userSessions.filter(s => {
      const h = s.date.getUTCHours();
      return h >= 5 && h < 12;
    });

    const uniqueDanceNames = new Set(danceRows.map(r => r.danceName));

    const danceFreq = new Map<string, number>();
    for (const row of danceRows) {
      danceFreq.set(row.danceName, (danceFreq.get(row.danceName) || 0) + 1);
    }
    const maxDanceFreq = danceFreq.size > 0 ? Math.max(...danceFreq.values()) : 0;

    const danceSessionMap = new Map<string, Set<number>>();
    for (const row of danceRows) {
      if (!danceSessionMap.has(row.danceName)) danceSessionMap.set(row.danceName, new Set());
      danceSessionMap.get(row.danceName)!.add(row.sessionId);
    }
    const maxSessionsForOneDance = danceSessionMap.size > 0
      ? Math.max(...[...danceSessionMap.values()].map(s => s.size)) : 0;

    const venueCounts = new Map<string, number>();
    for (const s of userSessions) {
      const loc = s.location || '';
      if (loc) venueCounts.set(loc, (venueCounts.get(loc) || 0) + 1);
    }
    const uniqueVenues = venueCounts.size;
    const maxVenueCount = venueCounts.size > 0 ? Math.max(...venueCounts.values()) : 0;

    let maxConsecutiveVenue = userSessions.length > 0 ? 1 : 0;
    let curConsecVenue = 1;
    for (let i = 1; i < userSessions.length; i++) {
      if (userSessions[i].location && userSessions[i].location === userSessions[i - 1].location) {
        curConsecVenue++;
        if (curConsecVenue > maxConsecutiveVenue) maxConsecutiveVenue = curConsecVenue;
      } else { curConsecVenue = 1; }
    }

    const allDatesSet = new Set(userSessions.map(s => s.date.toISOString().split('T')[0]));
    const allDates = [...allDatesSet].sort();

    let longestStreak = allDates.length > 0 ? 1 : 0;
    let currentStrk = 1;
    for (let i = 1; i < allDates.length; i++) {
      const diff = (new Date(allDates[i]).getTime() - new Date(allDates[i - 1]).getTime()) / 86400000;
      if (diff === 1) { currentStrk++; if (currentStrk > longestStreak) longestStreak = currentStrk; }
      else currentStrk = 1;
    }

    const weekDayMap = new Map<string, Set<string>>();
    for (const s of userSessions) {
      const week = getISOWeek(s.date);
      if (!weekDayMap.has(week)) weekDayMap.set(week, new Set());
      weekDayMap.get(week)!.add(s.date.toISOString().split('T')[0]);
    }
    const maxDaysInWeek = weekDayMap.size > 0 ? Math.max(...[...weekDayMap.values()].map(s => s.size)) : 0;

    let hasWeekendWarrior = false;
    const weekDayOfWeekMap = new Map<string, Set<number>>();
    for (const s of userSessions) {
      const week = getISOWeek(s.date);
      if (!weekDayOfWeekMap.has(week)) weekDayOfWeekMap.set(week, new Set());
      weekDayOfWeekMap.get(week)!.add(s.date.getUTCDay());
    }
    for (const days of weekDayOfWeekMap.values()) {
      if (days.has(5) && days.has(6)) { hasWeekendWarrior = true; break; }
    }

    const monthDances = new Map<string, number>();
    for (const row of danceRows) {
      const sess = userSessions.find(s => s.id === row.sessionId);
      if (!sess) continue;
      const key = `${sess.date.getFullYear()}-${sess.date.getMonth()}`;
      monthDances.set(key, (monthDances.get(key) || 0) + 1);
    }
    const maxDancesInMonth = monthDances.size > 0 ? Math.max(...monthDances.values()) : 0;

    let hasFloorHopper = false;
    const weekVenueMap = new Map<string, Set<string>>();
    for (const s of userSessions) {
      const week = getISOWeek(s.date);
      if (!weekVenueMap.has(week)) weekVenueMap.set(week, new Set());
      if (s.location) weekVenueMap.get(week)!.add(s.location);
    }
    for (const venues of weekVenueMap.values()) {
      if (venues.size >= 3) { hasFloorHopper = true; break; }
    }

    let hasBackInSaddle = false;
    for (let i = 1; i < allDates.length; i++) {
      const diff = (new Date(allDates[i]).getTime() - new Date(allDates[i - 1]).getTime()) / 86400000;
      if (diff >= 7) { hasBackInSaddle = true; break; }
    }

    // Dance-off / challenge stats
    const participations = await db.select({
      danceOffId: danceOffParticipants.danceOffId,
    }).from(danceOffParticipants).where(eq(danceOffParticipants.userId, userId));

    const danceOffIds = participations.map(p => p.danceOffId);
    let completedDanceOffs: (typeof danceOffs.$inferSelect)[] = [];
    if (danceOffIds.length > 0) {
      completedDanceOffs = await db.select().from(danceOffs)
        .where(and(inArray(danceOffs.id, danceOffIds), eq(danceOffs.status, 'completed')))
        .orderBy(danceOffs.startedAt);
    }

    let wins = 0;
    let consecutiveWins = 0;
    let maxConsecutiveWins = 0;
    let mainCharacter = false;
    let showdownCount = 0;

    for (const ch of completedDanceOffs) {
      if (ch.type === 'showdown') showdownCount++;
      const allParts = await db.select().from(danceOffParticipants).where(eq(danceOffParticipants.danceOffId, ch.id));
      const userPart = allParts.find(p => p.userId === userId);
      if (!userPart) continue;
      const maxCount = Math.max(...allParts.map(p => p.finalDanceCount ?? 0));
      const userCount = userPart.finalDanceCount ?? 0;
      const won = userCount > 0 && userCount >= maxCount;
      if (won) {
        wins++; consecutiveWins++;
        if (consecutiveWins > maxConsecutiveWins) maxConsecutiveWins = consecutiveWins;
        if (userCount >= 30) mainCharacter = true;
      } else { consecutiveWins = 0; }
    }
    const totalChallenges = completedDanceOffs.length;

    const progressMap: Record<string, number> = {
      first_steps:        Math.min(userSessions.length, 1),
      on_the_floor:       Math.min(totalDances, 10),
      boot_scootin:       Math.min(totalDances, 50),
      dance_machine:      Math.min(totalDances, 100),
      cant_stop_now:      Math.min(totalDances, 500),
      thousand_stepper:   Math.min(totalDances, 1000),
      step_streak:        Math.min(longestStreak, 3),
      dance_fever:        Math.min(maxDaysInWeek, 5),
      weekend_warrior:    hasWeekendWarrior ? 1 : 0,
      peak_season:        Math.min(maxDancesInMonth, 100),
      home_turf:          Math.min(maxVenueCount, 10),
      wanderer:           Math.min(uniqueVenues, 3),
      road_trip:          Math.min(uniqueVenues, 5),
      bar_regular:        Math.min(maxConsecutiveVenue, 5),
      dance_passport:     Math.min(uniqueVenues, 10),
      variety_pack:       Math.min(uniqueDanceNames.size, 10),
      collector:          Math.min(uniqueDanceNames.size, 25),
      human_jukebox:      Math.min(uniqueDanceNames.size, 50),
      crowd_favorite:     Math.min(maxDanceFreq, 10),
      encore:             Math.min(maxSessionsForOneDance, 5),
      competitive_spirit: Math.min(showdownCount, 10),
      showdown_winner:    Math.min(wins, 1),
      rivalry:            Math.min(totalChallenges, 5),
      undefeated:         Math.min(maxConsecutiveWins, 3),
      main_character:     mainCharacter ? 1 : 0,
      marathon_night:     Math.min(maxDancesInSession, 25),
      closing_time:       Math.min(lateNightSessions.length, 1),
      night_owl:          Math.min(lateNightSessions.length, 3),
      back_in_the_saddle: hasBackInSaddle ? 1 : 0,
      floor_hopper:       hasFloorHopper ? 1 : 0,
    };

    const existing = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
    const existingMap = new Map(existing.map(e => [e.achievementId, e]));

    for (const def of ACHIEVEMENT_DEFS) {
      const progress = progressMap[def.id] ?? 0;
      if (progress >= def.target && !existingMap.has(def.id)) {
        const [inserted] = await db.insert(userAchievements).values({
          userId, achievementId: def.id,
        }).returning();
        existingMap.set(def.id, inserted);
      }
    }

    return ACHIEVEMENT_DEFS.map(def => {
      const progress = progressMap[def.id] ?? 0;
      const record = existingMap.get(def.id);
      return {
        id: def.id,
        earned: !!record,
        progress,
        target: def.target,
        earnedAt: record?.earnedAt?.toISOString(),
        seen: !!record?.seenAt,
      };
    });
  }

  async markAchievementsSeen(userId: number): Promise<void> {
    await db.update(userAchievements)
      .set({ seenAt: new Date() })
      .where(and(
        eq(userAchievements.userId, userId),
        sql`${userAchievements.seenAt} IS NULL`
      ));
  }

  async grantAllAchievements(userId: number): Promise<void> {
    const existing = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
    const existingIds = new Set(existing.map(e => e.achievementId));
    const toInsert = ACHIEVEMENT_DEFS
      .filter(def => !existingIds.has(def.id))
      .map(def => ({ userId, achievementId: def.id }));
    if (toInsert.length > 0) {
      await db.insert(userAchievements).values(toInsert);
    }
  }
}

export const storage = new DatabaseStorage();
