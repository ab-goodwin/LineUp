import { z } from 'zod';
import { 
  insertUserSchema, 
  users, 
  songs, 
  sessions,
  insertSongSchema,
  insertSessionSchema,
  updateProfileSchema,
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // --- Profile ---
  profile: {
    get: {
      method: 'GET' as const,
      path: '/api/profile',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/profile',
      input: updateProfileSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    deleteData: {
      method: 'POST' as const,
      path: '/api/profile/delete-data',
      input: z.object({
        type: z.enum(['sessions', 'songs', 'all']),
      }),
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
      },
    },
  },

  // --- Songs ---
  songs: {
    list: {
      method: 'GET' as const,
      path: '/api/songs',
      responses: {
        200: z.array(z.custom<typeof songs.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/songs',
      input: insertSongSchema.omit({ publicId: true }),
      responses: {
        201: z.custom<typeof songs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/songs/:id',
      input: insertSongSchema.omit({ publicId: true }).partial(),
      responses: {
        200: z.custom<typeof songs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/songs/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // --- Sessions ---
  sessions: {
    list: {
      method: 'GET' as const,
      path: '/api/sessions',
      responses: {
        200: z.array(z.custom<typeof sessions.$inferSelect & { dances: typeof songs.$inferSelect[] }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sessions/:id',
      responses: {
        200: z.custom<typeof sessions.$inferSelect & { dances: typeof songs.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sessions',
      input: insertSessionSchema.extend({
        danceIds: z.array(z.number()),
      }),
      responses: {
        201: z.custom<typeof sessions.$inferSelect & { dances: typeof songs.$inferSelect[] }>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/sessions/:id',
      input: insertSessionSchema.partial().extend({
        danceIds: z.array(z.number()).optional(),
      }),
      responses: {
        200: z.custom<typeof sessions.$inferSelect & { dances: typeof songs.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sessions/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // --- Stats ---
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          totalDances: z.number(),
          longestStreak: z.number(),
          totalDaysDancing: z.number(),
          uniqueLocations: z.number(),
          mostFrequentLocation: z.string(),
          mostFrequentLocationCount: z.number(),
          mostFrequentDance: z.string(),
          mostFrequentDanceCount: z.number(),
          dancesThisMonth: z.number(),
          mostRecentDance: z.string(),
          mostDancedDay: z.object({ date: z.string(), count: z.number() }).nullable(),
          avgDancesPerSession: z.number(),
          top3Dances: z.array(z.object({ danceName: z.string(), count: z.number() })),
        }),
      },
    },
  },
};

export type InsertUser = z.infer<typeof insertUserSchema>;

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
