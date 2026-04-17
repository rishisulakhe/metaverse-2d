# Metaverse 2D

A real-time multiplayer 2D virtual office built with Phaser 3, React, and WebSockets. Walk around a top-down office map, sit at desks, video-call nearby coworkers, share your screen, and collaborate on a shared whiteboard — all in the browser.

---

## Features

### Gameplay
- **Top-down 2D office map** rendered with Phaser 3 and Tiled tilemaps
- **4 playable characters** — Adam, Ash, Lucy, Nancy — each with idle, run, and sit animations
- **Smooth movement** via WASD / arrow keys with arcade physics and collision
- **Sitting mechanic** — press `E` near a chair to sit, `E` again to stand
- **Day / night background** that auto-selects based on local time, with animated scrolling clouds

### Multiplayer
- **Real-time player sync** over a native WebSocket server — positions, animations, and name tags update live for every connected client
- **Join / leave notifications** and a scrolling in-world chat
- **Private rooms** — spaces can be password-protected at creation time

### Communication
- **Proximity video calls** — walk close to another player and PeerJS automatically establishes a peer-to-peer video/audio call; walk away to disconnect
- **Screen sharing** — sit at a computer terminal and share your screen with anyone else at the same terminal
- **Shared whiteboard** — open a whiteboard item to collaborate in real time via an embedded [WBO](https://wbo.ophir.dev/) board
- **In-world dialog bubbles** — chat messages appear as speech bubbles above the sender's character

### Rooms & Spaces
- **Public lobby** listing all available spaces
- **Create custom rooms** with a name, dimensions, and optional password
- **Password-protected join** — a dialog prompts for the password before connecting

### Auth
- **Sign up / Sign in** with username and password (bcrypt-hashed, JWT-authenticated)
- Admin and user roles

---

## Architecture

```
metaverse-2d/
├── apps/
│   ├── frontend/        # Vite + React 19 + Phaser 3 client
│   ├── http/            # Express 5 REST API  (port 3000)
│   └── ws/              # Native ws WebSocket server (port 3001)
└── packages/
    ├── db/              # Prisma client + PostgreSQL schema
    └── types/           # Shared TypeScript types & WS message protocol
```

| Layer | Technology |
|---|---|
| Frontend framework | React 19, Redux Toolkit, MUI v5, styled-components |
| Game engine | Phaser 3 (arcade physics, Tiled tilemaps) |
| Real-time transport | Native `ws` WebSocket server |
| REST API | Express 5, Zod validation |
| Auth | JWT (`jsonwebtoken`), bcrypt |
| Database | PostgreSQL via Prisma ORM |
| WebRTC | PeerJS (proximity video/audio + screen share) |
| Build system | Turborepo + Vite (frontend), esbuild (ws/http) |
| Language | TypeScript throughout |

---

## Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 10
- **PostgreSQL** running locally (or a connection URL)

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/rishisulakhe/metaverse-2d.git
cd metaverse-2d/metaverse-2d
npm install
```

### 2. Configure environment variables

Create `.env` files for the packages that need them:

**`packages/db/.env`**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/metaverse2d"
```

**`apps/http/.env`**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/metaverse2d"
JWT_PASSWORD="your-secret-key"
```

**`apps/ws/.env`**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/metaverse2d"
JWT_PASSWORD="your-secret-key"
```

> `JWT_PASSWORD` must be the same value in both `http` and `ws`.

### 3. Set up the database

```bash
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

### 4. Start all services

From the monorepo root, start everything in parallel with Turborepo:

```bash
npm run dev
```

This launches:

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| HTTP API (Express) | http://localhost:3000 |
| WebSocket server | ws://localhost:3001 |

> The Vite dev server proxies `/api` requests to `localhost:3000` automatically — no CORS config needed for the browser.

### 5. Start services individually (optional)

If you prefer separate terminals:

```bash
# Terminal 1 — HTTP API
cd apps/http
npm run dev

# Terminal 2 — WebSocket server
cd apps/ws
npm run dev

# Terminal 3 — Frontend
cd apps/frontend
npm run dev
```

---

## Environment Variables Reference

| Variable | Package | Description |
|---|---|---|
| `DATABASE_URL` | `db`, `http`, `ws` | PostgreSQL connection string |
| `JWT_PASSWORD` | `http`, `ws` | Secret used to sign and verify JWTs |
| `VITE_WS_URL` | `frontend` (optional) | Override WebSocket URL (defaults to `ws://localhost:3001`) |

---

## API Reference

All REST endpoints are prefixed with `/api/v1`.

### Auth

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/signup` | `{ username, password, type }` | Create account (`type`: `"user"` or `"admin"`) |
| `POST` | `/signin` | `{ username, password }` | Returns `{ token }` |

### Spaces

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/space/public` | — | List all public spaces |
| `GET` | `/space/all` | Bearer | List spaces owned by the caller |
| `POST` | `/space` | Bearer | Create a space `{ name, dimensions, mapId?, password? }` |
| `DELETE` | `/space/:spaceId` | Bearer | Delete own space |
| `GET` | `/space/:spaceId` | — | Get space details + elements |
| `POST` | `/space/element` | Bearer | Add element to space |
| `DELETE` | `/space/element` | Bearer | Remove element from space |

### Admin (requires Admin role)

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/element` | Create an element |
| `PUT` | `/admin/element/:id` | Update element image |
| `POST` | `/admin/avatar` | Create an avatar |
| `POST` | `/admin/map` | Create a map with default elements |

---

## WebSocket Protocol

Connect to `ws://localhost:3001`. All frames are JSON `{ type, payload }`.

### Client → Server

| Type | Payload | Description |
|---|---|---|
| `join` | `{ spaceId, token, name?, anim?, password? }` | Join a space |
| `move` | `{ x, y, anim? }` | Update position |
| `update-name` | `{ name }` | Change display name |
| `chat` | `{ content }` | Send a chat message |
| `video-ready` | `{ peerId }` | Signal peer availability for WebRTC |
| `disconnect-stream` | `{ clientId }` | Notify stream disconnection |
| `connect-to-item` | `{ itemId, itemType }` | Join computer / whiteboard session |
| `disconnect-from-item` | `{ itemId, itemType }` | Leave computer / whiteboard session |
| `stop-screen-share` | `{ itemId }` | Stop screen share on a computer |

### Server → Client

| Type | Payload | Description |
|---|---|---|
| `space-joined` | `{ selfId, spawn, users[], whiteboardRooms }` | Initial state on join |
| `user-joined` | `{ id, name, x, y, anim, peerId? }` | Another player connected |
| `user-left` | `{ id }` | Player disconnected |
| `movement` | `{ id, x, y, anim? }` | Player moved |
| `user-updated` | `{ id, field, value }` | Player field changed (name, anim, peerId…) |
| `chat` | `{ id, author, content, createdAt }` | Broadcast chat message |
| `item-user-added` | `{ itemId, itemType, userId }` | Player joined computer/whiteboard |
| `item-user-removed` | `{ itemId, itemType, userId }` | Player left computer/whiteboard |
| `whiteboard-room` | `{ itemId, roomId }` | WBO room ID for a whiteboard |
| `join-rejected` | `{ reason }` | Join refused (bad password, etc.) |

---

## Controls

| Key | Action |
|---|---|
| `W` / `↑` | Move up |
| `S` / `↓` | Move down |
| `A` / `←` | Move left |
| `D` / `→` | Move right |
| `E` | Sit on nearby chair / stand up |
| `R` | Use computer / open whiteboard / vending machine |
| `Enter` | Open chat |
| `Esc` | Close chat |

---

## Project Structure

```
apps/frontend/src/
├── anims/           # Phaser animation definitions
├── characters/      # MyPlayer, OtherPlayer, PlayerSelector
├── components/      # React UI: Chat, LoginDialog, RoomSelectionDialog,
│                    #           ComputerDialog, WhiteboardDialog, Video
├── events/          # EventCenter (Phaser event bus between game and React)
├── items/           # Chair, Computer, Whiteboard, VendingMachine
├── scenes/          # Bootstrap, Background, Game (Phaser scenes)
├── services/        # Network (WebSocket client), Api (HTTP client)
├── stores/          # Redux slices: User, Room, Chat, Computer, Whiteboard
├── web/             # WebRTC, ShareScreenManager
├── App.tsx          # Root React component
├── PhaserGame.ts    # Phaser Game singleton
└── main.tsx         # React + Redux + MUI entry point
```

---

## Building for Production

```bash
npm run build
```

Output:
- `apps/frontend/dist/` — static files to serve from any CDN or web server
- `apps/http/dist/index.js` — bundled HTTP server
- `apps/ws/dist/index.js` — bundled WebSocket server

---

## Running Tests

```bash
cd apps/http
npx jest
```

Tests cover the full HTTP + WebSocket API surface against a real PostgreSQL database.
