"use client";

import { useState } from "react";
import Link from "next/link";
import { User, LogOut, Pencil, QrCode, AlertTriangle, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeUsername } from "@/lib/text";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logoutAction } from "@/lib/actions";
import { CustomizeDialog, type CustomizeOption } from "@/components/customize-dialog";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { formatCpf } from "@/lib/cpf";

type Profile = {
  name: string;
  username: string | null;
  phone: string | null;
  cpf: string | null;
  birthdate: string | null;
  motherName: string | null;
};

export function ProfileMenu({
  profile,
  isManager,
  customizeOptions,
  navIds,
  dashboardColumns,
}: {
  profile: Profile;
  isManager: boolean;
  customizeOptions: CustomizeOption[];
  navIds: string[];
  dashboardColumns: number;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [form, setForm] = useState({
    username: profile.username ?? "",
    phone: profile.phone ?? "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const passwordMismatch = !!form.newPassword && form.newPassword !== form.confirmPassword;
  const passwordValid = !form.newPassword || (form.newPassword.length >= 6 && form.newPassword.length <= 70);
  const valid = form.username.trim().length >= 3 && !passwordMismatch && passwordValid;

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    setUsernameError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username,
        phone: form.phone,
        ...(form.newPassword ? { newPassword: form.newPassword } : {}),
      }),
    });
    if (res.ok) {
      setEditOpen(false);
      setForm((f) => ({ ...f, newPassword: "", confirmPassword: "" }));
    } else if (res.status === 409) {
      setUsernameError("Esse usuário já existe");
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
          className="flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-muted transition-transform active:scale-90"
          aria-label="Perfil"
        >
          <User className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2">
          <DropdownMenuItem className="px-2 py-2.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar Perfil
          </DropdownMenuItem>
          <DropdownMenuItem className="px-2 py-2.5" onClick={() => setCustomizeOpen(true)}>
            <LayoutGrid className="h-4 w-4" /> Personalizar
          </DropdownMenuItem>
          <DropdownMenuItem className="px-2 py-2.5" render={<Link href="/qrcodes" />}>
            <QrCode className="h-4 w-4" /> QR Codes
          </DropdownMenuItem>
          <DropdownMenuItem className="px-2 py-2.5" render={<Link href="/occurrences" />}>
            <AlertTriangle className="h-4 w-4" /> {isManager ? "Ocorrências" : "Reportar ocorrência"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="px-2 py-2.5" onClick={() => logoutAction()}>
            <LogOut className="h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        options={customizeOptions}
        initialNavIds={navIds}
        initialColumns={dashboardColumns}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Usuário</p>
              <Input className="h-12" value={form.username} onChange={(e) => { setForm((f) => ({ ...f, username: normalizeUsername(e.target.value) })); setUsernameError(null); }} />
              {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone</p>
              <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(form.phone)} onChange={(e) => setForm((f) => ({ ...f, phone: phoneDigits(e.target.value) }))} />
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Dados cadastrais</p>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome</p>
                <Input className="h-12" value={profile.name} disabled />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">CPF</p>
                <Input className="h-12" value={formatCpf(profile.cpf ?? "")} disabled />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Data de nascimento</p>
                <Input type="date" className="h-12" value={profile.birthdate ? new Date(profile.birthdate).toISOString().slice(0, 10) : ""} disabled />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome da mãe</p>
                <Input className="h-12" value={profile.motherName ?? ""} disabled />
              </div>
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
              <p className="text-xs text-muted-foreground">Entre 6 e 70 caracteres.</p>
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
