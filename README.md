# LogicBuild — Dockerized Code Judge

A full-stack competitive programming platform where users can solve problems, battle in real-time, and track their progress on a leaderboard. Supports 9 programming languages with isolated Docker/Kubernetes sandbox execution.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [Environment Variables](#environment-variables)
- [Seeding the Database](#seeding-the-database)
- [Running Locally (Development)](#running-locally-development)
- [Kubernetes Deployment](#kubernetes-deployment)
- [API Reference](#api-reference)
- [Supported Languages](#supported-languages)

---

## ✨ Features

- 🧩 **Problem Library** — Browse, search, and filter by difficulty and tags
- ⚔️ **Code Battles** — Real-time 1v1 matchmaking by difficulty using Socket.io
- 🏆 **Leaderboard** — ELO-based global ranking with dynamic points per problem
- 🖥️ **Multi-language IDE** — Monaco editor with 9 language support
- 🐳 **Sandboxed Execution** — Code runs in isolated Docker containers (or K8s pods)
- 📊 **Admin Panel** — Create, edit, delete problems with tags, difficulty, and custom points
- ✅ **Solved Tracking** — Problems marked as solved after a correct submission

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Monaco Editor, Socket.io Client |
| **Backend API** | Node.js, Express, Socket.io |
| **Queue/Worker** | BullMQ (Redis-backed job queue) |
| **Database** | PostgreSQL 15 |
| **Cache / Pub-Sub** | Redis |
| **Code Execution** | Docker-in-Docker (DinD) or Kubernetes pods |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Deployment** | Docker Compose (dev) / Kubernetes (prod) |

---

## 📁 Project Structure

```
Execution Engine/
├── src/                    # Backend source
│   ├── index.js            # Express API + Socket.io server
│   ├── queue.js            # BullMQ worker (code execution)
│   ├── db.js               # PostgreSQL queries
│   ├── executor.js         # Docker / K8s sandbox runner
│   └── schema.sql          # Database schema
├── frontend/               # React frontend (Vite)
│   ├── src/
│   │   ├── pages/          # Route-level page components
│   │   ├── components/     # Shared components
│   │   ├── context/        # Auth & Socket contexts
│   │   └── index.css       # Global styles
│   └── Dockerfile.frontend
├── docker/                 # Language runner Docker images
│   ├── python-runner/
│   ├── cpp-runner/
│   ├── java-runner/
│   ├── kotlin-runner/
│   ├── go-runner/
│   ├── php-runner/
│   ├── dart-runner/
│   ├── c-runner/
│   └── sql-runner/
├── k8s/                    # Kubernetes manifests
│   ├── namespaces.yaml
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   └── rbac.yaml
├── migrations/             # SQL migration files
├── seed.js                 # Database seeder (sample problems + users)
├── Dockerfile.backend
├── docker-compose.yml
├── deploy-k8s.ps1          # K8s deploy script (PowerShell)
└── build_k8s_images.ps1    # Build K8s images script (PowerShell)
```

---

## ✅ Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Engine running)
- [Node.js 18+](https://nodejs.org/) (only needed for running seed.js locally)
- Git

> **For Kubernetes deployment:** Enable Kubernetes in Docker Desktop Settings → Kubernetes → Enable Kubernetes

---

## 🚀 Quick Start (Docker Compose)

### Step 1 — Clone the repository

```bash
git clone <your-repo-url>
cd "Execution Engine"
```

### Step 2 — Create the `.env` file

```bash
cp .env .env.local   # or create manually (see Environment Variables section)
```

### Step 3 — Build language runner images

These sandbox images must be built before starting the API:

```bash
docker compose build cpp-runner python-runner java-runner kotlin-runner go-runner php-runner dart-runner c-runner sql-runner
```

### Step 4 — Start the full stack

```bash
docker compose up -d db redis api frontend
```

Services will start in order:
- `db` — PostgreSQL on port `5433`
- `redis` — Redis on port `6379`
- `api` — Express API on port `3000`
- `frontend` — React app on port `5173`

### Step 5 — Seed the database

On first run, seed the database with sample problems and a test admin user:

```bash
node seed.js
```

### Step 6 — Open the app

```
http://localhost:5173
```

**Default seeded credentials:**

| Role | Email | Password |
|---|---|---|
| User | `test@example.com` | `password123` |

---

## 🔧 Environment Variables

The `.env` file in the project root is used for the backend API:

```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=engine_password
DB_HOST=localhost
DB_PORT=5433
DB_NAME=postgres
JWT_SECRET=your-secret-key-here
REDIS_HOST=localhost
REDIS_PORT=6379
EXECUTION_STRATEGY=docker      # 'docker' or 'k8s'
DOCKER_TEMP_VOLUME=execution_engine_temp
```

> **Note:** When running via Docker Compose, `DB_HOST` must be `db` and `REDIS_HOST` must be `redis` (the Docker service names). The `.env` values with `localhost` are for running the API natively outside Docker.

---

## 🌱 Seeding the Database

```bash
node seed.js
```

This will:
- Create all tables (if they don't exist) from `src/schema.sql`
- Insert 10 sample problems (Easy / Medium / Hard)
- Create a default test user

To reset and re-seed:

```bash
# Stop the DB container, remove its volume, then restart
docker compose down -v
docker compose up -d db
node seed.js
```

---

## 💻 Running Locally (Development)

To develop without Docker (API and frontend only, DB + Redis still via Docker):

```bash
# Terminal 1 — Start DB & Redis only
docker compose up -d db redis

# Terminal 2 — Start the backend API
npm install
npm run dev

# Terminal 3 — Start the frontend
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:3000`

---

## ☸️ Kubernetes Deployment

> Requires Kubernetes enabled in Docker Desktop.

### Step 1 — Build K8s images

```powershell
.\build_k8s_images.ps1
```

### Step 2 — Deploy to cluster

```powershell
.\deploy-k8s.ps1
```

Or use the slash command from the IDE:
```
/deploy-k8s
```

### Step 3 — Verify pods

```bash
kubectl get pods -n code-judge
kubectl get pods -n sandbox
```

**K8s port mappings:**

| Service | Port |
|---|---|
| API (LoadBalancer) | `localhost:3001` |
| Frontend (LoadBalancer) | `localhost:80` |

---

## 📖 API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login, returns JWT |
| `GET` | `/me` | Get current user (auth required) |

### Problems

| Method | Endpoint | Description | Query Params |
|---|---|---|---|
| `GET` | `/problems` | List problems (paginated) | `page`, `difficulty`, `tag`, `search` |
| `GET` | `/problems/:id` | Get problem details + test cases | — |
| `POST` | `/problems` | Create a problem | — |
| `PUT` | `/problems/:id` | Update a problem | — |
| `DELETE` | `/problems/:id` | Delete a problem | — |

**Create/Update problem body:**
```json
{
  "title": "Sum of Two Numbers",
  "description_bn": "...",
  "input_format_bn": "...",
  "output_format_bn": "...",
  "sample_input": "1 2",
  "sample_output": "3",
  "difficulty": "Easy",
  "points": 5,
  "tags": ["Math", "Basic"],
  "test_cases": [
    { "input": "1 2", "expected_output": "3", "is_sample": true }
  ]
}
```

### Submissions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/submit` | Submit code for a problem |
| `GET` | `/submissions` | List user's submissions |
| `DELETE` | `/submissions` | Clear submission history |
| `GET` | `/jobs/:id` | Poll job status (playground) |

### Leaderboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/leaderboard` | Paginated leaderboard |

---

## 🌐 Supported Languages

| Language | Runner Image |
|---|---|
| Python 3 | `python-runner` |
| C++ 17 | `cpp-runner` |
| Java 17 | `java-runner` |
| Kotlin | `kotlin-runner` |
| Go 1.21 | `go-runner` |
| PHP 8.2 | `php-runner` |
| Dart | `dart-runner` |
| C | `c-runner` |
| SQL | `sql-runner` |

---

## 🔄 Updating the App

After making code changes:

```bash
# Rebuild and restart only API and frontend (preserves DB data)
docker compose up -d --build api frontend
```

To rebuild a specific language runner:

```bash
docker compose build python-runner
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot connect to Docker socket` | Make sure Docker Desktop is running |
| `Port 5433 already in use` | Change `DB_PORT` in `.env` or stop the conflicting service |
| `JWT_SECRET not set` | Set `JWT_SECRET` in `.env` |
| `Submission stuck in Queued` | Check Redis is running: `docker compose ps redis` |
| `No runner image found` | Build runner images: `docker compose build python-runner` |
