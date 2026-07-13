"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";

type ClassGroup = { id: string; name: string; ageRange: string | null; active: boolean };

export function ClassesClient({ initialClasses }: { initialClasses: ClassGroup[] }) {
  const [classes, setClasses] = useState(initialClasses);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setAgeRange("");
    setOpen(true);
  }

  function openEdit(cls: ClassGroup) {
    setEditing(cls);
    setName(cls.name);
    setAgeRange(cls.ageRange ?? "");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(editing ? `/api/classes/${editing.id}` : "/api/classes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ageRange }),
    });
    const data = await res.json();
    if (editing) {
      setClasses((prev) => prev.map((c) => (c.id === editing.id ? data : c)));
    } else {
      setClasses((prev) => [...prev, data]);
    }
    setSaving(false);
    setOpen(false);
  }

  async function toggleActive(cls: ClassGroup) {
    const res = await fetch(`/api/classes/${cls.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !cls.active }),
    });
    const data = await res.json();
    setClasses((prev) => prev.map((c) => (c.id === cls.id ? data : c)));
  }

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          onClick={openCreate}
          className={buttonVariants({ className: "w-full h-12" })}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova turma
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar turma" : "Nova turma"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Nome da turma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
            <Input
              placeholder="Faixa etária (ex: 5-6 anos)"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="h-12"
            />
            <Button onClick={save} className="w-full h-12" disabled={saving || !name}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {classes.map((cls) => (
        <div
          key={cls.id}
          className="flex items-center justify-between p-4 border rounded-lg bg-background"
        >
          <div>
            <p className="font-medium">{cls.name}</p>
            {cls.ageRange && (
              <p className="text-xs text-muted-foreground">{cls.ageRange}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={cls.active ? "default" : "secondary"}>
              {cls.active ? "Ativa" : "Inativa"}
            </Badge>
            <Button size="icon" variant="ghost" onClick={() => openEdit(cls)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggleActive(cls)}>
              {cls.active ? "Desativar" : "Ativar"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
