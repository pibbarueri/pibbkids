"use client";

import { useState } from "react";
import { Cake, Copy, Check } from "lucide-react";

type Birthday = { name: string; label: string; date: string };

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BirthdaysSection({ birthdays }: { birthdays: Birthday[] }) {
  const [copied, setCopied] = useState(false);

  function copyNextWeek() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    const nextWeek = birthdays.filter((b) => {
      const d = new Date(b.date);
      return d >= today && d <= in7Days;
    });

    const lines = nextWeek.map((b) => `🎂 ${formatDate(b.date)} - ${b.name}`);
    const text = `🎉 Aniversariantes da próxima semana! 🎉\n\n${lines.join("\n")}\n\nParabéns! 🥳🎈`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Cake className="h-4 w-4" /> Próximos aniversários
        </h2>
        <button
          onClick={copyNextWeek}
          aria-label="Copiar aniversariantes da próxima semana"
          className="flex h-8 w-8 items-center justify-center rounded-full border bg-background hover:bg-muted transition-transform active:scale-90"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="divide-y rounded-lg border">
        {birthdays.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Sem aniversários próximos 🎈
          </p>
        ) : (
          birthdays.map((b, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span className="truncate">{b.name}</span>
              <span className="shrink-0 text-muted-foreground">{b.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
