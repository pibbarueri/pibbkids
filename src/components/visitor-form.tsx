"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { MAX_VISITOR_AGE_YEARS, visitorClassName } from "@/lib/age";
import { cn } from "@/lib/utils";

export type VisitorFormValue = {
  name: string;
  mode: "age" | "birthdate";
  years: number;
  months: number;
  birthdate: string;
  type: "EBD" | "CULTO";
};

type VisitorLike = {
  name: string;
  birthdate: string | null;
  ageMonths: number | null;
  type: "EBD" | "CULTO";
};

type Suggestion = { id: string; name: string; birthdate: string | null; ageMonths: number | null };

const DEFAULT_YEARS = 5;

function splitMonths(total: number) {
  return { years: Math.floor(total / 12), months: total % 12 };
}

export function emptyVisitorForm(type: "EBD" | "CULTO"): VisitorFormValue {
  return { name: "", mode: "age", years: DEFAULT_YEARS, months: 0, birthdate: "", type };
}

export function visitorFormFrom(v: VisitorLike): VisitorFormValue {
  return {
    name: v.name,
    mode: v.birthdate ? "birthdate" : "age",
    ...(v.ageMonths !== null ? splitMonths(v.ageMonths) : { years: DEFAULT_YEARS, months: 0 }),
    birthdate: v.birthdate ? new Date(v.birthdate).toISOString().slice(0, 10) : "",
    type: v.type,
  };
}

/** Same rule the API uses to pick the turma, so the preview matches what gets saved. */
function previewClassName(v: VisitorFormValue) {
  if (v.mode === "age") return visitorClassName({ birthdate: null, ageMonths: v.years * 12 + v.months });
  return v.birthdate ? visitorClassName({ birthdate: v.birthdate, ageMonths: null }) : null;
}

export function isVisitorFormValid(v: VisitorFormValue) {
  return v.name.trim().length >= 2 && (v.mode === "age" || !!v.birthdate);
}

/** Sends only the field for the chosen mode; the API clears the other one. */
export function visitorPayload(v: VisitorFormValue, opts: { includeSchedule: boolean }) {
  return {
    name: v.name.trim(),
    ...(v.mode === "age" ? { ageMonths: v.years * 12 + v.months } : { birthdate: v.birthdate }),
    ...(opts.includeSchedule && { type: v.type }),
  };
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 rounded-lg border text-sm font-medium transition-all active:scale-95",
            value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-input"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Shared by "Incluir visitante" (name autocomplete, no horário) and the edit dialogs on
 * Presença and the visitors report (horário editable). The turma is never editable: it's
 * shown live from the age/birthdate and recomputed by the API on save.
 */
export function VisitorForm({
  value,
  onChange,
  withAutocomplete = false,
  withSchedule = false,
}: {
  value: VisitorFormValue;
  onChange: (patch: Partial<VisitorFormValue>) => void;
  withAutocomplete?: boolean;
  withSchedule?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const query = value.name.trim();
  const searching = withAutocomplete && query.length >= 2;

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/visitors/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setSuggestions(data);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searching]);

  const className = previewClassName(value);

  return (
    <div className="space-y-3">
      <div className="space-y-1 relative">
        <p className="text-sm font-medium">Nome *</p>
        <Input
          className="h-12"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nome da criança"
        />
        {searching && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg divide-y">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                onClick={() => {
                  onChange({
                    name: s.name,
                    ...(s.birthdate
                      ? { mode: "birthdate", birthdate: new Date(s.birthdate).toISOString().slice(0, 10) }
                      : s.ageMonths !== null && { mode: "age", ...splitMonths(s.ageMonths) }),
                  });
                  setSuggestions([]);
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Informar</p>
        <Chips
          options={[
            { value: "age", label: "Idade" },
            { value: "birthdate", label: "Data de nascimento" },
          ]}
          value={value.mode}
          onChange={(mode) => onChange({ mode })}
        />
      </div>

      {value.mode === "age" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Idade *</p>
          <div className="flex items-center gap-2">
            <NumberStepper
              className="flex-1"
              value={value.years}
              onChange={(years) => onChange({ years })}
              min={0}
              max={MAX_VISITOR_AGE_YEARS}
              aria-label="Anos"
            />
            <span className="w-14 text-sm text-muted-foreground">anos</span>
          </div>
          <div className="flex items-center gap-2">
            <NumberStepper
              className="flex-1"
              value={value.months}
              onChange={(months) => onChange({ months })}
              min={0}
              max={11}
              aria-label="Meses"
            />
            <span className="w-14 text-sm text-muted-foreground">meses</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium">Data de nascimento *</p>
          <Input
            type="date"
            className="h-12"
            value={value.birthdate}
            onChange={(e) => onChange({ birthdate: e.target.value })}
          />
        </div>
      )}

      {withSchedule && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Horário</p>
          <Chips
            options={[
              { value: "EBD", label: "EBD" },
              { value: "CULTO", label: "Culto" },
            ]}
            value={value.type}
            onChange={(type) => onChange({ type })}
          />
        </div>
      )}

      <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Turma: </span>
        <span className="font-medium">{className ?? "informe a idade ou a data"}</span>
      </div>
    </div>
  );
}
