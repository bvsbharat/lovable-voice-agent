# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0749d947-7180-4df6-9b93-8ee135c26a1e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0749d947-7180-4df6-9b93-8ee135c26a1e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Local development (frontend + backend)

1) Frontend

```bash
npm install
npm run dev
# opens on http://localhost:8080
```

2) Backend (Express; Vapi optional)

```bash
cd server
npm install
cp .env.example .env # then edit with your keys
npm run dev
# backend on http://localhost:3001 (set PORT to override)
```

Backend env (create `server/.env`):
- `PORT=8081`
- `CORS_ORIGIN=http://localhost:8080`
- `MONGODB_URI=mongodb://localhost:27017/voice-agent-db` (or your MongoDB connection string)
- Optional Vapi: `VAPI_API_KEY=...` (if you add the Vapi server SDK)

Optional env (frontend):
- `VITE_API_BASE=http://localhost:3001`
- `VITE_VAPI_PUBLIC_KEY=<public key>`

### Backend API

- `GET /api/health`
- `GET /api/agents`
- `POST /api/agents` (body: agent config)
- `GET /api/agents/:id`
- `PUT /api/agents/:id`
- `DELETE /api/agents/:id`
- `POST /api/agents/:id/publish`
- `POST /api/agents/:id/preview-call`
- `GET /api/calls` (see Vapi docs `calls/list`)

### MongoDB Setup
- **Local MongoDB:** Install MongoDB locally and it will auto-connect to `mongodb://localhost:27017/voice-agent-db`
- **MongoDB Atlas:** Get connection string from Atlas and set `MONGODB_URI` in backend `.env`
- **No MongoDB:** Backend gracefully falls back to in-memory storage

**🎉 Vapi Integration Status: READY**

The application now includes full Vapi integration with the official Server SDK installed. To enable real voice agents:

1. Set up your API keys (see [SETUP_GUIDE.md](./SETUP_GUIDE.md))
2. Create environment files with your Vapi credentials
3. Start the application - agents will be automatically created in Vapi

**Without API keys**: The app gracefully falls back to simulation mode with all UI features working.
