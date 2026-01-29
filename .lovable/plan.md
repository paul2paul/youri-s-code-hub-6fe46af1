
# Plan: Fix youri-v2 Project Structure

## Summary
The youri-v2 code has synced from GitHub but is in the wrong location. The application code is at the root level instead of inside `src/`, so the app shows a blank template instead of your Youri governance application.

## What Needs to Be Fixed

### The Problem
- **Your pages** are in `/pages/Dashboard.tsx`, `/pages/Documents.tsx`, etc.
- **The app is looking** in `/src/pages/` which only has the blank template
- **Routing** in `src/App.tsx` only connects to the blank Index page

### The Solution
Update `src/App.tsx` to import from the correct locations and add all routes.

## Technical Changes

### 1. Update src/App.tsx routing
- Import pages from `/pages/` instead of `/src/pages/`
- Add routes for: Dashboard, Documents, Governance, Timeline, Stakeholders, Settings, CompanySetup, Auth, Advisor, YearInput
- Set Dashboard as the home page (`/`)

### 2. Verify import paths work
The pages use `@/` aliases that should resolve to the root, so imports like:
- `@/components/layout/AppLayout` → `/components/layout/AppLayout.tsx`
- `@/hooks/useCompany` → `/hooks/useCompany.tsx`

If the aliases don't resolve correctly, we may need to update `vite.config.ts` or `tsconfig.json`.

## Expected Result
After this fix, your Youri governance application will load properly with:
- Dashboard as the home page
- Navigation working between all pages
- French SAS governance workflow fully functional

## Files to Modify
1. `src/App.tsx` - Update imports and add all routes

**Approve this plan to implement the fix.**
