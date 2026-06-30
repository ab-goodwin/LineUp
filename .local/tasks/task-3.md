---
title: Migrate auth to Supabase
---
# Supabase Auth Migration

## What & Why
Migrate authentication from Passport Local + bcrypt (server cookie sessions via connect-pg-simple) to Supabase Auth. Supabase Auth becomes the sole owner of credentials (email + password + auth UUID); the existing `users` table stays the source of truth for all profile/app data and keeps its existing numeric `users.id` used by every other table. All current tables will be emptied first, so there is NO legacy-user migration, NO bcrypt fallback, and NO placeholder emails — everyone creates a fresh account. The user already has a Supabase project to connect.

## Done looks like
- A new account is created with username, email, password, first name, last name. The credentials live only in Supabase Auth; the `users` row stores the profile plus `email` and `supabase_auth_id`. No password is ever stored in our database.
- Users log in with **username + password** (not email). Login still works exactly as before from the user's perspective.
- Login persists across page refreshes.
- Logout signs the user out everywhere.
- Forgot Password asks for an email and sends a Supabase reset email; a new Reset Password page lets the user set a new password.
- All dance/session/stats/buddies/profile features keep working unchanged, still scoped by the existing `users.id`.
- No Passport, bcrypt, LocalStrategy, serialize/deserialize, express-session, or custom reset codes remain in the codebase.

## Out of scope
- Migrating any existing user data (all tables are being wiped first).
- Converting any table to Supabase UUIDs — `users.id` (integer) stays the join key everywhere.
- Redesigning UI, routes, or any dance/session/statistics business logic.
- Social/OAuth login providers (email + password only).

## Key architectural decisions (constraints for the executor)
- **Username login without leaking emails:** do the credential exchange server-side. Frontend posts `{ username, password }` to `/api/login`; the server looks up the email by username, calls Supabase `signInWithPassword`, and returns the Supabase session (access + refresh tokens). The frontend then hydrates the client Supabase session with `setSession(...)`. Do NOT expose an endpoint that returns an email for an arbitrary username.
- **Token-based requests:** the app moves from cookie sessions to Supabase JWTs. The frontend must attach `Authorization: Bearer <access_token>` to every API request (update the shared query/fetch wrapper). The backend `requireAuth` validates the token with Supabase, finds the `users` row via `supabase_auth_id`, and attaches it as the current user. Keep returning 401 on failure so existing frontend 401 handling still works.
- **Two Supabase clients:** a browser client (anon key) for `signUp`, `setSession`, `getSession`, `onAuthStateChange`, `signOut`, `resetPasswordForEmail`, `updateUser`; and a server client (service-role key) for the server-side `signInWithPassword` during login and for verifying tokens / admin lookups.
- **Email confirmation must be OFF** in the Supabase project (Auth settings) so a freshly registered user can log in immediately, matching today's register-then-login flow. Document this; it's a dashboard setting, not code.
- **Schema changes only via `psql`**, never `drizzle-kit push` (it would drop the connect-pg-simple `user_sessions` table).

## Steps
1. **Connect Supabase + env vars** — Wire the user's Supabase project through the Replit Supabase integration. Add the frontend env vars (Supabase URL + anon key, `VITE_`-prefixed) and backend env vars (Supabase URL + service-role key). In the Supabase dashboard: turn OFF "Confirm email", and add the app's password-reset redirect URL to the allowed Redirect URLs.
2. **Empty tables (prerequisite, destructive)** — All app tables are to be wiped so everyone starts fresh. Confirm this is done (or do it) before relying on the new auth, since old rows have no `email`/`supabase_auth_id`.
3. **Schema update** — Add `email` (unique) and `supabase_auth_id` (uuid) to the `users` table and Drizzle schema; remove the now-unused `password_hash` column and its schema field. Update the register input schema/types to include `email`.
4. **Supabase client setup** — Add the browser Supabase client and the server (service-role) Supabase client modules.
5. **Registration** — Create the Supabase Auth user via `signUp(email, password)`, store the returned auth UUID in `users.supabase_auth_id`, and save username/email/first/last into the `users` row. Remove all bcrypt hashing. Add the email field to the registration form.
6. **Login** — Server looks up email by username, calls `signInWithPassword`, returns the session; client hydrates the session and loads the current user. Keep the username + password UI.
7. **Backend session/middleware** — Replace `requireAuth` to validate the Supabase JWT and resolve the user by `supabase_auth_id`; update `/api/me` to return that user. Remove express-session, connect-pg-simple wiring, and `passport.initialize()/session()`.
8. **Frontend auth state** — Update the auth context to use Supabase `getSession` + `onAuthStateChange` for persistence across refresh, and update logout to call `signOut`. Update the shared fetch/query wrapper to attach the bearer token.
9. **Password reset** — Forgot Password page submits an email and calls `resetPasswordForEmail`; add a Reset Password page that calls `updateUser({ password })`. Remove the custom verification-code / Twilio SMS password-reset path (`/api/auth/forgot-send`, `/api/auth/forgot-reset`, `verifyAndReset` password branch). If `verification_codes` is also used for a non-password feature (e.g. username change), leave that part intact; otherwise remove it.
10. **Remove Passport & cleanup** — Delete passport-local, bcrypt comparisons, LocalStrategy, serialize/deserialize, and any now-dead manual auth middleware. Remove only code that is no longer used.
11. **Verify** — Register a new account, log in by username, refresh the page (still logged in), exercise a dance/session/profile feature, log out, and run the forgot/reset email flow end to end.

## Deliverables to summarize at the end
Modified + new files, the SQL `ALTER TABLE` statements run, required Supabase dashboard settings (email confirmation off, redirect URLs), new environment variables, and a short explanation of how auth now works.

## Relevant files
- `server/auth.ts`
- `server/index.ts`
- `server/routes.ts`
- `server/storage.ts`
- `shared/schema.ts`
- `client/src/context/AuthContext.tsx`
- `client/src/pages/AuthPage.tsx`
- `client/src/lib/queryClient.ts`
- `client/src/App.tsx`
- `replit.md`