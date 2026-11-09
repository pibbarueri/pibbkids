"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function LessonNote({
  childId,
  date,
  type,
  initialNote,
}: {
  childId: string;
  date: string;
  type: "EBD" | "CULTO";
  initialNote: { text: string; author: string } | null;
}) {
  const [note, setNote] = useState(initialNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/children/${childId}/lesson-notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, type, note: draft }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Não foi possível salvar a nota.");
      return;
    }
    setNote((await res.json()).note);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2 no-print">
        <p className="text-xs font-medium text-muted-foreground">Notas do professor</p>
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={3} autoFocus />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" className="flex-1" onClick={save} disabled={saving}>
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={note ? "" : "no-print"}>
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-muted-foreground">Notas do professor</p>
        <button
          type="button"
          onClick={() => { setDraft(note?.text ?? ""); setEditing(true); }}
          aria-label="Editar notas do professor"
          className="no-print h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-transform active:scale-90"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {note ? (
        <>
          <p className="text-sm whitespace-pre-wrap wrap-anywhere">{note.text}</p>
          <p className="text-xs text-muted-foreground mt-1">Professor: {note.author}</p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sem notas.</p>
      )}
    </div>
  );
}
