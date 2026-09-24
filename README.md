# SNPS Squares

SNPS charity Super Bowl squares — single-admin app for running a charitable Super Bowl squares game.

See [REQUIREMENTS.md](./REQUIREMENTS.md) for the complete product specification.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS v4 (NFL theme)
- **Backend**: Supabase (Auth + PostgreSQL)
- **Routing**: React Router v7
- **Deployment**: Vercel (free tier)

## Phase 1 Status

✅ **Current scaffold includes:**
- Vite React TypeScript app with Tailwind CSS v4
- NFL-themed UI (#013369 primary blue, #D50A0A secondary red)
- Landing page with game overview
- Responsive 10×10 board shell with NFC/AFC labels
- Admin authentication stub (Supabase ready)
- Admin panel shell with placeholder controls
- SQL migration draft for database schema
- Environment configuration template

🚧 **Still needed for full v1:**
- Supabase project setup and configuration
- Square claiming flow with modal/form
- Payment status tracking (Venmo/Cash)
- Number randomization and locking logic
- Score entry/fetch and winner highlighting
- Email receipts (Resend or Supabase)
- CSV roster export with formula injection sanitization
- Join password protection
- Active game management

## Setup

### Prerequisites

- Node.js 18+ and npm
- A free Supabase account (for production)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Alems0/snps-squares.git
   cd snps-squares
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your Supabase credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `VITE_ADMIN_EMAIL`: Admin email (default: stecher2789@gmail.com)

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the migration to set up tables:
   ```bash
   # Install Supabase CLI if needed
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

3. Or manually run the SQL in `supabase/migrations/20250101000000_initial_schema.sql` in the Supabase SQL Editor

### Development

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

### Building

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes (production) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Yes (production) |
| `VITE_ADMIN_EMAIL` | Admin email allowlist | Yes |

## Project Structure

```
snps-squares/
├── src/
│   ├── components/        # React components
│   │   └── Board.tsx      # 10×10 squares grid
│   ├── pages/             # Route pages
│   │   ├── LandingPage.tsx
│   │   ├── BoardPage.tsx
│   │   ├── AdminSignIn.tsx
│   │   └── AdminPanel.tsx
│   ├── lib/               # Utilities and services
│   │   ├── supabase.ts    # Supabase client & types
│   │   └── auth.ts        # Auth utilities
│   ├── App.tsx            # App router
│   ├── main.tsx           # Entry point
│   └── index.css          # Tailwind v4 with @theme
├── supabase/
│   └── migrations/        # Database migrations
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
└── package.json
```

## Admin Access

Admin email is configured via `VITE_ADMIN_EMAIL` (defaults to `stecher2789@gmail.com`).

**Phase 1 Note**: Authentication is currently stubbed. In production, this will use Supabase Auth with the admin email allowlist enforced at the database level via the `admins` table.

To access the admin panel:
1. Navigate to `/admin`
2. Sign in with the admin email
3. Manage games, squares, scores, and settings

## Tailwind CSS v4

This project uses Tailwind CSS v4 with the modern `@import` and `@theme` syntax (not the legacy `@tailwind` directives).

Theme colors are defined in `src/index.css`:
- Primary (NFL Blue): `#013369`
- Secondary (NFL Red): `#D50A0A`
- NFC: `#013369`
- AFC: `#D50A0A`

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel`
3. Add environment variables in Vercel dashboard
4. Production URL will be `*.vercel.app` (free tier)

**Important**: Do not purchase a custom domain without approval. The free Vercel subdomain is sufficient for Phase 1.

## Database Schema

See `supabase/migrations/20250101000000_initial_schema.sql` for the complete schema.

Key tables:
- **admins**: Admin email allowlist (single admin)
- **games**: One game per season (AFC vs NFC teams, payouts, settings)
- **squares**: 100 squares per game (position, claims, payment status)
- **scores**: Quarter scores (Q1, Q2, Q3, Final)

## Roadmap

### Phase 1 (Current)
- ✅ Project scaffold with Vite + React + TypeScript
- ✅ Tailwind CSS v4 with NFL theme
- ✅ Landing page and board UI shell
- ✅ Admin routes and basic layout
- ✅ Supabase client stub
- ✅ Database schema draft

### Phase 2 (Next)
- Square claiming flow (modal, validation)
- Payment tracking (Venmo handle display, mark as paid)
- Number randomization + lock
- Score entry/API integration
- Winner highlighting
- Email receipts
- CSV export

### Phase 3 (Future)
- Join password protection
- Multi-season management
- Advanced admin controls
- Email notifications for winners
- Mobile app (optional)

## Contributing

This is a single-admin charity project. For questions or issues, contact the project admin.

## License

Private repository - all rights reserved.
