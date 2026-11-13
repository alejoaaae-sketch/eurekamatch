import { useNavigate } from 'react-router-dom';
import { Archive, ArrowRightLeft, Clock, Heart, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pick } from '@/hooks/usePicks';
import { CONSERVED_LIMIT, daysRemaining, PRINCIPAL_LIMIT } from '@/lib/selection-rules';
import { useState } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function SelectionList({ picks, onDelete }: { picks: Pick[]; onDelete: (id: string) => Promise<void> }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<Pick | null>(null);
  const [busy, setBusy] = useState(false);
  const principals = picks.filter(p => p.selection_kind === 'principal');
  const conserved = picks.filter(p => p.selection_kind === 'conserved');

  const renderPick = (pick: Pick) => (
    <article key={pick.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">{pick.picked_name.charAt(0).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <Button variant="link" className="h-auto max-w-full justify-start p-0 text-foreground" onClick={() => navigate(`/pick/${pick.id}`)}><span className="truncate">{pick.picked_name}</span></Button>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{daysRemaining(pick.expires_at ?? '')} días restantes</p>
      </div>
      <div className="flex items-center gap-1">
        {pick.selection_kind === 'principal' && <Button variant="ghost" size="icon" aria-label={`Cambiar ${pick.picked_name}`} title="Cambiar elección" onClick={() => navigate(`/add?replace=${pick.id}`)}><ArrowRightLeft className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" aria-label={`Eliminar ${pick.picked_name}`} title="Eliminar gratis" onClick={() => setDeleting(pick)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
      </div>
    </article>
  );

  return <div className="mx-auto max-w-2xl space-y-8 pb-20">
    <div className="flex items-baseline justify-between gap-3"><h2 className="text-xl font-semibold text-foreground">Mis elecciones</h2><span className="text-sm text-muted-foreground">{picks.length} de 7</span></div>
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Heart className="h-4 w-4 text-primary" />Principales · {principals.length} de {PRINCIPAL_LIMIT}</h3>
      {principals.map(renderPick)}
      {principals.length < PRINCIPAL_LIMIT && <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/add')}><Plus className="h-4 w-4" />{principals.length === 0 ? 'Añadir elección' : 'Añadir segunda elección'}</Button>}
    </section>
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Archive className="h-4 w-4" />Conservadas · {conserved.length} de {CONSERVED_LIMIT}</h3>
      {conserved.map(renderPick)}
      <div className="flex justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground"><span>Plazas disponibles para conservar</span><span className="shrink-0">{CONSERVED_LIMIT - conserved.length} de 5</span></div>
    </section>
    <AlertDialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar a {deleting?.picked_name}?</AlertDialogTitle><AlertDialogDescription>Es gratis. Esta elección dejará de participar en nuevas coincidencias. Las coincidencias anteriores se mantienen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button disabled={busy} variant="destructive" onClick={async () => { if (!deleting) return; setBusy(true); try { await onDelete(deleting.id); setDeleting(null); } finally { setBusy(false); } }}>Eliminar gratis</Button></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}