# Objective
Implement all features from the large user feature request.

# Tasks

### T001: Schema + DB migration [isFavorite on songs]
- Add isFavorite boolean col to songs table in shared/schema.ts
- DB migration via psql

### T002: StatsResponse type + storage getStats
- Add 8 new fields to StatsResponse
- Compute them in getStats()

### T003: Storage - toggleFavorite + getBuddyPublicStats
- Add toggleFavorite method (enforces single favorite per user)
- Update getBuddyPublicStats to include lineDanceCount, swingDanceCount, currentFavoriteSong

### T004: Routes - favorite toggle
- POST /api/songs/:id/favorite

### T005: Settings page (new)
- /settings route with Danger Zone, Dev Tools (admin), CSV download/import
- Cog icon in Profile header linking to /settings
- Remove those sections from Profile.tsx

### T006: Library - sort toggle + heart icon
- Sort by song/dance toggle (music note / stick figure icon)
- Swap title/subtitle per sort mode
- Heart icon per song, pink when isFavorite

### T007: Calendar - multiple sessions per day
- Filter → array of sessions
- Show each session in its own card
- "Add Another Session" button

### T008: Buddies card - new stats + current favorite
- Replace Best Streak / Days Active with Line / Swing counts
- "Favorite" = currentFavoriteSong (not most danced)

### T009: Home - new stat cards + renames
- Add new stat keys to ALL_STAT_KEYS
- Rename "Total Dances" → "Total Dances (All Time)", "Favorite Dance" → "Most Danced"
