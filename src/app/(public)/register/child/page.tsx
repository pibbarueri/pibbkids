"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Frequencia } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  birthdate: z.string().min(1, "Data de nascimento obrigatória"),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  fatherPhone: z.string().min(8, "Telefone obrigatório"),
  motherPhone: z.string().optional(),
  frequency: z.nativeEnum(Frequencia),
  allergies: z.string().optional(),
  restrictions: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const FREQUENCIA_LABELS: Record<Frequencia, string> = {
  EBD: "Escola Dominical (EBD)",
  CULTO: "Culto Infantil",
  AMBOS: "EBD e Culto",
};

export default function RegisterChildPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/register/child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <h2 className="text-lg font-semibold">Cadastro enviado!</h2>
          <p className="text-sm text-muted-foreground">
            A liderança irá revisar e confirmar o cadastro em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-2xl font-heading font-extrabold text-primary tracking-tight">
          PIBB<span className="text-secondary italic ml-1">Kids</span>
        </p>
        <CardTitle className="font-heading">Cadastro de Criança</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nome completo da criança *" error={errors.name?.message}>
            <Input {...register("name")} className="h-12" />
          </Field>

          <Field label="Data de nascimento *" error={errors.birthdate?.message}>
            <Input type="date" {...register("birthdate")} className="h-12" />
          </Field>

          <Field label="Nome do pai" error={errors.fatherName?.message}>
            <Input {...register("fatherName")} className="h-12" />
          </Field>

          <Field label="Nome da mãe" error={errors.motherName?.message}>
            <Input {...register("motherName")} className="h-12" />
          </Field>

          <Field label="Telefone Pai *" error={errors.fatherPhone?.message}>
            <Input type="tel" {...register("fatherPhone")} className="h-12" />
          </Field>

          <Field label="Telefone Mãe" error={errors.motherPhone?.message}>
            <Input type="tel" {...register("motherPhone")} className="h-12" />
          </Field>

          <Field label="Frequência *" error={errors.frequency?.message}>
            <Select onValueChange={(v) => setValue("frequency", v as Frequencia)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQUENCIA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Alergias" error={errors.allergies?.message}>
            <Textarea
              {...register("allergies")}
              placeholder="Ex: amendoim, picada de inseto..."
              rows={2}
            />
          </Field>

          <Field label="Cuidados especiais / restrições" error={errors.restrictions?.message}>
            <Textarea
              {...register("restrictions")}
              placeholder="Ex: autismo, deficiência visual..."
              rows={2}
            />
          </Field>

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
