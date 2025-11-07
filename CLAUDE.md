# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Construction Equipment and Resource Management System (ERMS)** - a comprehensive platform for managing construction equipment, workers, entry requests, deployments, and safety inspections at construction sites.

**Tech Stack:**
- Frontend: React 19, Vite, Wouter (routing), Tailwind CSS 4, shadcn/ui
- Backend: Express 4, tRPC 11, Drizzle ORM
- Database: PostgreSQL (Supabase)
- Authentication: JWT-based (custom implementation with email/password + PIN for workers)

## Commands

### Development
```bash
pnpm dev              # Start development server (both frontend & backend)
pnpm build            # Build for production (client + server)
pnpm start            # Run production build
pnpm check            # TypeScript type checking (no emit)
pnpm format           # Format code with Prettier
```

### Database
```bash
pnpm db:push          # Generate migrations and apply to database
                      # Equivalent to: drizzle-kit generate && drizzle-kit migrate
```

### Testing
```bash
pnpm test             # Run vitest tests
```

**Note:** The dev server runs on port 3000 by default, but will auto-increment (3001, 3002, etc.) if the port is in use.

## Architecture Overview

### Data Flow Pattern

This project follows a **type-safe full-stack architecture**:

1. **Schema Definition** (`drizzle/schema.ts`)
   - Single source of truth for database schema
   - Uses Drizzle ORM with PostgreSQL
   - Exports TypeScript types automatically

2. **Database Layer** (`server/db.ts`)
   - All database queries centralized here
   - Uses Supabase client for PostgreSQL access
   - Handles snake_case ↔ camelCase conversion with `toSnakeCase()` and `toCamelCase()` helpers
   - **Important:** Always use these helpers when inserting/selecting data to maintain consistency

3. **API Layer** (`server/routers.ts` and `server/*-router.ts`)
   - tRPC procedures (type-safe API endpoints)
   - Router organization:
     - `routers.ts`: Main router aggregating all sub-routers
     - `*-router.ts`: Feature-specific routers (companies, deployments, entry-requests, etc.)
   - Uses `protectedProcedure` for authenticated endpoints
   - Uses `adminProcedure` for admin-only endpoints

4. **Frontend** (`client/src/`)
   - tRPC client auto-generates TypeScript types from backend
   - Uses React Query for data fetching (`trpc.*.useQuery`, `trpc.*.useMutation`)
   - No manual type definitions needed between frontend/backend

### Role-Based Access Control (RBAC)

The system has 6 user roles defined in `drizzle/schema.ts`:
- `admin`: System configuration and master data
- `owner`: Equipment/worker registration, owns equipment
- `bp`: Building partner - approves entry requests and work confirmations
- `ep`: Engineering partner - final approval and monitoring
- `worker`: Submits work confirmations and attendance (mobile-focused)
- `inspector`: Performs safety inspections

**Critical:** Always use `.toLowerCase()` when comparing roles, as there are historical case-sensitivity issues.

### Entry Request Workflow

The core business process is the 3-stage approval workflow:

1. **Owner** creates entry request with equipment/workers
2. **BP (Building Partner)** reviews and approves (can upload work plan documents)
3. **EP (Engineering Partner)** gives final approval

Status progression:
```
bp_draft → bp_requested → owner_reviewing → owner_approved →
bp_reviewing → bp_approved → ep_reviewing → ep_approved
(rejected at any stage)
```

### Deployment Management

After entry request approval (`status='ep_approved'`), Owner creates a **Deployment**:
- Links equipment + worker + companies (BP/EP)
- Tracks deployment period (start_date, planned_end_date, actual_end_date)
- Supports period extensions and worker changes
- Maintains history in separate tables (`deployment_extensions`, `deployment_worker_changes`)

### Key Architectural Patterns

**1. Case Conversion Pattern**
```typescript
// When inserting to DB
await supabase.from('table_name').insert(toSnakeCase(dataObject));

// When reading from DB
const result = toCamelCase(data);
```

**2. JOIN Pattern for Related Data**
```typescript
// Explicitly specify foreign key names for clarity
.select(`
  *,
  bp_company:companies!table_bp_company_id_fkey(id, name, type),
  ep_company:companies!table_ep_company_id_fkey(id, name, type)
`)
```

**3. Router Organization**
- Main router in `server/routers.ts` imports and combines sub-routers
- Each major feature has its own router file (e.g., `deployment-router.ts`)
- Routers are registered in `appRouter` using `router()` helper

**4. Mobile vs Desktop Routes**
- Desktop routes use `DashboardLayout` wrapper
- Mobile routes (prefix `/mobile/`) use `MobileLayout`
- Worker role primarily uses mobile interface
- PIN login (`/mobile/login`) for workers (4-digit PIN)
- Email/password login (`/login`) for other roles

## Important Files

### Schema and Database
- `drizzle/schema.ts` - Database schema (PostgreSQL enums, tables, types)
- `drizzle.config.ts` - Drizzle Kit configuration
- `server/db.ts` - All database helper functions (1600+ lines)

### Backend Routers
- `server/routers.ts` - Main router aggregator
- `server/deployment-router.ts` - Deployment management
- `server/entry-request-router-v2.ts` - Entry request workflow (current version)
- `server/companies-router.ts` - Company management
- `server/users-router.ts` - User management
- `server/mobile-router.ts` - Mobile-specific APIs
- `server/auth-pin-router.ts` - PIN authentication for workers

### Authentication
- `server/_core/jwt.ts` - JWT token creation/verification
- `server/_core/password.ts` - Password hashing (SHA-256)
- Authentication uses JWT stored in httpOnly cookies

### Frontend Pages
- `client/src/App.tsx` - Main routing configuration
- `client/src/pages/` - Desktop pages
- `client/src/pages/mobile/` - Mobile pages (Worker, Inspector)
- `client/src/components/DashboardLayout.tsx` - Main layout with navigation

### Core Framework (Do Not Modify)
- `server/_core/` - Framework core files
- `client/src/_core/` - Client framework utilities

## Common Development Tasks

### Adding a New Feature

**Example: Adding a new "Inspection Reports" feature**

1. **Update Schema** (`drizzle/schema.ts`)
```typescript
export const inspectionReports = pgTable("inspection_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  // ... other fields
});
```

2. **Run Migration**
```bash
pnpm db:push
```

3. **Add Database Functions** (`server/db.ts`)
```typescript
export async function createInspectionReport(data: InsertInspectionReport) {
  const supabase = getSupabaseClient();
  const { data: result } = await supabase
    .from('inspection_reports')
    .insert(toSnakeCase(data))
    .select()
    .single();
  return toCamelCase(result);
}
```

4. **Create Router** (`server/inspection-reports-router.ts`)
```typescript
export const inspectionReportsRouter = router({
  create: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ input }) => {
      return await db.createInspectionReport(input);
    }),
});
```

5. **Register Router** (`server/routers.ts`)
```typescript
import { inspectionReportsRouter } from "./inspection-reports-router";

export const appRouter = router({
  // ... existing routers
  inspectionReports: inspectionReportsRouter,
});
```

6. **Create Page** (`client/src/pages/InspectionReports.tsx`)
```typescript
export default function InspectionReports() {
  const { data } = trpc.inspectionReports.list.useQuery();
  const createMutation = trpc.inspectionReports.create.useMutation();
  // ... component logic
}
```

7. **Add Route** (`client/src/App.tsx`)
```typescript
<Route path="/inspection-reports" component={InspectionReports} />
```

8. **Add Navigation** (`client/src/components/DashboardLayout.tsx`)
```typescript
{ label: "검사 보고서", href: "/inspection-reports", icon: FileText }
```

### Working with Supabase

**Environment Variables Required:**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]  # For admin operations
```

**Getting Supabase Client:**
```typescript
import { getSupabaseClient } from "./db";
const supabase = getSupabaseClient();
```

### Date Handling

- **Server:** Always use ISO 8601 format (Timestamptz)
- **Client Display:** Use `date-fns` with Korean locale
```typescript
import { format } from "date-fns";
import { ko } from "date-fns/locale";

format(new Date(dateString), "yyyy년 MM월 dd일", { locale: ko });
```
- **Input Forms:** Use `yyyy-MM-dd` format for date inputs

## Known Issues and Caveats

### Current Problems

1. **Entry Request Validation Error** ✅ **FIXED** (Oct 27, 2025)
   - ~~Entry request creation has validation errors ("점증에러")~~
   - **Root Cause**: Missing `owner_requested` value in `entry_request_status` enum
   - **Fix Applied**: Added `owner_requested` to enum in `drizzle/schema.ts`
   - **Action Required**: Run SQL migration in Supabase (see `ENTRY_REQUEST_FIX_SUMMARY.md` and `add-owner-requested-status.sql`)

2. **Case Sensitivity in Roles**
   - Historical issue with role comparison
   - Always use `.toLowerCase()` when comparing roles
   - Example: `if (ctx.user.role?.toLowerCase() !== "admin")`

### Important Constraints

1. **Database Naming Convention**
   - Database uses `snake_case` (PostgreSQL standard)
   - TypeScript/Frontend uses `camelCase`
   - ALWAYS use `toSnakeCase()` and `toCamelCase()` helpers

2. **Deployment Business Rules** (needs implementation)
   - One worker can only have one active deployment at a time
   - One equipment can only have one active deployment at a time
   - Deployment start_date must be after entry request's requested_start_date

3. **RLS (Row Level Security)**
   - Currently DISABLED in database
   - Needs to be enabled for production
   - Access control currently handled at API layer

4. **File Uploads**
   - Uses S3-compatible storage (Supabase Storage)
   - Helper function in `server/storage.ts`

## Testing

### Test Users (from Phase 1)
- Admin: admin@test.com / test123
- Owner: owner@test.com / test123
- BP: bp@test.com / test123
- EP: ep@test.com / test123
- Worker: PIN 1234 (mobile login)

### Development URLs
- Desktop: http://localhost:3000/login
- Mobile Worker: http://localhost:3000/mobile/login

## Documentation References

- `README.md` - Project overview and quick start
- `DEPLOYMENT.md` - Deployment guide (Vercel + Supabase)
- `인수인계_문서_최종_20251025.md` - Korean handover document (detailed requirements)
- `10271148내용.md` - Latest work log (Oct 27, 2025)
- `Phase1_완료_보고서.md` - Phase 1 completion report (login system)

## Next Priorities (from work log)

1. ~~Fix entry request validation error (URGENT)~~ ✅ **DONE** - Apply SQL migration in Supabase
2. Test entry request creation end-to-end
3. Test deployment management end-to-end
4. Implement work journal feature (daily work confirmations)
5. Add real-time location tracking UI (backend exists)
6. Implement data integrity constraints (duplicate deployment prevention)
