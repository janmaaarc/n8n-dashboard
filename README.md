# n8n Pulse

A modern monitoring dashboard for n8n workflows built with React, TypeScript, and Tailwind CSS. Features a Linear/Notion-inspired minimal design with sidebar navigation and support for both single-user and multi-user deployments.

## Features

- **Sidebar Navigation**
  - Dashboard - Overview stats, charts, and recent activity
  - Workflows - Full workflow management with search/filter
  - Executions - Execution history and details
  - Credentials - View n8n credential metadata
  - Variables - Environment variables
  - Settings - Connection and preferences
  - Collapsible sidebar (240px expanded, 64px collapsed)
  - Mobile-responsive drawer

- **Dashboard Overview**
  - Stats cards with weekly trend indicators (vs last week)
  - 7-day execution history chart
  - Recent executions feed
  - Quick workflow access

- **Workflow Management**
  - Sortable table with columns: Workflow, Status, Last Execution, Executions, Success Rate, Trigger, Actions
  - Toggle workflows active/inactive
  - Manual workflow triggering
  - Search workflows by name, ID, or tags
  - Filter by status (active/inactive) and tags
  - Sort by any column (ascending/descending)
  - Bulk activate/deactivate actions
  - Favorites system with persistence
  - Export to CSV/JSON
  - Per-workflow execution stats and success rates

- **Execution Monitoring**
  - Sortable table with columns: Workflow, Status, Start Time, Duration, Trigger, Actions
  - Real-time execution feed with auto-refresh
  - Detailed execution panel (success/error/running)
  - Filter executions by status
  - Sort by any column (ascending/descending)
  - Error tracking with stack traces
  - Click to view execution details

- **User Experience**
  - Keyboard shortcuts (R: refresh, /: search, ,: settings, D: dark mode, ?: help)
  - Toast notifications for actions
  - Pagination for large lists
  - Dark/light theme toggle
  - Configurable auto-refresh interval
  - Connection testing
  - Mobile-responsive design with touch support
  - Smooth animations and transitions

- **Authentication (Multi-user Mode)**
  - Supabase authentication (email/password)
  - Secure credential storage with AES-256-GCM encryption
  - Per-user n8n instance configuration
  - Landing page for unauthenticated users

## Tech Stack

- React 19 + TypeScript
- React Router (page navigation)
- Vite
- Tailwind CSS 4
- React Query (TanStack Query)
- Supabase (authentication & database)
- Recharts (analytics)
- Lucide React (icons)
- Vercel (deployment)

## Deployment Modes

### Single-User Mode
For personal use without authentication. Configure n8n credentials via environment variables.

### Multi-User Mode
For shared deployments with user authentication. Each user stores their own n8n credentials securely.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/janmaaarc/n8n-dashboard.git
cd n8n-dashboard
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

#### Single-User Mode (Development)

```env
VITE_N8N_URL=https://your-n8n-instance.com
VITE_N8N_API_KEY=your-n8n-api-key
```

#### Single-User Mode (Production - Vercel)

Set these in your Vercel project settings:

```env
N8N_URL=https://your-n8n-instance.com
N8N_API_KEY=your-n8n-api-key
```

#### Multi-User Mode (Supabase)

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Run the following SQL to create the credentials table:

```sql
CREATE TABLE user_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  n8n_url TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);

ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials" ON user_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials" ON user_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials" ON user_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" ON user_credentials
  FOR DELETE USING (auth.uid() = user_id);
```

3. Set environment variables:

**Development (.env):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Production (Vercel):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-32-byte-base64-key
```

Generate an encryption key:
```bash
openssl rand -base64 32
```

### 3. Run locally

```bash
npm run dev
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Refresh data |
| `/` | Focus search |
| `,` | Open settings |
| `D` | Toggle dark mode |
| `?` | Show shortcuts |
| `Esc` | Close modal |

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # Collapsible sidebar navigation
│   │   ├── MainLayout.tsx    # Main layout wrapper with Outlet
│   │   └── PageHeader.tsx    # Reusable page header component
│   ├── LandingPage.tsx       # Landing page for unauthenticated users
│   ├── AuthModal.tsx         # Sign in/sign up modal
│   ├── WorkflowTable.tsx     # Sortable workflow table with stats
│   ├── ExecutionTable.tsx    # Sortable execution history table
│   ├── ExecutionFeed.tsx     # Recent executions list (dashboard)
│   ├── StatCard.tsx          # Stats card with trend indicators
│   ├── ExecutionChart.tsx    # 7-day execution history chart
│   ├── SettingsModal.tsx     # Settings modal (quick access)
│   └── ...
├── pages/
│   ├── DashboardPage.tsx     # Dashboard overview
│   ├── WorkflowsPage.tsx     # Workflows management
│   ├── ExecutionsPage.tsx    # Execution history
│   ├── CredentialsPage.tsx   # n8n credentials list
│   ├── VariablesPage.tsx     # Environment variables
│   └── SettingsPage.tsx      # Full settings page
├── contexts/
│   ├── AuthContext.tsx       # Authentication context
│   └── SidebarContext.tsx    # Sidebar collapse state
├── hooks/
│   ├── useN8n.ts             # API hooks (React Query)
│   ├── useSettings.ts        # Settings management
│   ├── useCredentials.ts     # Supabase credentials hook
│   ├── useMediaQuery.ts      # Responsive breakpoint detection
│   └── ...
├── services/
│   └── n8n.ts                # n8n API wrapper
├── lib/
│   └── supabase.ts           # Supabase client
└── App.tsx                   # Route definitions

api/
├── credentials/
│   └── index.ts              # Credentials CRUD endpoint
└── n8n/
    └── proxy.ts              # n8n API proxy
```

## Security

### Single-User Mode

| Environment | API Key Location | Exposed to Browser? |
|-------------|------------------|---------------------|
| Development | `.env` file | Yes (local only) |
| Production | Vercel env vars | No (serverless proxy) |

### Multi-User Mode

- User credentials are encrypted with AES-256-GCM before storage
- Encryption key is stored only on the server (Vercel)
- Supabase Row Level Security ensures users can only access their own data
- JWT tokens are verified server-side before decrypting credentials

### Best Practices

1. Never commit `.env` files
2. Use Vercel environment variables for production
3. Rotate API keys if accidentally exposed
4. Use a strong, random encryption key
5. Enable 2FA on your Supabase account

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Set environment variables in Vercel project settings
4. Deploy

## License

MIT
