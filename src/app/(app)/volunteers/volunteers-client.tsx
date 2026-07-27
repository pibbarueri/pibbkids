"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Check, Filter, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { formatCpf, cpfDigits } from "@/lib/cpf";
import { normalizeUsername } from "@/lib/text";

const FUNCTION_OPTIONS = [
  { value: "PROFESSOR", label: "Professor" },
  { value: "AUXILIAR", label: "Auxiliar" },
  { value: "APOIO_GERAL", label: "Apoio Geral" },
  { value: "LOUVOR", label: "Louvor" },
  { value: "RECEPCAO", label: "Recepção" },
  { value: "EVENTS", label: "Eventos" },
  { value: "IDE_KIDS", label: "Ide Kids" },
  { value: "MIDIAS_DESIGN", label: "Mídias e Design" },
];

const emptyVolunteerForm = {
  name: "",
  username: "",
  phone: "",
  cpf: "",
  birthdate: "",
  motherName: "",
  documentUrl: "",
  role: "ASSISTANT",
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
  documentUrl: "",
  role: "ASSISTANT",
  functions: [] as string[],
  preferredClassIds: [] as string[],
  inclusionEnabled: false,
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  COORDINATOR: "Coordenação",
  TEACHER: "Professor",
  ASSISTANT: "Auxiliar",
  RECEPTIONIST: "Recepção",
  SUPPORT: "Apoio",
};

const FUNCTION_LABELS: Record<string, string> = {
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
  APOIO_GERAL: "Apoio Geral",
  LOUVOR: "Louvor",
  RECEPCAO: "Recepção",
  EVENTS: "Eventos",
  IDE_KIDS: "Ide Kids",
  MIDIAS_DESIGN: "Mídias e Design",
};

type ClassGroup = { id: string; name: string };
type Volunteer = {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  role: string;
  status: string;
  active: boolean;
  cpf?: string | null;
  documentUrl?: string | null;
  birthdate?: string | null;
  motherName?: string | null;
  functions: { function: string }[];
  preferredClasses: { classGroupId: string; classGroup: { name: string } }[];
  inclusionEnabled?: boolean;
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterFunctions, setFilterFunctions] = useState<string[]>([]);
  const [filterClassIds, setFilterClassIds] = useState<string[]>([]);
  const [filterInclusion, setFilterInclusion] = useState(false);
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Volunteer | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Volunteer | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Volunteer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Volunteer | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<Volunteer | null>(null);
  const [approveForm, setApproveForm] = useState({ username: "", role: "ASSISTANT", documentUrl: "" });
  const [approveError, setApproveError] = useState<string | null>(null);
  const [tab, setTab] = useState(
    initialVolunteers.some((v) => v.active && v.status === "PENDING") ? "pending" : "approved"
  );

  const filtered = volunteers
    .filter((v) => v.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((v) => filterFunctions.length === 0 || v.functions.some((f) => filterFunctions.includes(f.function)))
    .filter((v) => filterClassIds.length === 0 || v.preferredClasses.some((c) => filterClassIds.includes(c.classGroupId)))
    .filter((v) => !filterInclusion || v.inclusionEnabled);
  const pending = filtered.filter((v) => v.active && v.status === "PENDING");
  const approved = filtered.filter((v) => v.active && v.status === "APPROVED");
  const inactive = filtered.filter((v) => !v.active);
  const filterCount = filterFunctions.length + filterClassIds.length + (filterInclusion ? 1 : 0);

  function toggleFilterFunction(fn: string) {
    setFilterFunctions((prev) => (prev.includes(fn) ? prev.filter((x) => x !== fn) : [...prev, fn]));
  }

  function toggleFilterClass(id: string) {
    setFilterClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const addValid =
    addForm.name && addForm.username.length >= 3 && addForm.cpf.length >= 11 && addForm.birthdate && addForm.role;

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
      username: v.username ?? "",
      phone: v.phone ?? "",
      cpf: v.cpf ?? "",
      birthdate: v.birthdate ? new Date(v.birthdate).toISOString().slice(0, 10) : "",
      motherName: v.motherName ?? "",
      documentUrl: v.documentUrl ?? "",
      role: v.role,
      functions: v.functions.map((f) => f.function),
      preferredClassIds: v.preferredClasses.map((c) => c.classGroupId),
      inclusionEnabled: v.inclusionEnabled ?? false,
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

  async function patchVolunteer(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/volunteers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setVolunteers((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }

  async function deactivate(v: Volunteer) {
    await patchVolunteer(v.id, { active: false });
    setDeactivateTarget(null);
    setEditing(null);
  }

  function openApprove(v: Volunteer) {
    setApproveForm({ username: v.username ?? "", role: v.role, documentUrl: v.documentUrl ?? "" });
    setApproveError(null);
    setApproveTarget(v);
  }

  async function confirmApprove(includeDocumentUrl: boolean) {
    if (!approveTarget || approveForm.username.length < 3) return;
    setSaving(true);
    setApproveError(null);
    const res = await fetch(`/api/volunteers/${approveTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: approveForm.username,
        role: approveForm.role,
        status: "APPROVED",
        requirePasswordChange: true,
        ...(includeDocumentUrl ? { documentUrl: approveForm.documentUrl || null } : {}),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setVolunteers((prev) => prev.map((x) => (x.id === approveTarget.id ? updated : x)));
      setApproveTarget(null);
    } else {
      const body = await res.json();
      setApproveError(body.error ?? "Erro ao aprovar.");
    }
    setSaving(false);
  }

  async function reject(v: Volunteer) {
    // Rejected volunteers are deactivated so they land in the Inativos tab.
    await patchVolunteer(v.id, { status: "REJECTED", active: false });
    setRejectTarget(null);
  }

  async function restore(v: Volunteer) {
    // A previously rejected volunteer goes back to Pendentes for re-review, not straight to Aprovados.
    await patchVolunteer(v.id, { active: true, status: v.status === "REJECTED" ? "PENDING" : "APPROVED" });
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmText.trim().toLowerCase() !== "confirmar exclusão") return;
    setDeleteSaving(true);
    setDeleteError(null);
    const res = await fetch(`/api/volunteers/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setVolunteers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } else {
      const body = await res.json();
      setDeleteError(body.error ?? "Erro ao excluir.");
    }
    setDeleteSaving(false);
  }

  return (
    <>
      {isLeadership && (
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
              <Input type="text" className="h-12" value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: normalizeUsername(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone</p>
              <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(addForm.phone)} onChange={(e) => setAddForm((f) => ({ ...f, phone: phoneDigits(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">CPF *</p>
              <Input className="h-12" value={formatCpf(addForm.cpf)} onChange={(e) => setAddForm((f) => ({ ...f, cpf: cpfDigits(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Data de nascimento *</p>
              <Input type="date" className="h-12" value={addForm.birthdate} onChange={(e) => setAddForm((f) => ({ ...f, birthdate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome da mãe</p>
              <Input className="h-12" value={addForm.motherName} onChange={(e) => setAddForm((f) => ({ ...f, motherName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Perfil de acesso *</p>
              <Select value={addForm.role} onValueChange={(v) => setAddForm((f) => ({ ...f, role: v ?? "ASSISTANT" }))} items={ROLE_LABELS}>
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
            <p className="text-xs text-muted-foreground">
              O voluntário definirá a senha no primeiro acesso (usuário + CPF + nascimento).
            </p>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <Button className="w-full h-12" disabled={!addValid || addSaving} onClick={createVolunteer}>
              Cadastrar voluntário
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar voluntário..."
            className="h-11 pl-9"
          />
        </div>
        <Button variant="outline" className="h-11 relative" onClick={() => setFilterOpen(true)}>
          <Filter className="h-4 w-4" />
          {filterCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]">{filterCount}</Badge>
          )}
        </Button>
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtrar voluntários</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Função</p>
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                {FUNCTION_OPTIONS.map((f) => (
                  <label key={f.value} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <Checkbox checked={filterFunctions.includes(f.value)} onCheckedChange={() => toggleFilterFunction(f.value)} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
            {classes.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Turma</p>
                <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                  {classes.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                      <Checkbox checked={filterClassIds.includes(c.id)} onCheckedChange={() => toggleFilterClass(c.id)} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label className="flex items-center gap-2">
              <Checkbox checked={filterInclusion} onCheckedChange={(v) => setFilterInclusion(!!v)} />
              <span className="text-sm font-medium">Habilitado para Inclusão</span>
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => { setFilterFunctions([]); setFilterClassIds([]); setFilterInclusion(false); }}
              >
                Limpar
              </Button>
              <Button className="flex-1 h-11" onClick={() => setFilterOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pendentes {pending.length > 0 && <Badge className="ml-1">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">
            Aprovados
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex-1">
            Inativos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 mt-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhum voluntário encontrado." : "Nenhum voluntário pendente."}
            </p>
          )}
          {pending.map((v) => (
            <VolunteerCard
              key={v.id}
              volunteer={v}
              onSelect={() => setSelected(v)}
              onApprove={isLeadership ? () => openApprove(v) : undefined}
              onReject={isLeadership ? () => setRejectTarget(v) : undefined}
            />
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-2 mt-3">
          {approved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhum voluntário encontrado." : "Nenhum voluntário aprovado."}
            </p>
          )}
          {approved.map((v) => (
            <VolunteerCard key={v.id} volunteer={v} onSelect={() => setSelected(v)} onEdit={isLeadership ? () => openEdit(v) : undefined} />
          ))}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-2 mt-3">
          {inactive.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhum voluntário encontrado." : "Nenhum voluntário inativo."}
            </p>
          )}
          {inactive.map((v) => (
            <VolunteerCard
              key={v.id}
              volunteer={v}
              onSelect={() => setSelected(v)}
              onRestore={isLeadership ? () => setRestoreTarget(v) : undefined}
              onDelete={isLeadership ? () => { setDeleteTarget(v); setDeleteConfirmText(""); setDeleteError(null); } : undefined}
            />
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
              <Row label="Perfil de acesso" value={ROLE_LABELS[selected.role] ?? selected.role} />
              <Row label="Telefone" value={formatPhone(selected.phone ?? "")} />

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
                  <p className="text-muted-foreground text-xs">Turmas</p>
                  <p>{selected.preferredClasses.map((c) => c.classGroup.name).join(", ")}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-xs">Documentos</p>
                {selected.documentUrl ? (
                  <a href={selected.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Abrir pasta no Drive
                  </a>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </div>
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
                <Input type="text" className="h-12" value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: normalizeUsername(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Telefone</p>
                <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(editForm.phone)} onChange={(e) => setEditForm((f) => ({ ...f, phone: phoneDigits(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Documentos (link da pasta do Drive)</p>
                <Input type="url" className="h-12" placeholder="https://drive.google.com/..." value={editForm.documentUrl} onChange={(e) => setEditForm((f) => ({ ...f, documentUrl: e.target.value }))} />
              </div>
              {isLeadership && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">CPF</p>
                    <Input className="h-12" value={formatCpf(editForm.cpf)} onChange={(e) => setEditForm((f) => ({ ...f, cpf: cpfDigits(e.target.value) }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Data de nascimento</p>
                    <Input type="date" className="h-12" value={editForm.birthdate} onChange={(e) => setEditForm((f) => ({ ...f, birthdate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nome da mãe</p>
                    <Input className="h-12" value={editForm.motherName} onChange={(e) => setEditForm((f) => ({ ...f, motherName: e.target.value }))} />
                  </div>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={editForm.inclusionEnabled}
                      onCheckedChange={(v) => setEditForm((f) => ({ ...f, inclusionEnabled: !!v }))}
                    />
                    <span className="text-sm font-medium">Habilitado para Inclusão</span>
                  </label>
                </>
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">Perfil de acesso *</p>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v ?? "ASSISTANT" }))} items={ROLE_LABELS}>
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
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setDeactivateTarget(editing)}
                >
                  Desativar
                </Button>
                <Button className="flex-1 h-12" disabled={!editValid || editSaving} onClick={saveEdit}>
                  {editing.status === "PENDING" ? "Salvar e aprovar" : "Salvar alterações"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar {approveTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {approveTarget && (approveTarget.functions.length > 0 || approveTarget.preferredClasses.length > 0) && (
              <div className="space-y-1 rounded-md bg-muted/40 p-3">
                {approveTarget.functions.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Funções: {approveTarget.functions.map((f) => FUNCTION_LABELS[f.function] ?? f.function).join(", ")}
                  </p>
                )}
                {approveTarget.preferredClasses.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Turmas: {approveTarget.preferredClasses.map((c) => c.classGroup.name).join(", ")}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">Usuário *</p>
              <Input
                className="h-12"
                value={approveForm.username}
                onChange={(e) => setApproveForm((f) => ({ ...f, username: normalizeUsername(e.target.value) }))}
                placeholder="Ex: maria.silva"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Perfil de acesso *</p>
              <Select value={approveForm.role} onValueChange={(v) => setApproveForm((f) => ({ ...f, role: v ?? "ASSISTANT" }))} items={ROLE_LABELS}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Documentos (link da pasta do Drive)</p>
              <Input
                type="url"
                className="h-12"
                placeholder="https://drive.google.com/..."
                value={approveForm.documentUrl}
                onChange={(e) => setApproveForm((f) => ({ ...f, documentUrl: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O voluntário criará a senha no primeiro acesso com CPF + data de nascimento.
            </p>
            {approveError && <p className="text-sm text-destructive">{approveError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-12" disabled={approveForm.username.length < 3 || saving} onClick={() => confirmApprove(false)}>
                Informar depois
              </Button>
              <Button className="flex-1 h-12" disabled={approveForm.username.length < 3 || saving} onClick={() => confirmApprove(true)}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar voluntário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Desativar <span className="font-medium text-foreground">{deactivateTarget?.name}</span>?
            Ele irá para a aba Inativos e pode ser restaurado depois.
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

      <Dialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar voluntário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Restaurar <span className="font-medium text-foreground">{restoreTarget?.name}</span>?{" "}
            {restoreTarget?.status === "REJECTED"
              ? "Ele voltará para a aba Pendentes, para nova avaliação."
              : "Ele voltará para a lista de ativos."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setRestoreTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={async () => {
                if (restoreTarget) await restore(restoreTarget);
                setRestoreTarget(null);
              }}
            >
              Restaurar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar voluntário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejeitar <span className="font-medium text-foreground">{rejectTarget?.name}</span>?
            Ele irá para a aba Inativos e pode ser restaurado depois.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12"
              onClick={() => rejectTarget && reject(rejectTarget)}
            >
              Rejeitar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteConfirmText(""); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir voluntário permanentemente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir <span className="font-medium text-foreground">{deleteTarget?.name}</span> permanentemente?
            Essa ação é <span className="font-medium text-foreground">irreversível</span> — todos os dados dele serão apagados do sistema.
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
    </>
  );
}

function VolunteerCard({
  volunteer,
  onSelect,
  onEdit,
  onApprove,
  onReject,
  onRestore,
  onDelete,
}: {
  volunteer: Volunteer;
  onSelect: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}) {
  const isPending = !!onApprove;
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{volunteer.name}</p>
          {isPending ? (
            <div className="mt-0.5 space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Funções: {volunteer.functions.length > 0
                  ? volunteer.functions.map((f) => FUNCTION_LABELS[f.function] ?? f.function).join(", ")
                  : "—"}
              </p>
              {volunteer.preferredClasses.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Turmas: {volunteer.preferredClasses.map((c) => c.classGroup.name).join(", ")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {volunteer.functions.length > 0
                ? volunteer.functions.map((f) => FUNCTION_LABELS[f.function] ?? f.function).join(", ")
                : "—"}
              {!volunteer.active && " · Inativo"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onApprove && (
            <span
              role="button"
              aria-label="Aprovar"
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 bg-green-600 text-white"
            >
              <Check className="h-4 w-4" />
            </span>
          )}
          {onReject && (
            <span
              role="button"
              aria-label="Rejeitar"
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 bg-destructive text-white"
            >
              <X className="h-4 w-4" />
            </span>
          )}
          {onRestore && (
            <span
              role="button"
              aria-label="Restaurar"
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 border"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          {onDelete && (
            <span
              role="button"
              aria-label="Excluir"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 border"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </span>
          )}
          {onEdit && !onApprove && !onRestore && (
            <span
              role="button"
              aria-label="Editar"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 -m-1 transition-transform active:scale-90"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
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
