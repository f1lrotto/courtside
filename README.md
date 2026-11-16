# Courtside

A private site where friends mark when they can play padel. It shows times when enough of you are free and a court is open:

- **Doubles**: 4+ friends free for the whole game, plus any doubles court free at **Aurial Padel Bratislava** (Bajkalská, 12 courts) or **Oura Padel** (kurt 1, kurt 2).
- **Singles**: 2+ friends free, plus **Oura's single court** free.
- **One short**: exactly 3 free, plus a doubles court free.

Aurial Rača is not included.

Someone who only plays singles is never counted for doubles or one short, and someone who only plays doubles is never counted for singles.

Matches suggest the start with the cheapest free court and flag a game in orange when every cheaper court is booked at that time (the clubs publish prices for booked slots too).

The **Plan** tab picks a set of games per week: each person sets how many games a week they want and their match size (singles, doubles, or both) on their account page, nobody is planned above that or twice in one day, the cheapest games per player go first, and each game goes to whoever has played least that week.

## Screens

- **Sign in / Sign up**: invite-only accounts
- **Welcome** (/welcome): guided setup right after sign-up: language and name, games per week and match size, and "I'm on a break for now"; it can be skipped and re-run from Account
- **Matches**: Plan, Doubles, Singles and One short tabs, game length, start times, prices and Book links
- **My availability**: a weekly grid you paint, with undo, an "I'm not playing this week" button (counts as filled in), your match size, and each person's match size (when not both) and status this week: filled in, not playing, on a break, or not yet
- **Courts**: a two-week heatmap and a per-court timeline for each day
- **Account** (your name, top right): name, games per week, match size (singles, doubles, or both; default both), a break for not playing a while (every week counts as not playing unless you mark times in it; turning it on clears your upcoming times), language, password, and the guided setup again
- **Admin**: invites, roles, password resets, removing people, court sync status

## Languages

English and Slovak. The language comes from the `lang` cookie set by the EN/SK switch in the header, otherwise from the browser's Accept-Language (Czech gets Slovak), otherwise English. All UI text, dates, prices and server error messages live in `src/lib/i18n.ts`.

## How court availability is fetched

Both clubs use the Paysy booking platform. Their reservation page renders server-side with `?date=DD.MM.YYYY` and embeds the Livewire component state in `wire:initial-data`. Each court ("object") lists its 30-minute `blocks` with `is_available` and `price`, so no booking or login is needed (see [`src/lib/server/paysy.ts`](src/lib/server/paysy.ts)).

- Aurial: `https://aurialpadel.sk/reservations/types/aurial-padel-bratislava?date=17.11.2026`
- Oura: `https://booking.ourapadel.com/?date=17.11.2026` (one page holds both the doubles and the single-court service)

The server refreshes the next 14 days every 15 minutes, one request at a time per club. Admins can also trigger a sync from /admin. Pages are fetched with `curl` because Cloudflare in front of Paysy rejects Node's built-in `fetch` (TLS fingerprint) but lets curl through. **The host needs `curl` installed.** If the clubs ever turn on a stricter Cloudflare check for your server's IP, /admin shows the failure per day, and the last good data stays visible.

## Accounts

Auth is [Better Auth](https://better-auth.com) (email + password, plus its admin plugin for roles and removing users), stored in the same SQLite file. Its tables (`user`, `session`, `account`, `verification`) are created or updated on startup.

Sign-up is invite-only: a Better Auth database hook rejects any new user whose email has no pending invite, and gives them the invite's role. On first start, set `ADMIN_EMAIL`. While no admin exists, that email is invited as admin; sign up with it at `/signup`. Then invite friends from **/admin**. No email is sent: tell them to sign up with that address, or copy their signup link.

Forgotten passwords: an admin presses the key icon next to the person on /admin. That sets a random temporary password, shown once, and signs them out everywhere; they change it on /account.

## Run

Requires Node 22.5+ (uses the built-in `node:sqlite`) and `curl`.

```sh
pnpm install
ADMIN_EMAIL=you@example.com pnpm dev       # http://localhost:5173

pnpm build
ADMIN_EMAIL=you@example.com ORIGIN=https://courtside.example.com \
  BETTER_AUTH_URL=https://courtside.example.com BETTER_AUTH_SECRET="$(openssl rand -base64 32)" node build
```

| Env var | Default | |
| --- | --- | --- |
| `ADMIN_EMAIL` | none | Bootstraps the first admin invite |
| `BETTER_AUTH_SECRET` | none | Signs sessions. Required outside `pnpm dev`; the server refuses to start without it. Keep it stable |
| `BETTER_AUTH_URL` | from request | Public URL of the app |
| `DATABASE_PATH` | `data/padel.db` | SQLite file; keep it on a persistent disk |
| `ORIGIN` | none | Public URL, required behind a proxy for form CSRF checks (adapter-node) |
| `SCRAPER` | on | Set to `off` to disable court syncing |

## Deploy

Production runs on [Railway](https://railway.com) from this repo's `Dockerfile` (Node 26 slim with curl), at https://padel.filiphupka.com:

- one replica in `europe-west4`, capped at 0.5 vCPU and 0.5 GB RAM (it idles around 0.11 GB); app sleeping is off because the court sync runs in-process every 15 minutes
- a 500 MB volume at `/data` holds the SQLite file (`DATABASE_PATH=/data/padel.db`)
- variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `ORIGIN` (both the public URL), `ADMIN_EMAIL`, `PORT=3000`
- DNS on Cloudflare: `padel` CNAME to the Railway domain, DNS only, plus Railway's `_railway-verify.padel` TXT record
- every push to `main` redeploys; `/login` is the healthcheck

## Tests

```sh
pnpm test     # matching engine, weekly planner and the Paysy parser (against a captured Oura page)
pnpm check    # svelte-check / TypeScript
```
