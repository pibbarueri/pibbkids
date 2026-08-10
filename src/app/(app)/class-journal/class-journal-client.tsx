"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { LinkifiedText } from "@/components/ui/linkified-text";

type Person = { name: string; username: string | null };

type JournalContext = "EBD" | "CULTO" | "OUTRO";

type Entry = {
  id: string;
  classGroupId: string;
  authorId: string;
  title: string;
  entryDate: string;
  context: JournalContext;
  description: string;
  createdAt: string;
  author: Person;
  acknowledgedBy: Person | null;
  acknowledgedAt: string | null;
  classGroup: { id: string; name: string };
};

type Room = { id: string; name: string };

const CONTEXT_OPTIONS: { value: JournalContext; label: string }[] = [
  { value: "EBD", label: "EBD" },
  { value: "CULTO", label: "Culto" },
  { value: "OUTRO", label: "Outro" },
];
const CONTEXT_LABELS: Record<JournalContext, string> = { EBD: "EBD", CULTO: "Culto", OUTRO: "Outro" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} às ${hh}:${min}`;
}

function personLabel(p: Person): string {
  return p.username ?? p.name;
}

function statusBadgeClass(acked: boolean): string {
  return acked
    ? "bg-green-600 text-white hover:bg-green-600"
    : "bg-primary text-primary-foreground hover:bg-primary";
}

const emptyForm = { title: "", entryDate: "", context: "" as JournalContext | "", description: "" };

export function ClassJournalClient({
  initialEntries,
  rooms,
  isManager,
  currentUserId,
}: {
  initialEntries: Entry[];
  rooms: Room[];
  isManager: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [activeRoomId, setActiveRoomId] = useState(rooms[0]?.id ?? "");

  // Derived from entries so a badge clears immediately after "Marcar como visto".
  const unackedByRoom = entries.reduce<Record<string, number>>((acc, e) => {
    if (!e.acknowledgedAt) acc[e.classGroupId] = (acc[e.classGroupId] ?? 0) + 1;
    return acc;
  }, {});

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Entry | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [acking, setAcking] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visibleEntries = entries.filter((e) => !activeRoomId || e.classGroupId === activeRoomId);
  const valid = form.title.trim() && form.entryDate && form.context && form.description.trim();

  async function create() {
    if (!valid || !activeRoomId) return;
    setSaving(true);
    const res = await fetch("/api/class-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classGroupId: activeRoomId, ...form }),
    });
    if (res.ok) {
      const created = await res.json();
      setEntries((prev) => [created, ...prev]);
      setOpen(false);
      setForm(emptyForm);
      router.refresh();
    }
    setSaving(false);
  }

  async function saveEdit() {
    if (!selected || !editForm.title.trim() || !editForm.entryDate || !editForm.context || !editForm.description.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/class-journal/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSelected(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  async function acknowledge() {
    if (!selected) return;
    setAcking(true);
    const res = await fetch(`/api/class-journal/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledge: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSelected(updated);
      router.refresh();
    }
    setAcking(false);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmText.trim().toLowerCase() !== "confirmar exclusão") return;
    setDeleteSaving(true);
    setDeleteError(null);
    const res = await fetch(`/api/class-journal/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setSelected(null);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      router.refresh();
    } else {
      const body = await res.json();
      setDeleteError(body.error ?? "Erro ao excluir.");
    }
    setDeleteSaving(false);
  }

  return (
    <div className="space-y-3">
      {rooms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoomId(r.id)}
              className={cn(
                "shrink-0 h-9 px-3 rounded-full border text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5",
                activeRoomId === r.id ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent"
              )}
            >
              {r.name}
              {isManager && unackedByRoom[r.id] > 0 && (
                <Badge
                  className={cn(
                    "h-5 min-w-5 px-1 justify-center",
                    activeRoomId === r.id ? "bg-primary-foreground text-primary hover:bg-primary-foreground" : undefined
                  )}
                >
                  {unackedByRoom[r.id]}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {!isManager && (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyForm); }}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
            aria-label="Novo item do diário"
          >
            <Plus className="h-6 w-6" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo item do diário</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Título *</p>
                <Input className="h-12" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Data *</p>
                <Input
                  type="date"
                  className="h-12"
                  value={form.entryDate}
                  onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Contexto *</p>
                <div className="grid grid-cols-3 gap-2">
                  {CONTEXT_OPTIONS.map((o) => (
                    <Button
                      key={o.value}
                      type="button"
                      variant={form.context === o.value ? "default" : "outline"}
                      className="h-11"
                      onClick={() => setForm((f) => ({ ...f, context: o.value }))}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Descrição *</p>
                <Textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva o caso..."
                />
              </div>
              <Button className="w-full h-12" disabled={!valid || saving} onClick={create}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {visibleEntries.map((e) => (
        <button
          key={e.id}
          onClick={() => setSelected(e)}
          className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm truncate">{e.title}</p>
                <Badge variant="outline" className="shrink-0">{CONTEXT_LABELS[e.context]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(e.entryDate)}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{e.description}</p>
            </div>
            <Badge className={cn("shrink-0", statusBadgeClass(!!e.acknowledgedAt))}>
              {e.acknowledgedAt ? "Ciente" : "Reportado"}
            </Badge>
          </div>
        </button>
      ))}

      {visibleEntries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum item no diário dessa turma.</p>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(o) => { if (!o) { setSelected(null); setEditing(false); } }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {selected && !editing && (
            <>
              <DialogHeader>
                <DialogTitle className="wrap-anywhere">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Turma</p>
                    <p>{selected.classGroup.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">Data</p>
                    <p>{formatDate(selected.entryDate)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Contexto</p>
                  <Badge variant="outline" className="mt-0.5">{CONTEXT_LABELS[selected.context]}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Descrição</p>
                  <p className="whitespace-pre-wrap wrap-anywhere">
                    <LinkifiedText text={selected.description} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Escrito por</p>
                  <p>{personLabel(selected.author)} em {formatWhen(selected.createdAt)}</p>
                </div>
                {selected.acknowledgedAt && selected.acknowledgedBy && (
                  <div>
                    <p className="text-muted-foreground text-xs">Visto por</p>
                    <p>{personLabel(selected.acknowledgedBy)} em {formatWhen(selected.acknowledgedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge className={cn("mt-0.5", statusBadgeClass(!!selected.acknowledgedAt))}>
                    {selected.acknowledgedAt ? "Ciente" : "Reportado"}
                  </Badge>
                </div>

                <div className="flex gap-2 border-t pt-3 flex-wrap">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setSelected(null)}>
                    Fechar
                  </Button>
                  {isManager && !selected.acknowledgedAt && (
                    <Button className="flex-1 h-12" disabled={acking} onClick={acknowledge}>
                      Marcar como visto
                    </Button>
                  )}
                  {!isManager && !selected.acknowledgedAt && selected.authorId === currentUserId && (
                    <Button
                      variant="outline"
                      className="h-12 px-4"
                      onClick={() => {
                        setEditForm({ title: selected.title, entryDate: selected.entryDate.slice(0, 10), context: selected.context, description: selected.description });
                        setEditing(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {(isManager || (!selected.acknowledgedAt && selected.authorId === currentUserId)) && (
                    <Button
                      variant="destructive"
                      className="h-12 px-4"
                      onClick={() => { setDeleteTarget(selected); setDeleteConfirmText(""); setDeleteError(null); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {selected && editing && (
            <>
              <DialogHeader>
                <DialogTitle>Editar item do diário</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Título *</p>
                  <Input className="h-12" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Data *</p>
                  <Input
                    type="date"
                    className="h-12"
                    value={editForm.entryDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, entryDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Contexto *</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTEXT_OPTIONS.map((o) => (
                      <Button
                        key={o.value}
                        type="button"
                        variant={editForm.context === o.value ? "default" : "outline"}
                        className="h-11"
                        onClick={() => setEditForm((f) => ({ ...f, context: o.value }))}
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Descrição *</p>
                  <Textarea rows={5} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1 h-12" disabled={saving} onClick={saveEdit}>
                    Salvar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteConfirmText(""); setDeleteError(null); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir item do diário permanentemente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir esse item permanentemente?
            Essa ação é <span className="font-medium text-foreground">irreversível</span>.
          </p>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Digite <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">confirmar exclusão</code> para prosseguir
            </p>
            <Input
              className="h-12"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="confirmar exclusão"
            />
          </div>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12"
              disabled={deleteConfirmText.trim().toLowerCase() !== "confirmar exclusão" || deleteSaving}
              onClick={confirmDelete}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
