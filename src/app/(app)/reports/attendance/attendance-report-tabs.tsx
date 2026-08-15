"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceReportClient } from "./attendance-report-client";
import { OverviewClient } from "../../attendance/overview/overview-client";

type ClassGroup = { id: string; name: string };
type AttendanceRow = { date: string; type: string; classGroupId: string | null };

export function AttendanceReportTabs({
  attendance,
  classes,
  sundays,
  semesterLabel,
}: {
  attendance: AttendanceRow[];
  classes: ClassGroup[];
  sundays: string[];
  semesterLabel: string;
}) {
  const [tab, setTab] = useState<"calendar" | "semester">("calendar");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "calendar" | "semester")} className="no-print">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="semester">Semestral</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "calendar" ? (
        <AttendanceReportClient />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{semesterLabel}</p>
          <OverviewClient attendance={attendance} classes={classes} sundays={sundays} />
        </div>
      )}
    </div>
  );
}
