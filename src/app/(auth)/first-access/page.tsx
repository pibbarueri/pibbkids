"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FirstAccessPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    cpf: "",
    birthdate: "",
    newPassword: "",
    confirmPassword: "",
  });

  const mismatch = !!form.newPassword && form.newPassword !== form.confirmPassword;
  const valid =
    form.username && form.cpf && form.birthdate && form.newPassword.length >= 6 && !mismatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/first-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username,
        cpf: form.cpf,
        birthdate: form.birthdate,
        newPassword: form.newPassword,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Não foi possível concluir.");
      setLoading(false);
      return;
    }

    // Identity verified and password set — log in with the new credentials.
    const result = await signIn("credentials", {
      username: form.username,
      password: form.newPassword,
      redirect: false,
    });
    if (result?.error) {
      setError("Senha definida. Faça login normalmente.");
      setLoading(false);
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
            Primeiro acesso — confirme seus dados e crie uma senha
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" className="h-12" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" className="h-12" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Data de nascimento</Label>
              <Input id="birthdate" type="date" className="h-12" value={form.birthdate} onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" type="password" className="h-12" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input id="confirmPassword" type="password" className="h-12" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
              {mismatch && <p className="text-xs text-destructive">As senhas não conferem.</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12" disabled={!valid || loading}>
              {loading ? "Concluindo..." : "Concluir primeiro acesso"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">Voltar ao login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
