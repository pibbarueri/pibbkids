"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FunctionType } from "@prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ANTECEDENTES_LINKS, whatsappLink } from "@/lib/contact";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { formatCpf, cpfDigits } from "@/lib/cpf";

const FUNCTION_LABELS: Record<FunctionType, string> = {
  TEACHER: "Professor(a)",
  ASSISTANT: "Auxiliar",
  SUPPORT: "Apoio geral",
  WORSHIP: "Louvor",
  RECEPTION: "Recepção",
  EVENTS: "Eventos",
  IDE_KIDS: "Ide Kids",
  MEDIA_DESIGN: "Mídias e Design",
};

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  phone: z.string().min(8, "Telefone obrigatório"),
  cpf: z.string().min(11, "CPF obrigatório"),
  birthdate: z.string().min(1, "Data de nascimento obrigatória"),
  motherName: z.string().optional(),
  functions: z.array(z.enum(FunctionType)).min(1, "Selecione ao menos uma função"),
  preferredClassIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

type ClassGroup = { id: string; name: string };

export default function RegisterVolunteerPage() {
  const [submitted, setSubmitted] = useState(false);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<FunctionType[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const phone = watch("phone") ?? "";
  const cpf = watch("cpf") ?? "";

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then(setClasses);
  }, []);

  function toggleFunction(fn: FunctionType) {
    setSelectedFunctions((prev) => {
      const next = prev.includes(fn) ? prev.filter((f) => f !== fn) : [...prev, fn];
      setValue("functions", next);
      // Turma selection only makes sense for Professor/Auxiliar — clear it otherwise.
      if (!next.includes("TEACHER") && !next.includes("ASSISTANT")) {
        setSelectedClasses([]);
        setValue("preferredClassIds", []);
      }
      return next;
    });
  }

  function toggleClass(id: string) {
    setSelectedClasses((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      setValue("preferredClassIds", next);
      return next;
    });
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/register/volunteer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      const body = await res.json();
      setServerError(body.error ?? "Erro ao enviar cadastro.");
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-2xl">🙌</p>
          <h2 className="text-lg font-semibold">Cadastro enviado!</h2>
          <p className="text-sm text-muted-foreground">
            A liderança irá revisar e aprovar seu cadastro em breve. Você receberá acesso ao sistema após a aprovação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Image src="/logo.png" alt="PIBB Kids" priority width={64} height={61} className="mb-1" />
        <CardTitle className="font-heading">Cadastro de Voluntário</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nome completo *" error={errors.name?.message}>
            <Input {...register("name")} className="h-12" />
          </Field>

          <Field label="Telefone *" error={errors.phone?.message}>
            <Input
              type="tel"
              inputMode="numeric"
              className="h-12"
              value={formatPhone(phone)}
              onChange={(e) => setValue("phone", phoneDigits(e.target.value), { shouldValidate: true })}
            />
          </Field>

          <Field label="CPF *" error={errors.cpf?.message}>
            <Input
              inputMode="numeric"
              value={formatCpf(cpf)}
              onChange={(e) => setValue("cpf", cpfDigits(e.target.value), { shouldValidate: true })}
              placeholder="000.000.000-00"
              className="h-12"
            />
          </Field>

          <Field label="Data de nascimento *" error={errors.birthdate?.message}>
            <Input type="date" {...register("birthdate")} className="h-12" />
          </Field>

          <Field label="Nome da mãe" error={errors.motherName?.message}>
            <Input {...register("motherName")} className="h-12" />
          </Field>

          <div className="space-y-2">
            <Label>Como quer servir? *</Label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(FUNCTION_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`fn-${value}`}
                    checked={selectedFunctions.includes(value as FunctionType)}
                    onCheckedChange={() => toggleFunction(value as FunctionType)}
                  />
                  <label htmlFor={`fn-${value}`} className="text-sm cursor-pointer flex-1">
                    {label}
                  </label>
                </div>
              ))}
            </div>
            {errors.functions && (
              <p className="text-xs text-destructive">{errors.functions.message}</p>
            )}
          </div>

          {classes.length > 0 && (selectedFunctions.includes("TEACHER") || selectedFunctions.includes("ASSISTANT")) && (
            <div className="space-y-2">
              <Label>Turma(s) desejada(s)</Label>
              <div className="grid grid-cols-1 gap-2">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`cls-${cls.id}`}
                      checked={selectedClasses.includes(cls.id)}
                      onCheckedChange={() => toggleClass(cls.id)}
                    />
                    <label htmlFor={`cls-${cls.id}`} className="text-sm cursor-pointer flex-1">
                      {cls.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <Label>Antecedentes Criminais</Label>
            <p className="text-xs text-muted-foreground">
              Para a proteção das crianças, pedimos os atestados de antecedentes criminais.
            </p>
            <Dialog>
              <DialogTrigger
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "w-full h-11")}
              >
                Como enviar meus antecedentes
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Antecedentes Criminais</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p>
                    Pedimos os atestados de antecedentes criminais (federal e estadual) para a
                    segurança das crianças do ministério.
                  </p>
                  <div className="space-y-1">
                    <p className="font-medium">1. Gere os documentos:</p>
                    {ANTECEDENTES_LINKS.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-primary underline"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                  <p className="font-medium">2. Envie os PDFs pelo WhatsApp:</p>
                  <a
                    href={whatsappLink(
                      "Olá! Sou voluntário(a) do PIBB Kids e vou enviar meus antecedentes criminais."
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants(), "w-full h-11")}
                  >
                    Enviar pelo WhatsApp
                  </a>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar cadastro"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
