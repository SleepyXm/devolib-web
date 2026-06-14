# LIDE
### A live development environment that actually understands your project.

Import a repo or start from scratch — LIDE containerises it, gives it a domain, detects your stack, pulls dependencies, and surfaces everything about your running project in one place. The frontend gets reverse proxied so it can talk to your backend and database without either leaving the container.

Think Replit meets Vercel, built for developers who want to **interact** with their project, not just deploy it.

---

## Why LIDE

Most dev tooling splits your workflow into pieces. You deploy somewhere, you test somewhere else, you introspect your schema in another tab, and you paste curl commands into Postman to verify things work. LIDE doesn't do that.

The environment knows what your project is. It reads your source, maps your stack, and keeps a live structural model of your app — endpoints, pages, functions, schema — updated in real time as you work. Every feature in LIDE is built on top of that model, which means code gen, test gen, and live introspection all have actual context. Not guesses.

---

## What it does

### Stack Determinism
LIDE figures out what your project is without you telling it. It walks your repo via AST parsing, regex, and filesystem traversal — identifying pages, API endpoints, exported functions, and database schema directly from source. That model stays in sync with what's running. Edit a route, add a table, rename a function — the environment reflects it immediately.

### Containerised Hosting + Domain Generation
Every project gets its own isolated container and a generated domain on creation. Backend services and the database stay inside the container boundary. The frontend is reverse proxied out, letting it communicate with them cleanly — no manual CORS config, no local port juggling, no exposure of internal services.

### Terminal Interactivity
Direct terminal access into the running container. No SSH setup, no context switching to another tool. Run migrations, inspect logs, install packages, or debug live — all from within the environment.

### Endpoint Test Generation
LIDE reads your existing function signatures and generates test data for your API endpoints automatically. No manual spec writing, no Postman collections to maintain. The generator has real context about your project — it knows the shape of your functions because it's already parsed them.

### Code + Component Generation
Generate components, boilerplate, and scaffolding from within the environment. Because LIDE already has a structural map of your project, generated code integrates with what's there — it's not just dumping a template.

### Live Project Introspection
Endpoints, functions, pages, and schema are surfaced in real time as a navigable interface — not as static docs that go stale. The introspection layer updates as you edit, so what you're looking at always reflects the actual running state of the project.

### Design Editor
UI preview, schema management, and component generation consolidated into one interface. Edit your frontend visually, manage your database schema, and generate components — without leaving the environment.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│                  Container                   │
│                                              │
│   ┌─────────────┐     ┌──────────────────┐  │
│   │   Backend   │────▶│    PostgreSQL     │  │
│   │  (FastAPI)  │     │                  │  │
│   └──────┬──────┘     └──────────────────┘  │
│          │                                   │
│   ┌──────▼──────┐                            │
│   │  Reverse    │                            │
│   │   Proxy     │                            │
│   └──────┬──────┘                            │
└──────────┼───────────────────────────────────┘
           │
   ┌───────▼────────┐
   │    Frontend    │  ← public domain
   │   (Next.js)    │
   └────────────────┘
```

The backend and database never leave the container. The frontend is the only surface that's exposed, and it communicates inward through the proxy. This keeps the network boundary clean without requiring any configuration from you.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI |
| Frontend | Next.js |
| Database | PostgreSQL |
| Distribution | Evaluating Tauri port |

> **Tauri port** — currently evaluating a native desktop distribution via Tauri given runtime environment constraints. The goal is a self-contained binary that doesn't require a separate server setup.

---

## Setup

```bash
git clone https://github.com/SleepyXm/LIDE.git
cd LIDE
npm install
cp .env.example .env
```

Configure your environment:

```env
PORT=3000
DATABASE_URL=postgres://...
```

Start the environment:

```bash
npm run dev
```

Runs at `http://localhost:3000`.

---

## Status

Active development. Solo project — built and maintained by [@SleepyXm](https://github.com/SleepyXm).

Core features (containerisation, stack detection, domain generation, terminal, test gen, code gen, design editor) are implemented. Distribution and additional runtime targets are in evaluation.

---

## License

MIT
