# System Architecture (V2)

This document describes the updated technical architecture to support authentication, project management, and report persistence.

## Approach: Full-Stack Web Application

To support user accounts and data persistence, the architecture moves from a stateless SPA to a standard Client-Server model with a database.

### 1. Frontend (Client)
- **Framework:** React SPA (e.g., Next.js, Vite).
- **Views Required:**
  - **Auth:** Login / Registration screens.
  - **Dashboard:** List of user's projects.
  - **Project Detail:** List of past reports (colored Green/Yellow based on sent status).
  - **Generator:** The existing raw text input -> editable form view.
- **State Management:** Must maintain the current `userId` and active `projectId`.

### 2. Backend & Database
- **Authentication:** JWT-based or session-based authentication.
- **API:** RESTful endpoints to CRUD Projects and Reports.
- **Database Schema (Relational / Document):**
  - `User`: id, email, password_hash
  - `Project`: id, name, user_id
  - `Actor`: id, project_id, type (e.g. "Maitre d'oeuvre"), nom, prenom, societe, adresse, poste, email, telephone, photo_blob
  - `Report`: id, project_id, content (JSON), status (ENUM: unsent, sent), date_created, recipients (Array of actor_ids)

### 3. AI Processing (API Route)
- A serverless function or backend endpoint receives the raw notes.
- Queries a Hosted LLM (e.g., GPT-4o-mini).
- Returns the strict JSON object mapping to `docs/domain/cr-structure.md`.

### 4. Temporary Simulation Strategy (No-Node Environment)
Due to the current environment lacking Node.js/NPM, we will simulate this architecture entirely in the browser using **Vanilla HTML/JS and `localStorage`**:
- `localStorage.users` = Mock Auth
- `localStorage.projects` = Mock DB Table
- `localStorage.reports` = Mock DB Table
- `localStorage.actors` = Mock DB Table (Project Stakeholders)
- The UI will be updated to handle routing via DOM manipulation (hiding/showing screens) to demonstrate the flow immediately.
