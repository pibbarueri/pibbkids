"use client";

import { useState } from "react";
import { User, LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logoutAction } from "@/lib/actions";

type Profile = {
  name: string;
  phone: string | null;
  cpf: string | null;
  birthdate: string | null;
  motherName: string | null;
};

export function ProfileMenu({ profile }: { profile: Profile }) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: profile.name,
    phone: profile.phone ?? "",
    cpf: profile.cpf ?? "",
    birthdate: profile.birthdate ? new Date(profile.birthdate).toISOString().slice(0, 10) : "",
    motherName: profile.motherName ?? "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordMismatch = !!form.newPassword && form.newPassword !== form.confirmPassword;
  const valid = form.name.trim() && !passwordMismatch && (!form.newPassword || form.newPassword.length >= 6);

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        cpf: form.cpf,
        birthdate: form.birthdate || null,
        motherName: form.motherName,
        ...(form.newPassword ? { newPassword: form.newPassword } : {}),
      }),
    });
    if (res.ok) {
      setEditOpen(false);
      setForm((f) => ({ ...f, newPassword: "", confirmPassword: "" }));
    } else {
      const body = await res.json();
      setError(body.error ?? "Erro ao salvar.");
    }
    setSaving(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-muted"
          aria-label="Perfil"
        >
          <User className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logoutAction()}>
            <LogOut className="h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome</p>
              <Input className="h-12" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone</p>
              <Input type="tel" className="h-12" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">CPF</p>
              <Input className="h-12" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Data de nascimento</p>
              <Input type="date" className="h-12" value={form.birthdate} onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome da mãe</p>
              <Input className="h-12" value={form.motherName} onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))} />
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-medium">Alterar senha</p>
              <Input
                type="password"
                className="h-12"
                placeholder="Nova senha"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
              <Input
                type="password"
                className="h-12"
                placeholder="Confirmar nova senha"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
              {passwordMismatch && <p className="text-xs text-destructive">As senhas não conferem.</p>}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full h-12" disabled={!valid || saving} onClick={save}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
