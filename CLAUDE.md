# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Larvik Kommune Catering (LKC) System - a full-stack catering management application with separate frontend and backend directories.

## Build & Run Commands

### Backend (backend/)
```bash
# Install dependencies (uses uv, NOT pip directly)
uv pip install -r pyproject.toml

# Run dev server (port 8000)
./scripts/start-dev.sh
# OR: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run tests (requires database)
uv run pytest

# Run tests with coverage
uv run pytest --cov

# Seed test database
uv run python tests/seed_data.py
```

### Frontend (frontend/)
```bash
npm install
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests (watch mode)
npm run test:ci      # Jest tests (CI mode)

# Playwright E2E tests (manually start servers first!)
npx playwright test
```

## Testing Requirements

**IMPORTANT**: Servers must be started manually before running E2E tests:
- Backend on port 8000
- Frontend on port 3001 (Playwright expects this port)
- Tests require a running PostgreSQL database

## Architecture

### Backend (FastAPI + PostgreSQL)
```
app/
├── api/v1/        # REST endpoints
├── core/          # Config, security, migrations
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── services/      # Business logic
└── infrastructure/# Database handling
```

### Frontend (Next.js 15 + React 19)
```
src/
├── app/           # Next.js App Router pages
├── components/    # React components (ui/, layout/, crud/)
├── hooks/         # Custom React hooks
├── lib/           # API client and utilities
└── types/         # TypeScript definitions
```

## Critical UI Components

### Dialog Component - Focus Trap Issue

**IMPORTANT**: The Radix UI Dialog component has a known focus trap issue that causes UI to freeze after closing dialogs.

**Problem**: When `modal={true}` (default), Radix UI creates a focus trap for accessibility. If the DOM changes during dialog close (e.g., via `refetch()`), the focus trap doesn't release properly, causing mouse and keyboard to become unresponsive.

**Solution** (implemented in v2.7.0+):

1. **Global fix in `frontend/src/components/ui/dialog.tsx`**:
   ```typescript
   const DialogContent = React.forwardRef<
     React.ElementRef<typeof DialogPrimitive.Content>,
     React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
       onOpenAutoFocus?: (event: Event) => void
       onCloseAutoFocus?: (event: Event) => void
     }
   >(({ className, children, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => (
     <DialogPrimitive.Content
       onOpenAutoFocus={(e) => {
         e.preventDefault()  // Prevent auto-focus on open
         onOpenAutoFocus?.(e)
       }}
       onCloseAutoFocus={(e) => {
         e.preventDefault()  // Prevent auto-focus on close
         onCloseAutoFocus?.(e)
       }}
       {...props}
     >
       {children}
     </DialogPrimitive.Content>
   ))
   ```

2. **Per-dialog fix when needed**:
   ```typescript
   <Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>
     <DialogContent onPointerDownOutside={() => setIsOpen(false)}>
       {/* Dialog content */}
     </DialogContent>
   </Dialog>
   ```

**Key points**:
- `e.preventDefault()` in focus handlers prevents automatic focus management
- `modal={false}` completely disables focus trap (use when e.preventDefault() isn't enough)
- `onPointerDownOutside` restores click-outside-to-close behavior when using `modal={false}`
- **NEVER** use `setTimeout` workarounds for this issue

**References**:
- GitHub Issue: https://github.com/radix-ui/primitives/issues/1891
- GitHub Issue: https://github.com/radix-ui/primitives/issues/2544
- Fixed in: PR #195, PR #196

## Critical Database Information

Two separate product tables exist:

1. **`matinfo_products`** - READ-ONLY lookup table from Matinfo.no (nutritional data)
2. **`tblprodukter`** - Main product catalog for the catering system

These are linked via `ean_kode` field.

## Database Migrations

Uses **custom migration system** (NOT Alembic):
- Migrations defined in `app/core/migrations.py`
- Run automatically at startup
- Tracked in `_migrations` table

To add a migration:
1. Create class inheriting from `Migration`
2. Implement `up()` method
3. Register in `get_migration_runner()`

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Python files | snake_case | `kunde_gruppe.py` |
| API endpoints | kebab-case | `/kunde-gruppe` |
| Python classes | PascalCase | `KundeGruppe` |

## API Configuration

- Backend: `http://localhost:8000/api`
- API Docs: `http://localhost:8000/api/docs`
- Frontend: `http://localhost:3000`

## Key Technologies

**Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis (cache), uv (package manager)

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, React Query, NextAuth, Playwright, Jest

## Version Bumping

**VIKTIG**: Hver gang en PR opprettes, SKAL versjonen økes (PATCH bump).

Versjon finnes i to filer som ALLTID må være synkronisert:
- `frontend/package.json` (version felt)
- `backend/pyproject.toml` (version felt)

Eksempel: 2.6.1 → 2.6.2

Gjør dette FØR du lager PR, ikke etter.

## User Documentation & AI References

### Documentation Locations

**User Guides** (Norwegian):
- **Main manual**: `/docs/BRUKERMANUAL.md` - General user manual with overview of all features
- **Recipe guide**: `/backend/docs/user-guides/oppskrifter.md` - Comprehensive guide for recipe management
  - Includes sections on recipe creation, editing, calculation, and PDF reports
  - Added in v2.7.0: "Kalkulering av mengder" and "PDF-rapport" sections
- **Other guides**: `/backend/docs/user-guides/` - Additional module-specific guides

**Developer Documentation**:
- **CHANGELOG**: `/CHANGELOG.md` - Detailed version history and release notes
- **API Documentation**: Available at `http://localhost:8000/api/docs` when running backend
- **Backend CLAUDE.md**: `/backend/CLAUDE.md` - Backend-specific guidance

### AI Assistance References

This project has been developed with assistance from **Claude Code** (Anthropic's AI coding assistant). AI references are documented in:

1. **CHANGELOG.md** - Each major version includes "Developed with assistance from Claude Code"
2. **User Guides** - Footer sections acknowledge AI assistance:
   - `/backend/docs/user-guides/oppskrifter.md` includes "Om denne funksjonen" section
3. **GitHub Pull Requests** - PR descriptions reference Claude Code when applicable

### Recent Major Feature: Recipe Calculation (v2.7.0)

Implemented in January 2026 with Claude Code assistance:

**Functionality**:
- Automatic calculation of ingredient quantities for N portions
- PDF report generation sorted by warehouse location (Lager-ID)
- Replaces legacy SQL stored procedure `sp_KalkulerOppskrift`

**Key Files**:
- Backend: `/backend/app/api/v1/oppskrifter.py` - Endpoints for calculation and PDF
- Backend: `/backend/app/services/report_service.py` - PDF generation with ReportLab
- Backend: `/backend/app/models/tabenhet.py` - Unit conversion table model
- Frontend: `/frontend/src/app/(main)/kalkyler/[id]/page.tsx` - UI for calculation

**Documentation**:
- User guide with step-by-step instructions in `/backend/docs/user-guides/oppskrifter.md`
- CHANGELOG entry with full technical details in `/CHANGELOG.md`
- GitHub: Issues #186, #187, #188 and PR #189
