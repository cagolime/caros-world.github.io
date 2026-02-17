# Caro's World

Current runtime files:
- `index.html`
- `supabase-bridge.js`

Supabase setup file:
- `supabase.sql`

## Do we need `supabase.sql`?
- Not required at runtime in browser.
- Required for provisioning/reprovisioning database schema, policies, and storage bucket.
- Recommended to keep in repo.

## Setup
1. Run `supabase.sql` once in Supabase SQL Editor.
2. Open `index.html`.
