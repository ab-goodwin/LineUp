import { db } from "./db";
import { 
  users, songs, sessions, sessionDances, locations, locationAliases, userSavedLocations,
  buddies, streakChallenges, verificationCodes, danceOffs, danceOffParticipants, userAchievements,
  type User, type InsertUser,
  type Song, type InsertSong, type CreateSongRequest, type UpdateSongRequest,
  type Session, type InsertSession, type CreateSessionRequest, type UpdateSessionRequest, type SessionResponse,
  type StatsResponse, type Location, type SessionLocationDetail,
  type LocationSearchResult, type LocationDuplicateResult, type SavedLocationResponse
} from "@shared/schema";
import { ACHIEVEMENT_DEFS, type AchievementStatus } from "@shared/achievements";
import { eq, desc, sql, and, or, ilike, ne, inArray } from "drizzle-orm";

// Great-circle distance in miles between two lat/lng points.
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_RADIUS_MILES = 50;

function normalizeLocationName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  getUserBySupabaseAuthId(supabaseAuthId: string): Promise<User | undefined>;
  createAuthUser(input: { username: string; email: string; supabaseAuthId: string; firstName?: string; lastName?: string }): Promise<User>;

  // User Profile (scoped to userId)
  getUser(userId: number): Promise<User>;
  updateUser(userId: number, updates: { firstName?: string; lastName?: string; location?: string }): Promise<User>;
  deleteData(userId: number, type: 'sessions' | 'songs' | 'all'): Promise<void>;

  // Global locations + per-user favorites/recent history
  getLocations(userId: number, limit?: number): Promise<SavedLocationResponse[]>;
  searchLocations(userId: number, query: string, limit?: number): Promise<LocationSearchResult[]>;
  findLocationDuplicates(name: string, city: string, state: string, limit?: number): Promise<LocationDuplicateResult[]>;
  createLocation(userId: number, name: string, city: string, state: string): Promise<Location>;
  saveLocation(userId: number, locationId: number, isFavorite?: boolean): Promise<void>;
  deleteLocation(id: number, userId: number): Promise<void>;

  // Nearby crew suggestions
  setAppearInSuggestions(userId: number, optIn: boolean): Promise<void>;
  getSuggestedCrew(userId: number): Promise<{ userId: number; username: string; firstName: string; avatar?: string; reason: string }[]>;

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

  // Buddies
  searchUsers(query: string, excludeId: number): Promise<{ id: number; username: string; firstName: string; avatar?: string }[]>;
  getBuddies(userId: number): Promise<any[]>;
  getPendingRequests(userId: number): Promise<any[]>;
  sendBuddyRequest(requesterId: number, recipientId: number): Promise<void>;
  respondToBuddyRequest(id: number, userId: number, action: "accept" | "decline"): Promise<void>;
  removeBuddy(userId: number, buddyUserId: number): Promise<void>;
  getBuddyPublicStats(buddyUserId: number): Promise<any>;
  getPublicProfile(targetUserId: number, currentUserId: number): Promise<any | null>;
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

  async getUserBySupabaseAuthId(supabaseAuthId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseAuthId, supabaseAuthId));
    return user;
  }

  async createAuthUser(input: { username: string; email: string; supabaseAuthId: string; firstName?: string; lastName?: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      username: input.username,
      email: input.email,
      supabaseAuthId: input.supabaseAuthId,
      firstName: input.firstName || "Dancer",
      lastName: input.lastName || "",
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
  // With no query, return the user's favorites first, followed by their most
  // recently used session locations. Global locations are only searched after
  // the user types into the combobox.
  async getLocations(userId: number, limit = 6): Promise<SavedLocationResponse[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 20);

    const savedRows = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        usageCount: locations.usageCount,
        isFavorite: userSavedLocations.isFavorite,
        lastUsedAt: userSavedLocations.lastUsedAt,
      })
      .from(userSavedLocations)
      .innerJoin(locations, eq(userSavedLocations.locationId, locations.id))
      .where(eq(userSavedLocations.userId, userId))
      .orderBy(desc(userSavedLocations.isFavorite), desc(userSavedLocations.lastUsedAt), locations.name)
      .limit(safeLimit * 3);

    const recentRows = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        usageCount: locations.usageCount,
        lastUsedAt: sql<Date>`max(${sessions.date})`,
      })
      .from(sessions)
      .innerJoin(locations, eq(sessions.locationId, locations.id))
      .where(eq(sessions.userId, userId))
      .groupBy(
        locations.id,
        locations.name,
        locations.city,
        locations.state,
        locations.country,
        locations.usageCount,
      )
      .orderBy(desc(sql`max(${sessions.date})`))
      .limit(safeLimit * 3);

    const combined = new Map<number, SavedLocationResponse>();

    // Favorites/saved rows remain first because they are inserted first.
    for (const row of savedRows) {
      combined.set(row.id, {
        id: row.id,
        name: row.name,
        city: row.city,
        state: row.state,
        country: row.country,
        usageCount: row.usageCount,
        isFavorite: row.isFavorite,
        lastUsedAt: row.lastUsedAt,
      });
    }

    for (const row of recentRows) {
      const existing = combined.get(row.id);
      if (existing) {
        if (!existing.lastUsedAt || row.lastUsedAt > existing.lastUsedAt) {
          existing.lastUsedAt = row.lastUsedAt;
        }
        continue;
      }

      combined.set(row.id, {
        id: row.id,
        name: row.name,
        city: row.city,
        state: row.state,
        country: row.country,
        usageCount: row.usageCount,
        isFavorite: false,
        lastUsedAt: row.lastUsedAt,
      });
    }

    return Array.from(combined.values())
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        const aTime = a.lastUsedAt?.getTime() ?? 0;
        const bTime = b.lastUsedAt?.getTime() ?? 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.name.localeCompare(b.name);
      })
      .slice(0, safeLimit);
  }

  // Search the shared global directory. PostgreSQL trigram similarity catches
  // close spellings while exact and prefix matches are ranked first.
  async searchLocations(userId: number, query: string, limit = 6): Promise<LocationSearchResult[]> {
    const normalized = normalizeLocationName(query);
    if (!normalized) return [];

    const safeLimit = Math.min(Math.max(limit, 1), 10);
    const matchScore = sql<number>`GREATEST(
      similarity(${locations.normalizedName}, ${normalized}),
      COALESCE(MAX(similarity(${locationAliases.normalizedAlias}, ${normalized})), 0)
    )`;

    const rows = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        isFavorite: sql<boolean>`COALESCE(bool_or(${userSavedLocations.isFavorite}), false)`,
        lastUsedAt: sql<Date | null>`MAX(${userSavedLocations.lastUsedAt})`,
        matchScore,
        usageCount: locations.usageCount,
      })
      .from(locations)
      .leftJoin(locationAliases, eq(locationAliases.locationId, locations.id))
      .leftJoin(
        userSavedLocations,
        and(
          eq(userSavedLocations.locationId, locations.id),
          eq(userSavedLocations.userId, userId),
        ),
      )
      .where(or(
        eq(locations.normalizedName, normalized),
        ilike(locations.normalizedName, `${normalized}%`),
        ilike(locations.normalizedName, `%${normalized}%`),
        eq(locationAliases.normalizedAlias, normalized),
        ilike(locationAliases.normalizedAlias, `${normalized}%`),
        ilike(locationAliases.normalizedAlias, `%${normalized}%`),
        sql`${locations.normalizedName} % ${normalized}`,
        sql`${locationAliases.normalizedAlias} % ${normalized}`,
      ))
      .groupBy(
        locations.id,
        locations.name,
        locations.normalizedName,
        locations.city,
        locations.state,
        locations.country,
        locations.usageCount,
      )
      .orderBy(
        sql`CASE WHEN ${locations.normalizedName} = ${normalized} THEN 0 ELSE 1 END`,
        sql`CASE WHEN ${locations.normalizedName} LIKE ${normalized + "%"} THEN 0 ELSE 1 END`,
        desc(matchScore),
        desc(locations.usageCount),
        locations.name,
      )
      .limit(safeLimit);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      country: row.country,
      isFavorite: Boolean(row.isFavorite),
      lastUsedAt: row.lastUsedAt,
      matchScore: Number(row.matchScore),
    }));
  }

  async findLocationDuplicates(
    name: string,
    city: string,
    state: string,
    limit = 5,
  ): Promise<LocationDuplicateResult[]> {
    const normalizedName = normalizeLocationName(name);
    const normalizedCity = city.trim().toLowerCase();
    const normalizedState = state.trim().toLowerCase();

    if (!normalizedName || !normalizedCity || !normalizedState) return [];

    const safeLimit = Math.min(Math.max(limit, 1), 10);
    const matchScore = sql<number>`GREATEST(
      similarity(${locations.normalizedName}, ${normalizedName}),
      COALESCE(MAX(similarity(${locationAliases.normalizedAlias}, ${normalizedName})), 0)
    )`;

    const rows = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        matchScore,
      })
      .from(locations)
      .leftJoin(locationAliases, eq(locationAliases.locationId, locations.id))
      .where(and(
        ilike(locations.city, normalizedCity),
        ilike(locations.state, normalizedState),
        or(
          eq(locations.normalizedName, normalizedName),
          ilike(locations.normalizedName, `${normalizedName}%`),
          ilike(locations.normalizedName, `%${normalizedName}%`),
          eq(locationAliases.normalizedAlias, normalizedName),
          ilike(locationAliases.normalizedAlias, `${normalizedName}%`),
          ilike(locationAliases.normalizedAlias, `%${normalizedName}%`),
          sql`${locations.normalizedName} % ${normalizedName}`,
          sql`${locationAliases.normalizedAlias} % ${normalizedName}`,
        ),
      ))
      .groupBy(
        locations.id,
        locations.name,
        locations.normalizedName,
        locations.city,
        locations.state,
        locations.country,
      )
      .having(sql`${matchScore} >= 0.42`)
      .orderBy(desc(matchScore), locations.name)
      .limit(safeLimit);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      country: row.country,
      matchScore: Number(row.matchScore),
    }));
  }

  async saveLocation(userId: number, locationId: number, isFavorite = true): Promise<void> {
    await db
      .insert(userSavedLocations)
      .values({
        userId,
        locationId,
        isFavorite,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userSavedLocations.userId, userSavedLocations.locationId],
        set: {
          isFavorite,
          lastUsedAt: new Date(),
        },
      });
  }

  // Add a community location after server-side validation, duplicate
  // checking, and per-user creation-rate enforcement.
  async createLocation(
    userId: number,
    name: string,
    city: string,
    state: string,
  ): Promise<Location> {
    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const normalizedName = normalizeLocationName(trimmedName);

    if (trimmedName.length < 2 || trimmedName.length > 120 || !normalizedName) {
      throw new Error("Location name must be between 2 and 120 characters");
    }
    if (trimmedCity.length < 2 || trimmedCity.length > 80) {
      throw new Error("City must be between 2 and 80 characters");
    }
    if (trimmedState.length < 2 || trimmedState.length > 40) {
      throw new Error("State must be between 2 and 40 characters");
    }
    if (!/[a-z0-9]/i.test(trimmedName)) {
      throw new Error("Location name must contain letters or numbers");
    }
    if (!/[a-z]/i.test(trimmedCity) || !/[a-z]/i.test(trimmedState)) {
      throw new Error("City and state must contain letters");
    }

    const [existing] = await db
      .select()
      .from(locations)
      .where(and(
        eq(locations.normalizedName, normalizedName),
        ilike(locations.city, trimmedCity),
        ilike(locations.state, trimmedState),
      ))
      .limit(1);

    if (existing) {
      await this.saveLocation(userId, existing.id, true);
      return existing;
    }

    const [createdToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(locations)
      .where(and(
        eq(locations.createdByUserId, userId),
        sql`${locations.createdAt} >= now() - interval '24 hours'`,
      ));

    if (Number(createdToday?.count ?? 0) >= 10) {
      throw new Error("You have reached the limit of 10 new locations in 24 hours");
    }

    const [created] = await db
      .insert(locations)
      .values({
        name: trimmedName,
        normalizedName,
        city: trimmedCity,
        state: trimmedState,
        country: "United States",
        createdByUserId: userId,
        usageCount: 0,
      })
      .returning();

    await this.saveLocation(userId, created.id, true);
    return created;
  }

  // "Delete" only removes the location from this user's favorites/saved list.
  // It does not delete the shared global location used by other dancers.
  async deleteLocation(id: number, userId: number): Promise<void> {
    await db
      .delete(userSavedLocations)
      .where(and(
        eq(userSavedLocations.locationId, id),
        eq(userSavedLocations.userId, userId),
      ));
  }

  private async markLocationUsed(userId: number, locationId: number, usedAt: Date): Promise<void> {
    await db
      .insert(userSavedLocations)
      .values({
        userId,
        locationId,
        isFavorite: false,
        lastUsedAt: usedAt,
      })
      .onConflictDoUpdate({
        target: [userSavedLocations.userId, userSavedLocations.locationId],
        set: { lastUsedAt: usedAt },
      });
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

    const locationIds = Array.from(
      new Set(allSessions.map(s => s.locationId).filter((id): id is number => id != null))
    );
    const locationMap = new Map<number, SessionLocationDetail>();
    if (locationIds.length > 0) {
      const locs = await db.select({
        id: locations.id, name: locations.name, formattedAddress: locations.formattedAddress,
        city: locations.city, state: locations.state,
      }).from(locations).where(inArray(locations.id, locationIds));
      for (const l of locs) locationMap.set(l.id, l);
    }

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
          isFavorite: songs.isFavorite,
        })
        .from(sessionDances)
        .innerJoin(songs, eq(sessionDances.songId, songs.id))
        .where(eq(sessionDances.sessionId, s.id));
      
      results.push({ ...s, dances, locationDetail: s.locationId != null ? locationMap.get(s.locationId) ?? null : null });
    }
    return results;
  }

  private async getLocationDetail(locationId: number | null): Promise<SessionLocationDetail | null> {
    if (locationId == null) return null;
    const [l] = await db.select({
      id: locations.id, name: locations.name, formattedAddress: locations.formattedAddress,
      city: locations.city, state: locations.state,
    }).from(locations).where(eq(locations.id, locationId));
    return l ?? null;
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
        isFavorite: songs.isFavorite,
      })
      .from(sessionDances)
      .innerJoin(songs, eq(sessionDances.songId, songs.id))
      .where(eq(sessionDances.sessionId, session.id));

    return { ...session, dances, locationDetail: await this.getLocationDetail(session.locationId) };
  }

  async createSession(userId: number, req: CreateSessionRequest): Promise<SessionResponse> {
    const { danceIds, ...sessionData } = req;

    const [session] = await db.insert(sessions).values({ ...sessionData, userId }).returning();

    if (session.locationId != null) {
      await this.markLocationUsed(userId, session.locationId, session.date);
      await db.update(locations)
        .set({ usageCount: sql`${locations.usageCount} + 1`, updatedAt: new Date() })
        .where(eq(locations.id, session.locationId));
    }
    
    if (danceIds && danceIds.length > 0) {
      await db.insert(sessionDances).values(
        danceIds.map(songId => ({ sessionId: session.id, songId }))
      );
    }
    
    return this.getSession(session.id, userId) as Promise<SessionResponse>;
  }

  async updateSession(id: number, userId: number, req: UpdateSessionRequest): Promise<SessionResponse> {
    const [before] = await db.select().from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    if (!before) throw new Error("Session not found");

    const { danceIds, ...sessionData } = req;
    
    if (Object.keys(sessionData).length > 0) {
      await db.update(sessions)
        .set(sessionData)
        .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    }

    if (danceIds) {
      await db.delete(sessionDances).where(eq(sessionDances.sessionId, id));
      if (danceIds.length > 0) {
        await db.insert(sessionDances).values(
          danceIds.map(songId => ({ sessionId: id, songId }))
        );
      }
    }

    const [after] = await db.select().from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));

    if (after?.locationId != null) {
      await this.markLocationUsed(userId, after.locationId, after.date);
    }

    if (before.locationId !== after?.locationId) {
      if (before.locationId != null) {
        await db.update(locations)
          .set({ usageCount: sql`GREATEST(${locations.usageCount} - 1, 0)`, updatedAt: new Date() })
          .where(eq(locations.id, before.locationId));
      }
      if (after?.locationId != null) {
        await db.update(locations)
          .set({ usageCount: sql`${locations.usageCount} + 1`, updatedAt: new Date() })
          .where(eq(locations.id, after.locationId));
      }
    }

    return this.getSession(id, userId) as Promise<SessionResponse>;
  }

  async deleteSession(id: number, userId: number): Promise<void> {
    const [existing] = await db.select({ locationId: sessions.locationId })
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)));

    await db.delete(sessionDances).where(eq(sessionDances.sessionId, id));
    await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)));

    if (existing?.locationId != null) {
      await db.update(locations)
        .set({ usageCount: sql`GREATEST(${locations.usageCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(locations.id, existing.locationId));
    }
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

    const [sessionCountResult] = await db.select({ count: sql<number>`count(*)` })
      .from(sessions).where(eq(sessions.userId, buddyUserId));
    const totalSessions = Number(sessionCountResult?.count || 0);

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
      totalSessions,
      topLocation: stats.mostFrequentLocation,
    };
  }

  async getPublicProfile(targetUserId: number, currentUserId: number): Promise<any | null> {
    const user = await this.getUserById(targetUserId);
    if (!user) return null;

    // Derive relationship between current user and target
    let relationship: "self" | "notCrew" | "requestPending" | "alreadyCrew" = "notCrew";
    if (targetUserId === currentUserId) {
      relationship = "self";
    } else {
      const [rel] = await db
        .select()
        .from(buddies)
        .where(or(
          and(eq(buddies.requesterId, currentUserId), eq(buddies.recipientId, targetUserId)),
          and(eq(buddies.requesterId, targetUserId), eq(buddies.recipientId, currentUserId))
        ));
      if (rel) {
        if (rel.status === "accepted") relationship = "alreadyCrew";
        else if (rel.status === "pending") relationship = "requestPending";
        else relationship = "notCrew";
      }
    }

    const stats = await this.getStats(targetUserId);
    const currentStreak = await this.getCurrentStreak(targetUserId);

    const [lineDanceCountResult] = await db.select({ count: sql<number>`count(*)` })
      .from(songs)
      .where(and(eq(songs.userId, targetUserId), eq(songs.style, 'LINE')));
    const lineDanceCount = Number(lineDanceCountResult?.count || 0);

    const [swingDanceCountResult] = await db.select({ count: sql<number>`count(*)` })
      .from(songs)
      .where(and(eq(songs.userId, targetUserId), ne(songs.style, 'LINE')));
    const swingDanceCount = Number(swingDanceCountResult?.count || 0);

    return {
      userId: user.id,
      username: user.username || "",
      firstName: user.firstName,
      lastName: user.lastName,
      location: user.location || "",
      avatar: user.avatar ?? undefined,
      relationship,
      stats: {
        totalDances: stats.totalDances,
        lineDanceCount,
        swingDanceCount,
        longestStreak: stats.longestStreak,
        currentStreak,
        favoriteDance: stats.mostFrequentDance,
        topLocation: stats.mostFrequentLocation,
      },
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

  async setAppearInSuggestions(userId: number, optIn: boolean): Promise<void> {
    await db.update(users).set({ appearInSuggestions: optIn }).where(eq(users.id, userId));
  }

  // Nearby crew: other dancers who share a venue with the current user, matched
  // by structured locationId or by normalized legacy location text, and (when
  // both sides have geocoded coordinates) within NEARBY_RADIUS_MILES. Excludes
  // self, existing crew, pending requests (either direction), and anyone who has
  // opted out of suggestions. Reasons are intentionally location-vague.
  async getSuggestedCrew(userId: number): Promise<{ userId: number; username: string; firstName: string; avatar?: string; reason: string }[]> {
    const me = await this.getUserById(userId);
    if (!me) return [];

    const relations = await db.select().from(buddies).where(
      or(eq(buddies.requesterId, userId), eq(buddies.recipientId, userId))
    );

    const excluded = new Set<number>([userId]);
    const myBuddyIds = new Set<number>();

    for (const relation of relations) {
      const otherId = relation.requesterId === userId
        ? relation.recipientId
        : relation.requesterId;

      if (relation.status === "accepted") {
        excluded.add(otherId);
        myBuddyIds.add(otherId);
      } else if (relation.status === "pending") {
        excluded.add(otherId);
      }
    }

    const norm = (value: string | null | undefined) =>
      (value ?? "").trim().toLowerCase();

    const mySessions = await db
      .select({ location: sessions.location, locationId: sessions.locationId })
      .from(sessions)
      .where(eq(sessions.userId, userId));

    const myLocationIds = new Set<number>();
    const myTexts = new Set<string>();

    for (const session of mySessions) {
      if (session.locationId != null) myLocationIds.add(session.locationId);
      const text = norm(session.location);
      if (text) myTexts.add(text);
    }

    const myLocationNames = new Map<number, string>();
    const myCoords: { lat: number; lng: number }[] = [];

    if (myLocationIds.size > 0) {
      const rows = await db
        .select({
          id: locations.id,
          name: locations.name,
          latitude: locations.latitude,
          longitude: locations.longitude,
        })
        .from(locations)
        .where(inArray(locations.id, Array.from(myLocationIds)));

      for (const row of rows) {
        myLocationNames.set(row.id, row.name);
        if (row.latitude != null && row.longitude != null) {
          myCoords.push({ lat: row.latitude, lng: row.longitude });
        }
      }
    }

    const candidates = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.appearInSuggestions, true));

    type Scored = {
      userId: number;
      username: string;
      firstName: string;
      avatar?: string;
      reason: string;
      priority: number;
      mutualCount: number;
      exact: boolean;
      shared: number;
      distance: number;
    };

    const scored: Scored[] = [];

    for (const candidate of candidates) {
      if (excluded.has(candidate.id)) continue;

      const candidateRelations = await db
        .select()
        .from(buddies)
        .where(and(
          or(
            eq(buddies.requesterId, candidate.id),
            eq(buddies.recipientId, candidate.id),
          ),
          eq(buddies.status, "accepted"),
        ));

      const candidateBuddyIds = new Set<number>();
      for (const relation of candidateRelations) {
        candidateBuddyIds.add(
          relation.requesterId === candidate.id
            ? relation.recipientId
            : relation.requesterId
        );
      }

      const mutualIds = Array.from(myBuddyIds).filter(id => candidateBuddyIds.has(id));
      let mutualName: string | null = null;

      if (mutualIds.length > 0) {
        const [mutual] = await db
          .select({ firstName: users.firstName, username: users.username })
          .from(users)
          .where(eq(users.id, mutualIds[0]))
          .limit(1);

        mutualName = mutual?.firstName || mutual?.username || "a mutual friend";
      }

      const theirSessions = await db
        .select({ location: sessions.location, locationId: sessions.locationId })
        .from(sessions)
        .where(eq(sessions.userId, candidate.id));

      const theirLocationIds = new Set<number>();
      const theirTexts = new Set<string>();

      for (const session of theirSessions) {
        if (session.locationId != null) theirLocationIds.add(session.locationId);
        const text = norm(session.location);
        if (text) theirTexts.add(text);
      }

      const sharedStructuredIds = Array.from(theirLocationIds)
        .filter(id => myLocationIds.has(id));
      const sharedTexts = Array.from(theirTexts)
        .filter(text => myTexts.has(text));

      const sharedCount = sharedStructuredIds.length + sharedTexts.length;
      const exact = sharedCount > 0;

      let venueName: string | null = null;

      if (sharedStructuredIds.length > 0) {
        venueName = myLocationNames.get(sharedStructuredIds[0]) ?? null;

        if (!venueName) {
          const [venue] = await db
            .select({ name: locations.name })
            .from(locations)
            .where(eq(locations.id, sharedStructuredIds[0]))
            .limit(1);
          venueName = venue?.name ?? null;
        }
      } else if (sharedTexts.length > 0) {
        const matching = theirSessions.find(
          session => norm(session.location) === sharedTexts[0]
        );
        venueName = matching?.location?.trim() || sharedTexts[0];
      }

      let distance = Number.POSITIVE_INFINITY;

      if (theirLocationIds.size > 0 && myCoords.length > 0) {
        const theirLocations = await db
          .select({ latitude: locations.latitude, longitude: locations.longitude })
          .from(locations)
          .where(inArray(locations.id, Array.from(theirLocationIds)));

        for (const location of theirLocations) {
          if (location.latitude == null || location.longitude == null) continue;

          for (const mine of myCoords) {
            distance = Math.min(
              distance,
              haversineMiles(
                mine.lat,
                mine.lng,
                location.latitude,
                location.longitude,
              ),
            );
          }
        }
      }

      const nearby = distance <= NEARBY_RADIUS_MILES;
      const hasMutual = mutualIds.length > 0;

      if (!hasMutual && !exact && !nearby) continue;

      let reason: string;
      let priority: number;

      if (hasMutual && mutualName) {
        if (mutualIds.length === 1) {
          reason = `Also friends with ${mutualName}`;
        } else {
          const others = mutualIds.length - 1;
          reason = `Also friends with ${mutualName} and ${others} other${others === 1 ? "" : "s"}`;
        }
        priority = 1;
      } else if (exact && venueName) {
        reason = `Also dances at ${venueName}`;
        priority = 2;
      } else {
        reason = "Dances near places in your LineUp";
        priority = 3;
      }

      scored.push({
        userId: candidate.id,
        username: candidate.username || "",
        firstName: candidate.firstName,
        avatar: candidate.avatar ?? undefined,
        reason,
        priority,
        mutualCount: mutualIds.length,
        exact,
        shared: sharedCount,
        distance,
      });
    }

    scored.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.mutualCount !== b.mutualCount) return b.mutualCount - a.mutualCount;
      if (a.exact !== b.exact) return a.exact ? -1 : 1;
      if (a.shared !== b.shared) return b.shared - a.shared;
      return a.distance - b.distance;
    });

    return scored.slice(0, 20).map(
      ({ userId, username, firstName, avatar, reason }) => ({
        userId,
        username,
        firstName,
        avatar,
        reason,
      }),
    );
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