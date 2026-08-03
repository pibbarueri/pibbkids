"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ageLabel, suggestedClassName } from "@/lib/age";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { Frequencia } from "@prisma/client";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const FREQ_OPTIONS: { value: Frequencia; label: string }[] = [
  { value: "EBD", label: "EBD" },
  { value: "CULTO", label: "Culto" },
  { value: "AMBOS", label: "Ambos" },
];

type ClassGroup = { id: string; name: string };
type VisitorListItem = { id: string; name: string; birthdate: string; classGroup: ClassGroup | null };
type VisitorDetail = VisitorListItem & { createdBy: { username: string | null }; createdAt: string; childId: string | null };

function toDateKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const emptyPromoteForm = {
  name: "",
  birthdate: "",
  fatherName: "",
  motherName: "",
  fatherPhone: "",
  motherPhone: "",
  frequency: "" as Frequencia | "",
  allergies: "",
  restrictions: "",
  classGroupId: "",
};

export function VisitorsReportClient({ isManager }: { isManager: boolean }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayCounts, setDayCounts] = useState<Map<string, number>>(new Map());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [dayVisitors, setDayVisitors] = useState<VisitorListItem[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VisitorDetail | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [promoting, setPromoting] = useState(false);
  const [promoteForm, setPromoteForm] = useState(emptyPromoteForm);
  const [promoteSaving, setPromoteSaving] = useState(false);

  const today = new Date();
  const viewDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + monthOffset, 1));
  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayKey = toDateKey(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));

  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(year, month, i + 1))),
  ];

  useEffect(() => {
    const from = toDateKey(new Date(Date.UTC(year, month, 1)));
    const to = toDateKey(new Date(Date.UTC(year, month, daysInMonth)));
    let cancelled = false;
    fetch(`/api/visitors?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((rows: { id: string; createdAt: string }[]) => {
        if (cancelled) return;
        const counts = new Map<string, number>();
        for (const row of rows) {
          const key = toDateKey(new Date(row.createdAt));
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        setDayCounts(counts);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, daysInMonth]);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then(setClasses);
  }, []);

  function openDayList(key: string) {
    setListOpen(true);
    fetch(`/api/visitors?date=${key}`)
      .then((r) => r.json())
      .then(setDayVisitors);
  }

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/visitors/${detailId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetail(data);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  function openPromote() {
    if (!detail) return;
    const suggestion = suggestedClassName(new Date(detail.birthdate));
    const match = classes.find((c) => c.name.toLowerCase() === suggestion.toLowerCase());
    setPromoteForm({
      ...emptyPromoteForm,
      name: detail.name,
      birthdate: new Date(detail.birthdate).toISOString().slice(0, 10),
      classGroupId: detail.classGroup?.id ?? match?.id ?? "",
    });
    setPromoting(true);
  }

  const promoteValid = promoteForm.name && promoteForm.birthdate && promoteForm.frequency && promoteForm.fatherPhone && promoteForm.classGroupId;

  async function savePromote() {
    if (!detail || !promoteValid) return;
    setPromoteSaving(true);
    const res = await fetch(`/api/visitors/${detail.id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promoteForm),
    });
    if (res.ok) {
      setPromoting(false);
      setDetailId(null);
      if (selectedKey) openDayList(selectedKey);
    }
    setPromoteSaving(false);
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setMonthOffset((m) => m - 1); setSelectedKey(null); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm">{MONTH_LABELS[month]} {year}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setMonthOffset((m) => m + 1); setSelectedKey(null); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] text-muted-foreground font-medium">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = toDateKey(d);
          const count = dayCounts.get(key) ?? 0;
          const isToday = key === todayKey;
          return (
            <button
              key={i}
              onClick={() => setSelectedKey(key === selectedKey ? null : key)}
              className={cn(
                "aspect-square rounded-md text-xs flex items-center justify-center relative transition-transform active:scale-90",
                isToday && "font-bold border border-primary",
                key === selectedKey && "bg-primary text-primary-foreground",
                count > 0 && key !== selectedKey && "bg-muted"
              )}
            >
              {d.getUTCDate()}
              {count > 0 && (
                <span className="absolute bottom-0.5">
                  <span className={cn("h-1 w-1 rounded-full block", key === selectedKey ? "bg-primary-foreground" : "bg-orange-500")} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedKey && (
        <div className="mt-3 pt-3 border-t">
          {(dayCounts.get(selectedKey) ?? 0) > 0 ? (
            <button
              onClick={() => openDayList(selectedKey)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-muted text-left transition-transform active:scale-[0.98]"
            >
              <span className="text-sm">{dayCounts.get(selectedKey)} visitantes</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum visitante nesse dia.</p>
          )}
        </div>
      )}

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Visitantes — {selectedKey && new Date(`${selectedKey}T00:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {dayVisitors.map((v) => (
              <button
                key={v.id}
                onClick={() => { setListOpen(false); setDetailId(v.id); }}
                className="w-full text-left p-3 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
              >
                <p className="font-medium text-sm">{v.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ageLabel(new Date(v.birthdate))} · {v.classGroup?.name ?? "Sem turma"}
                </p>
              </button>
            ))}
            {dayVisitors.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum visitante nesse dia.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <Row label="Data de nascimento" value={new Date(detail.birthdate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} />
                <Row label="Idade" value={ageLabel(new Date(detail.birthdate))} />
                <Row label="Turma sugerida" value={detail.classGroup?.name ?? "Sem turma"} />
                <Row
                  label="Cadastrado por"
                  value={`${detail.createdBy.username ?? "—"}, em ${new Date(detail.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })} às ${new Date(detail.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`}
                />
                {isManager && (
                  detail.childId ? (
                    <p className="text-sm text-muted-foreground">Já efetivada.</p>
                  ) : (
                    <Button className="w-full h-12" onClick={openPromote}>
                      Efetivar
                    </Button>
                  )
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={promoting} onOpenChange={setPromoting}>
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
    </div>
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
