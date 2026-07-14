"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type Volunteer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  volunteerStatus: string;
  active: boolean;
  cpf?: string | null;
  birthdate?: string | null;
  motherName?: string | null;
  functions: { function: string }[];
  preferredClasses: { classGroupId: string; classGroup: { name: string } }[];
};

export function VolunteersClient({
  initialVolunteers,
  isLeadership,
}: {
  initialVolunteers: Volunteer[];
  isLeadership: boolean;
}) {
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  const pending = volunteers.filter((v) => v.volunteerStatus === "PENDENTE");
  const approved = volunteers.filter((v) => v.volunteerStatus === "APROVADO");

  async function approve(v: Volunteer) {
    setSaving(true);
    const res = await fetch(`/api/volunteers/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerStatus: "APROVADO", role: newRole || v.role }),
    });
    const updated = await res.json();
    setVolunteers((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
    setSaving(false);
    setSelected(null);
  }

  async function toggleActive(v: Volunteer) {
    const res = await fetch(`/api/volunteers/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !v.active }),
    });
    const updated = await res.json();
    setVolunteers((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
  }

  return (
    <>
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
              Nenhum voluntário pendente.
            </p>
          )}
          {pending.map((v) => (
            <VolunteerCard key={v.id} volunteer={v} onSelect={() => { setSelected(v); setNewRole(v.role); }} />
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-2 mt-3">
          {approved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum voluntário aprovado.
            </p>
          )}
          {approved.map((v) => (
            <VolunteerCard key={v.id} volunteer={v} onSelect={() => { setSelected(v); setNewRole(v.role); }} />
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
              <Row label="Email" value={selected.email} />
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

              <div className="space-y-2 pt-2">
                <p className="font-medium">Perfil de acesso</p>
                <Select value={newRole} onValueChange={(v) => setNewRole(v ?? "")} items={ROLE_LABELS}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selected.volunteerStatus === "PENDENTE" ? (
                  <Button
                    className="w-full h-12"
                    disabled={saving}
                    onClick={() => approve(selected)}
                  >
                    Aprovar voluntário
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-12"
                      disabled={saving}
                      onClick={() => approve(selected)}
                    >
                      Salvar perfil
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={() => { toggleActive(selected); setSelected(null); }}
                    >
                      {selected.active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VolunteerCard({ volunteer, onSelect }: { volunteer: Volunteer; onSelect: () => void }) {
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
        {volunteer.volunteerStatus === "PENDENTE" && (
          <Badge variant="secondary">Pendente</Badge>
        )}
        {!volunteer.active && (
          <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
        )}
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
