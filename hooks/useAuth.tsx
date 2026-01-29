/**
 * Re-export useAuth from AuthContext for backward compatibility.
 * This ensures existing imports of useAuth continue to work.
 */
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
