"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Pencil, Plus, Search } from "lucide-react";

const FUNCTION_OPTIONS = [
  { value: "PROFESSOR", label: "Professor" },
  { value: "AUXILIAR", label: "Auxiliar" },
  { value: "APOIO_GERAL", label: "Apoio Geral" },
  { value: "LOUVOR", label: "Louvor" },
  { value: "RECEPCAO", label: "Recepção" },
  { value: "TEATRO", label: "Teatro" },
];

const emptyVolunteerForm = {
  name: "",
  username: "",
  password: "",
  phone: "",
  cpf: "",
  birthdate: "",
  motherName: "",
  role: "AUXILIAR",
  functions: [] as string[],
  preferredClassIds: [] as string[],
};

const emptyEditForm = {
  name: "",
  username: "",
  phone: "",
  cpf: "",
  birthdate: "",
  motherName: "",
  role: "AUXILIAR",
  functions: [] as string[],
  preferredClassIds: [] as string[],
};

const ROLE_LABELS: Record<string, string> = {
  LIDERANCA: "Liderança",
  COORDENACAO: "Coordenação",
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
  RECEPCAO: "Recepção",
};

const FUNCTION_LABELS: Record<string, string> = {
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
  APOIO_GERAL: "Apoio Geral",
  LOUVOR: "Louvor",
  RECEPCAO: "Recepção",
  TEATRO: "Teatro",
};

type ClassGroup = { id: string; name: string };
type Volunteer = {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  role: string;
  status: string;
  active: boolean;
  cpf?: string | null;
  birthdate?: string | null;
  motherName?: string | null;
  functions: { function: string }[];
  preferredClasses: { classGroupId: string; classGroup: { name: string } }[];
};

export function VolunteersClient({
  initialVolunteers,
  classes,
  isLeadership,
}: {
  initialVolunteers: Volunteer[];
  classes: ClassGroup[];
  isLeadership: boolean;
}) {
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyVolunteerForm);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Volunteer | null>(null);

  const filtered = volunteers.filter((v) => v.name.toLowerCase().includes(search.trim().toLowerCase()));
  const pending = filtered.filter((v) => v.status === "PENDING");
  const approved = filtered.filter((v) => v.status === "APPROVED");

  const addValid = addForm.name && addForm.username && addForm.password.length >= 6 && addForm.role;

  async function createVolunteer() {
    if (!addValid) return;
    setAddSaving(true);
    setAddError(null);
    const res = await fetch("/api/volunteers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      const created = await res.json();
      setVolunteers((prev) => [...prev, created]);
      setAddOpen(false);
      setAddForm(emptyVolunteerForm);
    } else {
      const body = await res.json();
      setAddError(body.error ?? "Erro ao cadastrar voluntário.");
    }
    setAddSaving(false);
  }

  function openEdit(v: Volunteer) {
    setEditForm({
      name: v.name,
      username: v.username,
      phone: v.phone ?? "",
      cpf: v.cpf ?? "",
      birthdate: v.birthdate ? new Date(v.birthdate).toISOString().slice(0, 10) : "",
      motherName: v.motherName ?? "",
      role: v.role,
      functions: v.functions.map((f) => f.function),
      preferredClassIds: v.preferredClasses.map((c) => c.classGroupId),
    });
    setEditing(v);
  }


  const editValid = editForm.name && editForm.username && editForm.role;

  async function saveEdit() {
    if (!editing || !editValid) return;
    setEditSaving(true);
    const res = await fetch(`/api/volunteers/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        ...(editing.status === "PENDING" ? { status: "APPROVED" } : {}),
      }),
    });
    const updated = await res.json();
    setVolunteers((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
    setEditSaving(false);
    setEditing(null);
  }

  async function deactivate(v: Volunteer) {
    await fetch(`/api/volunteers/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    // Inactive volunteers are hidden from the list entirely.
    setVolunteers((prev) => prev.filter((x) => x.id !== v.id));
    setDeactivateTarget(null);
    setEditing(null);
  }

  return (
    <>
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddForm(emptyVolunteerForm); setAddError(null); } }}>
        <DialogTrigger
          className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
          aria-label="Novo voluntário"
        >
          <Plus className="h-6 w-6" />
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo voluntário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome *</p>
              <Input className="h-12" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Usuário *</p>
              <Input type="text" className="h-12" value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Senha *</p>
              <Input type="password" className="h-12" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone</p>
              <Input type="tel" className="h-12" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            {isLeadership && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">CPF</p>
                  <Input className="h-12" value={addForm.cpf} onChange={(e) => setAddForm((f) => ({ ...f, cpf: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Data de nascimento</p>
                  <Input type="date" className="h-12" value={addForm.birthdate} onChange={(e) => setAddForm((f) => ({ ...f, birthdate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nome da mãe</p>
                  <Input className="h-12" value={addForm.motherName} onChange={(e) => setAddForm((f) => ({ ...f, motherName: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">Perfil de acesso *</p>
              <Select value={addForm.role} onValueChange={(v) => setAddForm((f) => ({ ...f, role: v ?? "AUXILIAR" }))} items={ROLE_LABELS}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Funções</p>
              <MultiSelect
                options={FUNCTION_OPTIONS}
                selected={addForm.functions}
                onChange={(next) => setAddForm((f) => ({ ...f, functions: next }))}
                placeholder="Selecione as funções"
              />
            </div>
            {classes.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Turmas preferidas</p>
                <MultiSelect
                  options={classes.map((c) => ({ value: c.id, label: c.name }))}
                  selected={addForm.preferredClassIds}
                  onChange={(next) => setAddForm((f) => ({ ...f, preferredClassIds: next }))}
                  placeholder="Selecione as turmas"
                />
              </div>
            )}
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <Button className="w-full h-12" disabled={!addValid || addSaving} onClick={createVolunteer}>
              Cadastrar voluntário
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar voluntário..."
          className="h-11 pl-9"
        />
      </div>

      <Tabs defaultValue={pending.length > 0 ? "pending" : "approved"}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pendentes {pending.length > 0 && <Badge className="ml-1">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">
            Aprovados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 mt-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhum voluntário encontrado." : "Nenhum voluntário pendente."}
            </p>
          )}
          {pending.map((v) => (
            <VolunteerCard key={v.id} volunteer={v} onSelect={() => setSelected(v)} onEdit={() => openEdit(v)} />
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-2 mt-3">
          {approved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhum voluntário encontrado." : "Nenhum voluntário aprovado."}
            </p>
          )}
          {approved.map((v) => (
            <VolunteerCard key={v.id} volunteer={v} onSelect={() => setSelected(v)} onEdit={() => openEdit(v)} />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="Usuário" value={selected.username} />
              <Row label="Telefone" value={selected.phone} />

              {isLeadership && (
                <>
                  <Row label="CPF" value={selected.cpf} />
                  <Row label="Nome da mãe" value={selected.motherName} />
                  {selected.birthdate && (
                    <Row label="Data de nascimento" value={new Date(selected.birthdate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} />
                  )}
                </>
              )}

              {selected.functions.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Funções</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selected.functions.map((f) => (
                      <Badge key={f.function} variant="outline">
                        {FUNCTION_LABELS[f.function] ?? f.function}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selected.preferredClasses.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Turmas preferidas</p>
                  <p>{selected.preferredClasses.map((c) => c.classGroup.name).join(", ")}</p>
                </div>
              )}

              <Row label="Perfil de acesso" value={ROLE_LABELS[selected.role] ?? selected.role} />
              <Row label="Status" value={selected.active ? "Ativo" : "Inativo"} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar voluntário</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome *</p>
                <Input className="h-12" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Usuário *</p>
                <Input type="text" className="h-12" value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Telefone</p>
                <Input type="tel" className="h-12" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              {isLeadership && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">CPF</p>
                    <Input className="h-12" value={editForm.cpf} onChange={(e) => setEditForm((f) => ({ ...f, cpf: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Data de nascimento</p>
                    <Input type="date" className="h-12" value={editForm.birthdate} onChange={(e) => setEditForm((f) => ({ ...f, birthdate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nome da mãe</p>
                    <Input className="h-12" value={editForm.motherName} onChange={(e) => setEditForm((f) => ({ ...f, motherName: e.target.value }))} />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">Perfil de acesso *</p>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v ?? "AUXILIAR" }))} items={ROLE_LABELS}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Funções</p>
                <MultiSelect
                  options={FUNCTION_OPTIONS}
                  selected={editForm.functions}
                  onChange={(next) => setEditForm((f) => ({ ...f, functions: next }))}
                  placeholder="Selecione as funções"
                />
              </div>
              {classes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Turmas preferidas</p>
                  <MultiSelect
                    options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
                    selected={editForm.preferredClassIds}
                    onChange={(next) => setEditForm((f) => ({ ...f, preferredClassIds: next }))}
                    placeholder="Selecione as turmas"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1 h-12" disabled={!editValid || editSaving} onClick={saveEdit}>
                  {editing.status === "PENDING" ? "Salvar e aprovar" : "Salvar alterações"}
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => setDeactivateTarget(editing)}
                >
                  Desativar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar voluntário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Desativar <span className="font-medium text-foreground">{deactivateTarget?.name}</span>?
            O voluntário deixará de aparecer na lista.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setDeactivateTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12"
              onClick={() => deactivateTarget && deactivate(deactivateTarget)}
            >
              Desativar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VolunteerCard({
  volunteer,
  onSelect,
  onEdit,
}: {
  volunteer: Volunteer;
  onSelect: () => void;
  onEdit: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{volunteer.name}</p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[volunteer.role] ?? volunteer.role}
            {!volunteer.active && " · Inativo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {volunteer.status === "PENDING" && (
            <Badge variant="secondary">Pendente</Badge>
          )}
          {!volunteer.active && (
            <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
          )}
          <span
            role="button"
            aria-label="Editar"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 -m-1"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </span>
        </div>
      </div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
