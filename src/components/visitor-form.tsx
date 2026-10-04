"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAX_VISITOR_AGE } from "@/lib/age";
import { sortClasses } from "@/lib/classes";
import { cn } from "@/lib/utils";

export type VisitorFormValue = {
  name: string;
  mode: "age" | "birthdate";
  age: number;
  birthdate: string;
  type: "EBD" | "CULTO";
  classGroupId: string | null;
};

type VisitorLike = {
  name: string;
  birthdate: string | null;
  age: number | null;
  type: "EBD" | "CULTO";
  classGroup: { id: string } | null;
};

type Suggestion = { id: string; name: string; birthdate: string | null; age: number | null };

const NO_CLASS = "__none__";
const DEFAULT_AGE = 5;

export function emptyVisitorForm(type: "EBD" | "CULTO"): VisitorFormValue {
  return { name: "", mode: "age", age: DEFAULT_AGE, birthdate: "", type, classGroupId: null };
}

export function visitorFormFrom(v: VisitorLike): VisitorFormValue {
  return {
    name: v.name,
    mode: v.birthdate ? "birthdate" : "age",
    age: v.age ?? DEFAULT_AGE,
    birthdate: v.birthdate ? new Date(v.birthdate).toISOString().slice(0, 10) : "",
    type: v.type,
    classGroupId: v.classGroup?.id ?? null,
  };
}

export function isVisitorFormValid(v: VisitorFormValue) {
  return v.name.trim().length >= 2 && (v.mode === "age" || !!v.birthdate);
}

/** Sends only the field for the chosen mode; the API clears the other one. */
export function visitorPayload(v: VisitorFormValue, opts: { includeSchedule: boolean }) {
  return {
    name: v.name.trim(),
    ...(v.mode === "age" ? { age: v.age } : { birthdate: v.birthdate }),
    ...(opts.includeSchedule && { type: v.type, classGroupId: v.classGroupId }),
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
 * Shared by "Incluir visitante" (name autocomplete, no schedule fields) and the edit dialogs
 * on Presença and the visitors report (schedule fields: horário + turma).
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
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

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

  useEffect(() => {
    if (!withSchedule) return;
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => setClasses(sortClasses(data)));
  }, [withSchedule]);

  const classItems: Record<string, string> = {
    [NO_CLASS]: "Sem turma",
    ...Object.fromEntries(classes.map((c) => [c.id, c.name])),
  };

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
                      : s.age !== null && { mode: "age", age: s.age }),
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
        <div className="space-y-1">
          <p className="text-sm font-medium">Idade *</p>
          <NumberStepper
            value={value.age}
            onChange={(age) => onChange({ age })}
            min={0}
            max={MAX_VISITOR_AGE}
            aria-label="Idade"
          />
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
        <>
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
          <div className="space-y-1">
            <p className="text-sm font-medium">Turma</p>
            <Select
              value={value.classGroupId ?? NO_CLASS}
              onValueChange={(v) => onChange({ classGroupId: !v || v === NO_CLASS ? null : v })}
              items={classItems}
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(classItems).map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
