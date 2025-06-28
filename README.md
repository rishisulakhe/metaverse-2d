# 🌌 Metaverse-2D

A real-time, multiplayer 2D virtual world built with modern web technologies — complete with authentication, user profiles, admin control, dynamic spaces, and interactive elements.

---

## 🚀 Overview

**Metaverse-2D** enables users to create and interact in custom 2D virtual spaces in real-time. Designed with scalability in mind using a Turborepo monorepo structure, it supports modular development across multiple services — HTTP APIs, WebSocket server, and frontend UI.

---

## 🔐 Authentication System

- **User Registration & Login:** Secure signup/signin with validation.
- **Role-based Access Control:** Admin and regular user roles.
- **JWT Token Authentication:** Secure API access with bearer tokens.
- **Duplicate Registration Prevention:** Unique usernames enforced.

---

## 👤 User Management

- **User Profiles:** Avatar selection and custom metadata.
- **Avatar System:** Admin-managed avatar gallery.
- **Bulk User Fetching:** Efficient participant listing.
- **Validation:** All user actions authenticated and authorized.

---

## 🗺️ Virtual Space System

- **Space Creation:** Users can create and customize spaces.
- **Map Templates:** Reusable layouts created by admins.
- **Space Ownership:** Full CRUD for user-created spaces.
- **Empty Spaces:** Start from a blank canvas if desired.
- **Space Discovery:** Browse and join existing spaces.

---

## 🎮 Interactive Elements

- **Element Placement:** Add/remove items in spaces.
- **Admin Tools:** Create and update element types (images, dimensions, etc.).
- **Boundary Validation:** Prevents placing elements outside allowed regions.
- **Static Elements:** Decorative only, for visual design.
- **Dynamic Placement:** Real-time interaction with elements.

---

## 🎨 Admin Dashboard

- **Content Management:** Control avatars, templates, elements.
- **Element Creation:** Upload assets, define behaviors.
- **Map Templates:** Design reusable space blueprints.
- **Avatar Library:** Manage user avatar selections.
- **Element Updates:** Edit element details.

---

## 🔌 Real-Time Features (WebSocket)

### 👥 Live User Presence
- Track users in shared spaces in real time.

### 🕹️ Movement System
- Smooth real-time movement.
- Movement validation (boundaries, distances).
- "Game-like" one-block movement enforcement.

### 📢 Space Events
- Join/leave notifications.
- Spawn point assignment.
- Real-time position updates.

### 🧹 Connection Management
- Clean connection handling and automatic disconnection cleanup.

---

## 🛠️ Tech Stack

| Layer           | Tech Used                             |
|----------------|----------------------------------------|
| **Monorepo**    | Turborepo                             |
| **Frontend**    | React + TypeScript (`apps/frontend`)  |
| **API Server**  | Node.js + Express + TypeScript (`apps/http`) |
| **Realtime**    | WebSocket Server (`apps/ws`)          |
| **Database**    | PostgreSQL + Prisma ORM               |
| **Auth**        | JWT + bcrypt                          |
| **Testing**     | Jest                                  |
| **Build Tools** | TypeScript, Prisma, Turbo             |

---

## 📁 Project Structure (Monorepo)

