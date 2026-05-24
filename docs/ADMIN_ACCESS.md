# BRICLOG admin access

Admin UI and `/api/admin/*` are **operator-only**. Access is not granted via `profiles.role` alone; the server always checks the signed-in user's email against `BRICLOG_ADMIN_EMAILS`.

## Operator allowlist (server env only)

Set on the **server** (`.env.local`, Vercel/host env). Never expose in `NEXT_PUBLIC_*`.

```env
BRICLOG_ADMIN_EMAILS=hscktg@gmail.com
```

- Comma-separated, case-insensitive.
- Add or remove operators only by changing this env and redeploying.
- Do **not** set admin via the client, Supabase dashboard profile edits, or SQL unless you use the **service role** and understand the role guard trigger (`schema-v11-admin-role-guard.sql`).

## Layers

| Layer | Behavior |
|--------|----------|
| `BRICLOG_ADMIN_EMAILS` | Source of truth for operator email |
| `middleware.js` | `/api/admin/*` → 404 without valid Bearer + allowlisted email |
| `lib/api/adminGuard.js` | Same check + light rate limit on admin API routes |
| `app/admin/*` | Client redirect to `/` if not allowlisted (session in sessionStorage) |
| Sidebar | "관리자" link only when profile role is server-trusted `ADMIN` |
| `/api/auth/profile` | `role` derived from JWT email + allowlist, not raw DB value |
| `profiles` DB trigger | Blocks self-service `ADMIN` inserts/updates (service role exempt) |

## Verification

```powershell
npm run build
```

- Logged-in **non-admin**: `GET /admin` → redirect to `/`; `GET /api/admin/stats` → **404**
- **Allowlisted** operator: `/admin` and admin APIs work
- Optional: `BRICLOG_ADMIN_RATE_LIMIT_PER_MIN=40` (default 40 req/min per IP on admin API)

## Related

- Morning checklist: [MORNING_CHECKLIST.md](./MORNING_CHECKLIST.md)
- Billing owner bypass: [TOSS_PAYMENTS_SETUP.md](./TOSS_PAYMENTS_SETUP.md)
