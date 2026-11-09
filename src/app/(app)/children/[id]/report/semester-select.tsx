"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function semesterLabel(semester: string) {
  const [year, half] = semester.split("-");
  return `${half}º semestre ${year}`;
}

export function SemesterSelect({ value, options }: { value: string; options: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Select
      value={value}
      onValueChange={(v) => v && router.push(`${pathname}?semester=${v}`)}
      items={Object.fromEntries(options.map((o) => [o, semesterLabel(o)]))}
    >
      <SelectTrigger className="h-10 w-full sm:w-56 no-print"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{semesterLabel(o)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
