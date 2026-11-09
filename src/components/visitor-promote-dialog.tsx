"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Frequency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatPhone, phoneDigits } from "@/lib/phone";

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "EBD", label: "EBD" },
  { value: "CULTO", label: "Culto" },
  { value: "AMBOS", label: "Ambos" },
];

type ClassGroup = { id: string; name: string };

const emptyPromoteForm = {
  name: "",
  birthdate: "",
  fatherName: "",
  motherName: "",
  fatherPhone: "",
  motherPhone: "",
  frequency: "" as Frequency | "",
  allergies: "",
  restrictions: "",
  classGroupId: "",
};

/**
 * "Efetivar": turns a visiting child into a registered Child, with the same fields as a
 * regular registration. All of the child's visits get linked to the new record.
 */
export function VisitorPromoteDialog({
  open,
  onOpenChange,
  visitor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitor: { id: string; name: string; birthdate: string | null; classGroupId: string | null };
}) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  // The parent mounts this only while open, so the form starts fresh from the visitor.
  const [promoteForm, setPromoteForm] = useState(() => ({
    ...emptyPromoteForm,
    name: visitor.name,
    // Age-only visitors have no birthdate yet; the promote form requires one.
    birthdate: visitor.birthdate ? visitor.birthdate.slice(0, 10) : "",
    classGroupId: visitor.classGroupId ?? "",
  }));
  const [promoteSaving, setPromoteSaving] = useState(false);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then(setClasses);
  }, []);

  const promoteValid = promoteForm.name && promoteForm.birthdate && promoteForm.frequency && promoteForm.fatherPhone && promoteForm.classGroupId;

  async function savePromote() {
    if (!promoteValid) return;
    setPromoteSaving(true);
    const res = await fetch(`/api/visitors/${visitor.id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promoteForm),
    });
    setPromoteSaving(false);
    if (res.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Efetivar {promoteForm.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Nome *</p>
            <Input className="h-12" value={promoteForm.name} onChange={(e) => setPromoteForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Data de nascimento *</p>
            <Input type="date" className="h-12" value={promoteForm.birthdate} onChange={(e) => setPromoteForm((f) => ({ ...f, birthdate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Nome do pai</p>
            <Input className="h-12" value={promoteForm.fatherName} onChange={(e) => setPromoteForm((f) => ({ ...f, fatherName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Nome da mãe</p>
            <Input className="h-12" value={promoteForm.motherName} onChange={(e) => setPromoteForm((f) => ({ ...f, motherName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Telefone Pai *</p>
            <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(promoteForm.fatherPhone)} onChange={(e) => setPromoteForm((f) => ({ ...f, fatherPhone: phoneDigits(e.target.value) }))} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Telefone Mãe</p>
            <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(promoteForm.motherPhone)} onChange={(e) => setPromoteForm((f) => ({ ...f, motherPhone: phoneDigits(e.target.value) }))} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Frequência *</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {FREQ_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={promoteForm.frequency === o.value}
                  onClick={() => setPromoteForm((f) => ({ ...f, frequency: o.value }))}
                  className={cn(
                    "h-12 rounded-lg border text-sm font-medium transition-all active:scale-95",
                    promoteForm.frequency === o.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-transparent"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Turma *</p>
            <Select
              value={promoteForm.classGroupId}
              onValueChange={(v) => setPromoteForm((f) => ({ ...f, classGroupId: v ?? "" }))}
              items={Object.fromEntries(classes.map((c) => [c.id, c.name]))}
            >
              <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Alergias</p>
            <Textarea rows={2} value={promoteForm.allergies} onChange={(e) => setPromoteForm((f) => ({ ...f, allergies: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Cuidados especiais / restrições</p>
            <Textarea rows={2} value={promoteForm.restrictions} onChange={(e) => setPromoteForm((f) => ({ ...f, restrictions: e.target.value }))} />
          </div>
          <Button className="w-full h-12" disabled={!promoteValid || promoteSaving} onClick={savePromote}>
            Efetivar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
