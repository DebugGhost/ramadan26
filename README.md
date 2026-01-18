# UAlberta MSA Iftar Portal 🌙

A race-condition-safe daily sign-up system for Ramadan Iftar meals built with Next.js 14, Supabase, and Google OAuth.

## Features

- ✅ **Student Portal**: Reserve Iftar spots with real-time capacity updates
- 🔐 **@ualberta.ca Only**: Google OAuth restricted to University of Alberta emails
- ⚡ **Race-Condition Safe**: Atomic database operations prevent overbooking
- 📋 **Waitlist System**: Automatic promotion when spots open up
- 👥 **Volunteer Kiosk**: PIN-protected check-in interface with real-time updates
- 🔄 **Real-Time Updates**: Live capacity and booking status changes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database & Auth**: Supabase (PostgreSQL + Google OAuth)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Deployment**: Vercel

## Getting Started

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account ([supabase.com](https://supabase.com))
- Google OAuth credentials

### 2. Supabase Setup

1. **Create a new Supabase project**

2. **Run database migrations** in the SQL Editor (in order):
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_functions.sql`
   - `supabase/migrations/004_triggers.sql`

3. **Seed Ramadan dates**:
   - Run `supabase/seed_ramadan_days.sql` in the SQL Editor

4. **Configure Google OAuth**:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

5. **Get your API keys**:
   - Go to Settings > API
   - Copy `Project URL`, `anon public` key, and `service_role` key (keep secret!)

### 3. Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env.local
   ```

3. **Fill in `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   VOLUNTEER_PIN=1234
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Open**: [http://localhost:3000](http://localhost:3000)

### 4. Testing the Application

**Student Flow**:
1. Click "Sign in with Google"
2. Sign in with your @ualberta.ca email
3. Click "Reserve Spot for Today"
4. See confirmation status (confirmed/waitlisted)

**Volunteer Flow**:
1. Navigate to `/volunteer`
2. Enter PIN (default: 1234)
3. See list of confirmed bookings
4. Toggle check-in status for students

## Project Structure

```
ramadan26/
├── app/
│   ├── page.tsx              # Landing page with Google OAuth
│   ├── dashboard/            # Student portal (protected)
│   │   ├── page.tsx          # Dashboard server component
│   │   ├── dashboard-client.tsx  # Interactive client component
│   │   └── actions.ts        # Server actions (reserve/cancel)
│   ├── volunteer/            # Volunteer kiosk (PIN-protected)
│   │   ├── page.tsx          # Kiosk server component
│   │   └── volunteer-client.tsx  # Kiosk client component
│   ├── auth/
│   │   ├── callback/         # OAuth callback handler
│   │   ├── sign-in/          # Sign-in route
│   │   └── sign-out/         # Sign-out route
│   └── api/
│       └── volunteer/        # Volunteer API routes
├── lib/
│   ├── supabase/             # Supabase client configs
│   │   ├── client.ts         # Browser client
│   │   ├── server.ts         # Server client
│   │   └── middleware.ts     # Session refresh helper
│   └── types.ts              # TypeScript types
├── supabase/
│   └── migrations/           # Database SQL files
├── middleware.ts             # Next.js middleware
└── .env.local                # Environment variables
```

## Database Schema

### Tables

**profiles**: User information (extends auth.users)
- `id`, `email`, `full_name`, `role`

**days**: Iftar dates and capacity settings
- `date`, `is_open`, `capacity_limit`

**bookings**: User reservations
- `id`, `user_id`, `day_id`, `status`, `checked_in`

### Key Functions

**`reserve_spot(day_date)`**: Atomically reserves a spot
- Returns: `CONFIRMED`, `WAITLISTED`, `ALREADY_BOOKED`, `DAY_CLOSED`, or `FULL`
- Uses row-level locking to prevent race conditions

**`auto_promote_waitlist()`**: Trigger that promotes waitlisted users when spots open

## Deployment (Vercel)

1. **Push to GitHub**

2. **Import to Vercel**:
   - Connect your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add environment variables** in Vercel dashboard:
   - All variables from `.env.local`
   - Update `NEXT_PUBLIC_SITE_URL` to your production URL

4. **Update Google OAuth**:
   - Add your Vercel domain to Google OAuth authorized redirect URIs

5. **Deploy**!

## Security

- ✅ Google OAuth restricted to `@ualberta.ca` domains (enforced in callback)
- ✅ Row Level Security (RLS) policies prevent unauthorized data access
- ✅ Service role key only used server-side for volunteer kiosk
- ✅ Atomic database operations prevent race conditions
- ✅ PIN-protected volunteer kiosk with session cookies

## Support

For issues or questions, contact the UAlberta MSA tech team.

---

**Ramadan 2026** • Feb 18 - Mar 18 • University of Alberta Muslim Students' Association
