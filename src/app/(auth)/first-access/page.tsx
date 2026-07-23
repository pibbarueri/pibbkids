"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhone, phoneDigits } from "@/lib/phone";

type CpfOption = { prefix: string; label: string };
type DateOption = { day: number; month: number; label: string };
type Challenge = {
  challenge: "cpf" | "mother" | "birthdate";
  userId: string;
  cpfOptions?: CpfOption[];
  dateOptions?: DateOption[];
};

export default function FirstAccessPage() {
  const router = useRouter();
  const [step, setStep] = useState<"id" | "challenge">("id");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ch, setCh] = useState<Challenge | null>(null);

  const [cpfPrefix, setCpfPrefix] = useState("");
  const [cpfLast2, setCpfLast2] = useState("");
  const [motherName, setMotherName] = useState("");
  const [dateIdx, setDateIdx] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/first-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "start", name, phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível continuar.");
      return;
    }
    setCh(data);
    setStep("challenge");
  }

  const mismatch = !!newPassword && newPassword !== confirm;
  const challengeAnswered =
    ch?.challenge === "cpf"
      ? !!cpfPrefix && cpfLast2.length === 2
      : ch?.challenge === "mother"
      ? motherName.trim().length > 0
      : dateIdx !== null;
  const canComplete = challengeAnswered && newPassword.length >= 6 && !mismatch;

  async function complete(e: React.FormEvent) {
    e.preventDefault();
    if (!ch || !canComplete) return;
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      step: "complete",
      userId: ch.userId,
      name,
      phone,
      newPassword,
    };
    if (ch.challenge === "cpf") {
      payload.cpfPrefix = cpfPrefix;
      payload.cpfLast2 = cpfLast2;
    } else if (ch.challenge === "mother") {
      payload.motherName = motherName;
    } else if (ch.challenge === "birthdate" && dateIdx !== null) {
      const opt = ch.dateOptions![dateIdx];
      payload.day = opt.day;
      payload.month = opt.month;
    }

    const res = await fetch("/api/first-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Não foi possível concluir.");
      setLoading(false);
      return;
    }

    // Auto-login with the just-set password (volunteer never knew their username).
    const result = await signIn("credentials", {
      username: data.username,
      password: newPassword,
      redirect: false,
    });
    if (result?.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex justify-center">
            <Image src="/logo.png" alt="PIBB Kids" priority width={112} height={107} />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === "id"
              ? "Primeiro acesso — vamos te encontrar"
              : "Confirme sua identidade e crie uma senha"}
          </p>
        </CardHeader>
        <CardContent>
          {step === "id" ? (
            <form onSubmit={start} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  className="h-12"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(phoneDigits(e.target.value))}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-12" disabled={!name.trim() || !phone || loading}>
                {loading ? "Buscando..." : "Continuar"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">Voltar ao login</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={complete} className="space-y-4">
              {ch?.challenge === "cpf" && (
                <div className="space-y-2">
                  <Label>Qual é o seu CPF?</Label>
                  <div className="space-y-2">
                    {ch.cpfOptions!.map((o) => (
                      <button
                        key={o.prefix}
                        type="button"
                        onClick={() => setCpfPrefix(o.prefix)}
                        className={cn(
                          "w-full h-11 rounded-lg border text-left px-3 font-mono text-sm transition-all active:scale-[0.98]",
                          cpfPrefix === o.prefix ? "border-primary bg-primary/10" : "border-input"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <Label htmlFor="last2">Dois últimos dígitos do CPF</Label>
                  <Input
                    id="last2"
                    inputMode="numeric"
                    maxLength={2}
                    className="h-12"
                    value={cpfLast2}
                    onChange={(e) => setCpfLast2(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="00"
                  />
                </div>
              )}

              {ch?.challenge === "mother" && (
                <div className="space-y-2">
                  <Label htmlFor="mother">Nome da sua mãe</Label>
                  <Input id="mother" className="h-12" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
                </div>
              )}

              {ch?.challenge === "birthdate" && (
                <div className="space-y-2">
                  <Label>Qual é a sua data de nascimento?</Label>
                  <div className="space-y-2">
                    {ch.dateOptions!.map((o, i) => (
                      <button
                        key={`${o.day}-${o.month}`}
                        type="button"
                        onClick={() => setDateIdx(i)}
                        className={cn(
                          "w-full h-11 rounded-lg border text-left px-3 text-sm transition-all active:scale-[0.98]",
                          dateIdx === i ? "border-primary bg-primary/10" : "border-input"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" type="password" className="h-12" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input id="confirm" type="password" className="h-12" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                {mismatch && <p className="text-xs text-destructive">As senhas não conferem.</p>}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-12" disabled={!canComplete || loading}>
                {loading ? "Concluindo..." : "Concluir primeiro acesso"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("id"); setError(null); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-transform active:scale-95"
              >
                Voltar
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
