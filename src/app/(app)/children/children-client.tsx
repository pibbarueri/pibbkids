"use client";

import { useState } from "react";
import { Role } from "@prisma/client";
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
import { AlertCircle } from "lucide-react";

type ClassGroup = { id: string; name: string };
type Child = {
  id: string;
  name: string;
  birthdate: string | Date;
  frequencia: string;
  fatherName: string | null;
  motherName: string | null;
  phone: string | null;
  whatsapp: string | null;
  allergies: string | null;
  restrictions: string | null;
  registrationStatus: string;
  classGroup: { name: string } | null;
  classGroupId: string | null;
};

export function ChildrenClient({
  initialChildren,
  classes,
  isManager,
  role,
}: {
  initialChildren: Child[];
  classes: ClassGroup[];
  isManager: boolean;
  role: Role;
}) {
  const [children, setChildren] = useState(initialChildren);
  const [selected, setSelected] = useState<Child | null>(null);
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);

  const pending = children.filter((c) => c.registrationStatus === "PENDENTE");
  const approved = children.filter((c) => c.registrationStatus === "APROVADO");

  async function approve(child: Child) {
    if (!classId) return;
    setSaving(true);
    const res = await fetch(`/api/children/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationStatus: "APROVADO", classGroupId: classId }),
    });
    const updated = await res.json();
    setChildren((prev) => prev.map((c) => (c.id === child.id ? updated : c)));
    setSaving(false);
    setSelected(null);
  }

  return (
    <>
      <Tabs defaultValue={isManager && pending.length > 0 ? "pending" : "approved"}>
        {isManager && (
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pendentes {pending.length > 0 && <Badge className="ml-1">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              Aprovadas
            </TabsTrigger>
          </TabsList>
        )}

        {isManager && (
          <TabsContent value="pending" className="space-y-2 mt-3">
            {pending.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum cadastro pendente.
              </p>
            )}
            {pending.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onSelect={() => { setSelected(child); setClassId(""); }}
                showActions
              />
            ))}
          </TabsContent>
        )}

        <TabsContent value="approved" className="space-y-2 mt-3">
          {approved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma criança cadastrada.
            </p>
          )}
          {approved.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onSelect={() => { setSelected(child); setClassId(child.classGroupId ?? ""); }}
              showActions={isManager}
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
              <Row label="Frequência" value={selected.frequencia} />
              <Row label="Pai" value={selected.fatherName} />
              <Row label="Mãe" value={selected.motherName} />
              <Row label="Telefone" value={selected.phone} />
              <Row label="WhatsApp" value={selected.whatsapp} />
              {selected.allergies && (
                <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Alergias</p>
                    <p className="text-yellow-700 dark:text-yellow-300">{selected.allergies}</p>
                  </div>
                </div>
              )}
              {selected.restrictions && (
                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Cuidados especiais</p>
                    <p className="text-blue-700 dark:text-blue-300">{selected.restrictions}</p>
                  </div>
                </div>
              )}

              {isManager && (
                <div className="space-y-2 pt-2">
                  <p className="font-medium">Turma</p>
                  <Select value={classId} onValueChange={(v) => setClassId(v ?? "")}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione a turma..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full h-12"
                    disabled={!classId || saving}
                    onClick={() => approve(selected)}
                  >
                    {selected.registrationStatus === "PENDENTE" ? "Aprovar e definir turma" : "Salvar turma"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChildCard({
  child,
  onSelect,
  showActions,
}: {
  child: Child;
  onSelect: () => void;
  showActions: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{child.name}</p>
          <p className="text-xs text-muted-foreground">
            {child.classGroup?.name ?? "Sem turma"} · {child.frequencia}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {child.allergies && (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          )}
          {showActions && child.registrationStatus === "PENDENTE" && (
            <Badge variant="secondary">Pendente</Badge>
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
