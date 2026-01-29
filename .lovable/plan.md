
# Plan: Fix Blank Screen Issue

## Problem Identified
The app crashes on any route because:
1. `src/App.tsx` is missing the `AuthProvider` wrapper that the app requires
2. All pages use `AppLayout` which calls `useAuth()`, but there's no `AuthProvider` context
3. Without auth context, the app throws an error and renders nothing

## Solution

### 1. Wrap App with AuthProvider
Update `src/App.tsx` to include the `AuthProvider` from `@/contexts/AuthContext`.

**File to modify:** `src/App.tsx`

```tsx
import { AuthProvider } from "@/contexts/AuthContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        {/* ... rest of app */}
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

### 2. Add Route Protection (Optional but Recommended)
Create a `ProtectedRoute` component to redirect unauthenticated users to `/auth`.

**File to create:** `components/common/ProtectedRoute.tsx`

This will:
- Check if user is authenticated
- Redirect to `/auth` if not logged in
- Show loading state while checking auth

### 3. Update Routes to Use Protection
Wrap protected pages with the `ProtectedRoute` component:
- Dashboard, Documents, Governance, Timeline, Stakeholders, Settings, CompanySetup, Advisor, YearInput

Leave `/auth` as a public route.

## Technical Summary

| Change | File | Description |
|--------|------|-------------|
| Add AuthProvider | `src/App.tsx` | Wrap app with auth context |
| Create ProtectedRoute | `components/common/ProtectedRoute.tsx` | Redirect if not authenticated |
| Update routes | `src/App.tsx` | Protect pages that require login |

## Expected Result
After this fix:
- App will load without crashing
- Unauthenticated users will be redirected to `/auth`
- After logging in, users can access all pages normally
