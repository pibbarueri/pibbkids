"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Admin toggle for the first_access_bypass_cpf feature flag.
export function FirstAccessToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstAccessBypassCpf: !on }),
    });
    if (res.ok) {
      const d = await res.json();
      setOn(d.firstAccessBypassCpf);
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Primeiro acesso sem CPF</p>
        <p className="text-xs text-muted-foreground">
          Permite voluntários sem CPF cadastrado criarem a senha.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={saving}
        onClick={toggle}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            on ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
