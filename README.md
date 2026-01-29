# Youri - SAS Governance Management

Youri is a SaaS application that helps French SAS (Société par Actions Simplifiée) companies manage their annual governance obligations, from accounts approval to AGM documentation.

## Features

- **Document Management**: Upload and organize statutory documents (Statuts, Pacte d'associés, Cap tables)
- **Governance Profile Analysis**: AI-powered analysis of governance rules from uploaded documents
- **Timeline Generation**: Automatic retro-planning for AGM deadlines based on fiscal year end
- **AGM Documentation**: Generate draft convocations, PV templates, and resolutions
- **Stakeholder Management**: Track shareholders and their participation
- **Governance Advisor**: AI assistant for governance questions
- **Slack Integration**: Receive reminders and upload documents via Slack

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: Lovable AI Gateway (Gemini models)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd youri

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
```

### Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Running Tests

```bash
# Run frontend tests
npm test

# Run edge function tests (Deno)
cd supabase/functions
deno test --allow-env --allow-net
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/         # React components
│   ├── common/        # Shared components (ErrorBoundary, etc.)
│   └── ui/            # shadcn/ui components
├── contexts/          # React contexts (AuthContext)
├── hooks/             # Custom React hooks
├── integrations/      # Third-party integrations (Supabase)
├── lib/               # Utility functions
├── pages/             # Page components
├── test/              # Test utilities and mocks
└── types/             # TypeScript type definitions

supabase/
├── functions/         # Edge functions
│   ├── _shared/       # Shared utilities (CORS, validation, sanitization)
│   ├── analyze-governance/
│   ├── draft-agm-pack/
│   ├── extract-stakeholders/
│   ├── generate-attendance-sheet/
│   ├── generate-convocations/
│   ├── generate-timeline/
│   ├── governance-advisor/
│   ├── slack-webhook/
│   └── webhook-trigger/
└── config.toml        # Supabase configuration
```

## Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `analyze-governance` | Extract governance rules from documents | JWT |
| `draft-agm-pack` | Generate AGM documentation drafts | JWT |
| `extract-stakeholders` | Extract shareholders from cap table | JWT |
| `generate-attendance-sheet` | Generate AGM attendance sheet | JWT |
| `generate-convocations` | Generate shareholder convocations | JWT |
| `generate-timeline` | Create task timeline for governance cycle | JWT |
| `governance-advisor` | AI assistant for governance questions | JWT |
| `slack-webhook` | Handle Slack events and messages | Slack Signature |
| `webhook-trigger` | Send notifications for due tasks | JWT |

## Security

- All edge functions require JWT authentication (except `slack-webhook` which uses Slack signature verification)
- CORS is restricted to allowed origins
- Input validation on all endpoints
- AI prompt injection protection for user-submitted content
- Environment variables should never be committed to git

## License

Proprietary - All rights reserved.
