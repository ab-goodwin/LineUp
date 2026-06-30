import { pgTable, text, serial, integer, timestamp, varchar, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  email: text("email").unique(),
  supabaseAuthId: uuid("supabase_auth_id").unique(),
  firstName: text("first_name").default("Dancer").notNull(),
  lastName: text("last_name").default("").notNull(),
  location: text("location").default("").notNull(),
  phoneNumber: text("phone_number"),
  avatar: text("avatar"),
  homepageStats: text("homepage_stats"),
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull().default("reset_password"),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Song Library
export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  publicId: varchar("public_id", { length: 6 }).notNull().unique(),
  danceName: text("dance_name").notNull(),
  songName: text("song_name").notNull(),
  artist: text("artist").default("").notNull(),
  rating: integer("rating").notNull().default(0),
  style: text("style").notNull().default("LINE"),
  styleCustom: text("style_custom"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
});

// Dance Sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
});

// Saved Locations
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
});

// Buddy connections (friend requests)
export const buddies = pgTable("buddies", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Streak challenges between buddies (legacy)
export const streakChallenges = pgTable("streak_challenges", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").notNull(),
  challengedId: integer("challenged_id").notNull(),
  startDate: timestamp("start_date").notNull().defaultNow(),
  durationDays: integer("duration_days").notNull().default(7),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dance-Off Challenges (h2h or showdown)
export const danceOffs = pgTable("dance_offs", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(),
  type: text("type").notNull().default("h2h"),
  title: text("title").notNull().default(""),
  durationHours: integer("duration_hours").notNull().default(1),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  joinCode: text("join_code"),
  status: text("status").notNull().default("active"),
  challengedId: integer("challenged_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dance-Off Participants
export const danceOffParticipants = pgTable("dance_off_participants", {
  id: serial("id").primaryKey(),
  danceOffId: integer("dance_off_id").notNull(),
  userId: integer("user_id").notNull(),
  finalDanceCount: integer("final_dance_count"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Achievement tracking
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: text("achievement_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
  seenAt: timestamp("seen_at"),
});

// Many-to-Many link between Sessions and Songs
export const sessionDances = pgTable("session_dances", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  songId: integer("song_id").notNull(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  location: z.string().optional(),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, userId: true });

export const insertSongSchema = createInsertSchema(songs).omit({ id: true, userId: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, userId: true });
export const insertSessionDanceSchema = createInsertSchema(sessionDances).omit({ id: true });

// === EXPLICIT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type SessionDance = typeof sessionDances.$inferSelect;
export type InsertSessionDance = z.infer<typeof insertSessionDanceSchema>;

export type DanceOff = typeof danceOffs.$inferSelect;
export type DanceOffParticipant = typeof danceOffParticipants.$inferSelect;

// Request Types
export type CreateSongRequest = Omit<InsertSong, 'publicId'>;
export type UpdateSongRequest = Partial<Omit<InsertSong, 'publicId'>>;

export type CreateSessionRequest = InsertSession & {
  danceIds: number[];
};
export type UpdateSessionRequest = Partial<InsertSession> & {
  danceIds?: number[];
};

// Response Types
export type SongResponse = Song;
export type SessionResponse = Session & {
  dances: Song[];
};
export type StatsResponse = {
  totalDances: number;
  longestStreak: number;
  totalDaysDancing: number;
  uniqueLocations: number;
  mostFrequentLocation: string;
  mostFrequentLocationCount: number;
  mostFrequentSongName: string;
  mostFrequentDance: string;
  mostFrequentDanceCount: number;
  dancesThisMonth: number;
  mostRecentDance: string;
  mostRecentStyle: string;
  mostDancedDay: { date: string; count: number } | null;
  avgDancesPerSession: number;
  top3Dances: { danceName: string; songName: string; count: number }[];
  top3SwingSongs: { songName: string; danceName: string; style: string; count: number }[];
  lineDancesThisYear: number;
  swingDancesThisYear: number;
  totalDancesThisYear: number;
  lineDancesThisMonth: number;
  swingDancesThisMonth: number;
  totalLineDancesAllTime: number;
  totalSwingDancesAllTime: number;
  currentFavorite: string;
};

export const STYLE_OPTIONS = ['LINE', 'WCS', 'ECS', 'CSW', 'TWO', 'OTHER'] as const;
export type StyleOption = typeof STYLE_OPTIONS[number];

export const STYLE_INFO: Record<StyleOption, { label: string; short: string; color: string }> = {
  LINE: { label: 'Line Dance', short: 'LINE', color: '#895232' },
  WCS:  { label: 'West Coast Swing', short: 'WCS',  color: '#3B82F6' },
  ECS:  { label: 'East Coast Swing', short: 'ECS',  color: '#EC4899' },
  CSW:  { label: 'Country Swing',    short: 'CSW',  color: '#D85C31' },
  TWO:  { label: 'Two-Step',         short: 'TWO',  color: '#9512C9' },
  OTHER:{ label: 'Other',            short: 'OTHER',color: '#22C55E' },
};
