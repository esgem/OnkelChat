# OnkelChat Project Memory

## Stack
- Next.js 16 (App Router, no Turbopack), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui (newer base-ui based components)
- Supabase (auth, DB, realtime)
- lucide-react for icons

## Key Conventions
- Next.js 16 uses `proxy.ts` instead of `middleware.ts` (deprecated)
- Run with `node node_modules/next/dist/bin/next dev` (the .bin/next symlink is broken)
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`
- Supabase join queries return profiles as arrays; cast with `as unknown as Type` or `as any`

## Project Structure
```
app/
  (auth)/login, signup   # public auth pages
  (app)/layout.tsx       # auth guard + sidebar, fetches groups
  (app)/groups/
    new/                 # create group
    [groupSlug]/         # group page = general chat + events list
      events/new/        # create event
      events/[eventId]/  # event overview + event chat
        dates/           # date polling
        activities/      # activity suggestions + voting
        menu/            # menu planning
      settings/          # group settings + invite link
  api/invites/[token]/   # POST to join group via token
  invite/[token]/        # join page
proxy.ts                 # auth redirect middleware
lib/supabase/client.ts, server.ts, middleware.ts
lib/types.ts
supabase/migrations/001_initial_schema.sql
```

## Data Model (key tables)
groups, group_members, profiles, events, event_dates, date_votes,
activity_suggestions, activity_votes, menu_items, messages, invite_tokens

## Setup Steps for New Supabase Project
1. Create project at supabase.com (Frankfurt region)
2. Run `supabase/migrations/001_initial_schema.sql` in SQL editor
3. Copy URL + anon key to `.env.local`
4. Enable Realtime for `messages` table (already in migration)

## Realtime
Chat uses Supabase Realtime postgres_changes subscription on `messages` table.
Channel name: `messages:{groupId}:{eventId|general}`
