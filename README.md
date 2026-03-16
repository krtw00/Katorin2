# Katorin2 - Tournament Management System

[日本語](README.ja.md) | English

A web application for streamlining online tournament management for Yu-Gi-Oh! Master Duel.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Authentication + Realtime)
- **Hosting**: Vercel
- **Package Manager**: pnpm

## Features Implemented in MVP

### Phase 1: Core Features

1. **Authentication System**
   - Registration/login with email and password
   - Profile management

2. **Tournament Creation**
   - Single elimination format
   - Basic tournament information settings
   - Visibility settings (public / unlisted / private)

3. **Entry System**
   - Tournament registration
   - Master Duel ID input (optional)

4. **Tournament Progression Management**
   - Automatic bracket generation
   - Match result input (organizer only)
   - Automatic winner advancement

5. **Real-time Display**
   - Real-time tournament bracket updates
   - Automatic sync via Supabase Realtime

## Setup (Docker)

### Prerequisites

- Docker Desktop
- Traefik running (`~/work/infra/traefik`)
- Supabase project (cloud)

### Launch

```bash
# Create Traefik network (first time only)
docker network create traefik

# Start Traefik
cd ~/work/infra/traefik && docker compose up -d

# Create .env.local (set Supabase connection info)
cp .env.example .env.local

# Start the project
cd ~/work/projects/Katorin2
docker compose up -d
```

### Access

- App: http://katorin.localhost

### Commands

```bash
# Start
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down

# Rebuild
docker compose up -d --build
```

## Local Development (Not Recommended)

### 1. Environment Setup

```bash
# Install dependencies
pnpm install
```

### 2. Supabase Setup

See `supabase/README.md` for details.

**Overview:**
1. Create a new project on the [Supabase Dashboard](https://app.supabase.com/)
2. Run `supabase/migrations/001_mvp_schema.sql` in the SQL Editor
3. Get connection details from API settings
4. Create a `.env.local` file and set environment variables

```bash
# Create .env.local
cp .env.example .env.local

# Edit .env.local to set Supabase connection details
```

### 3. Start Development Server

```bash
pnpm dev
```

Access http://localhost:3000 in your browser.

## Testing Procedures

### 1. Authentication

1. Go to http://localhost:3000/auth/register
2. Register 2-3 new users (multiple accounts recommended for testing)
3. Verify login/logout works correctly

### 2. Tournament Creation

1. After logging in, click "Create Tournament"
2. Enter tournament details:
   - Tournament name: "Test Tournament"
   - Format: Single Elimination
   - Match format: bo3
   - Max participants: 8
   - Visibility: Public
3. Click "Create Tournament"
4. Verify redirect to tournament detail page

### 3. Entry System

1. Click "Enter" on the tournament detail page
2. Enter Master Duel ID (optional)
3. Verify return to tournament detail page after entry
4. Verify your name appears in the participant list
5. Log in with a different account and enter the same tournament (2-4 participants recommended)

### 4. Bracket Generation

1. Log in with the tournament organizer account
2. Click "Manage" from the tournament detail page
3. Click "Generate Bracket"
4. Verify the tournament bracket is generated
5. Check the display via "View Bracket"

### 5. Match Result Input

1. Enter match results on the tournament management page:
   - Player 1 score: 2
   - Player 2 score: 1
   - Click "Submit Result"
2. Verify the result is reflected on the bracket page
3. Verify the winner automatically advances to the next round

### 6. Real-time Updates

1. Open two browser windows
2. Display the bracket page in both
3. Enter a match result in one
4. Verify the result is automatically reflected in the other

### 7. My Page

1. After logging in, click "My Page" in the header
2. Verify profile information is displayed
3. Verify entered tournaments appear in the "Entered Tournaments" tab
4. Verify organized tournaments appear in the "Organized Tournaments" tab

## Directory Structure

```
src/
├── app/                       # Next.js App Router
│   ├── (auth)/               # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (main)/               # Main application
│   │   ├── tournaments/      # Tournament pages
│   │   │   ├── [id]/
│   │   │   │   ├── bracket/  # Tournament bracket
│   │   │   │   ├── entry/    # Entry page
│   │   │   │   └── manage/   # Management page
│   │   │   └── new/          # Tournament creation
│   │   └── my/               # My page
│   ├── auth/callback/        # Auth callback
│   └── mock/                 # UI mocks (development)
├── components/               # UI components
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # Layout components
│   └── tournament/           # Tournament components
├── lib/                      # Utilities
│   ├── supabase/             # Supabase client
│   └── tournament/           # Tournament logic
├── hooks/                    # Custom hooks
│   ├── useAuth.ts            # Auth hook
│   └── useRealtimeMatches.ts # Real-time update hook
└── types/                    # Type definitions
    ├── database.ts           # Database types
    └── tournament.ts         # Application types
```

## Database Schema

Tables used in the MVP:

- `profiles` - User profiles
- `tournaments` - Tournament information
- `participants` - Participants
- `matches` - Match records
- `notifications` - Notifications (fully implemented in Phase 2)

See `docs/04-data/database-design.md` for details.

## Features Planned for Phase 2

- Double elimination / Swiss draw
- Team battles
- Series / league system
- Deck registration
- Statistics / metagame analysis
- Social media sharing
- Discord integration
- Check-in system
- Participant result reporting

## Troubleshooting

### "relation does not exist" Error

Supabase migrations have not been executed. See `supabase/README.md` to run the migrations.

### Cannot Log In

1. Verify the Supabase project is correctly configured
2. Verify the environment variables in `.env.local` are correct
3. Verify email authentication is enabled in the Supabase Dashboard

### Real-time Updates Not Working

1. Verify Realtime is enabled in the Supabase project
2. Verify `ALTER PUBLICATION` was executed in migrations
3. Check the browser console for errors

### Bracket Generation Fails

1. Verify there are at least 2 participants
2. Verify the tournament status is "recruiting"
3. Check the browser console for error messages

## Development

### Code Formatting

```bash
pnpm format
```

### Linting

```bash
pnpm lint
```

### Build

```bash
pnpm build
```

## Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables (Vercel Dashboard or CLI)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

## License

MIT

## Author

Developed with Claude Code
