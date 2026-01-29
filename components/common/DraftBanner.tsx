import { AlertTriangle } from 'lucide-react';

export function DraftBanner() {
  return (
    <div className="draft-banner flex items-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      <span>
        <strong>BROUILLON</strong> – Ce document doit être vérifié et validé avant utilisation. 
        Ceci n'est pas un conseil juridique.
      </span>
    </div>
  );
}
