# Collect

An AI agent that has awkward payment conversations on behalf of freelancers, so they don't have to.

## What it does

Collect drafts — and, once trusted, autonomously sends — payment reminders, negotiates delays and partial payments, and handles disputes. Trust is tracked **per client relationship** via a Trust Ladder, so the agent earns autonomy gradually and never acts beyond the boundaries you set.

## Setup

### Prerequisites
- Node 20.x LTS
- An Anthropic API key (get one at https://console.anthropic.com)

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and fill in your API key:

```
ANTHROPIC_API_KEY=your_key_here
DATABASE_URL="file:./dev.db"
```

### Database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### Run

```bash
npm run dev
```

App runs at http://localhost:3000

## The Trust Ladder

Trust is tracked per client, not globally. Three levels:

| Level | Score | Behavior |
|-------|-------|----------|
| 0 — Observe only | 0–39 | Every message drafted, nothing sends without your approval |
| 1 — Soft autonomy | 40–74 | Routine reminders auto-send; negotiations still need approval |
| 2 — Full autonomy | 75–100 | Agent handles negotiation within your set boundaries; anything outside boundaries escalates to you |

**Trust score deltas:**
- Approve unedited: +15
- Approve after editing: +5
- Reject: −10
- Override/undo an auto-send: −25
- Client pays on time after agent interaction: +10

**Escalation is always immediate** — if a client message contains any escalation keyword (refund, lawyer, cancel, chargeback, dispute, etc.), the agent stops and flags it for you regardless of trust level. This is the core safety net.

## API Reference

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/clients` | List all clients with trust scores and outstanding balances |
| POST | `/api/clients` | Create a new client |
| GET | `/api/clients/:id` | Full client detail — invoices, messages, trust history |
| PATCH | `/api/clients/:id` | Update boundary overrides or manual autonomy level |
| GET | `/api/invoices` | List invoices (filter by `?clientId=`) |
| POST | `/api/invoices` | Create a new invoice |
| GET | `/api/messages` | List messages (filter by `?status=drafted` for inbox) |
| POST | `/api/agent/draft` | Generate an agent draft for a given situation |
| POST | `/api/simulate-reply` | Inject a fake client reply and watch the agent respond |
| POST | `/api/messages/:id/approve` | Approve a drafted message (optionally with edited content) |
| POST | `/api/messages/:id/reject` | Reject a drafted message |

## Demo seed data

`npx prisma db seed` creates 4 demo clients:

1. **Riya Sharma** — Level 2 (score 82). Auto-sent routine reminder already in history.
2. **Dev Studio Co** — Level 1 (score 55). Negotiation response drafted and awaiting approval in inbox.
3. **Anjali Menon** — Level 0 (score 20). New client, first reminder draft waiting for approval.
4. **Kabir Retail** — Level 1 (score 60). Client message containing "refund" + escalated agent response — proves the safety net works at any trust level.

## Tech stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Prisma ORM + SQLite (swappable to Postgres — change `provider` in `schema.prisma`)
- Anthropic Claude (claude-opus-4-5) for message drafting and context reasoning

## License

MIT
