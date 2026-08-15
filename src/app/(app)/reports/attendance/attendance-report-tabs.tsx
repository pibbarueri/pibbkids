"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceReportClient } from "./attendance-report-client";
import { OverviewClient } from "../../attendance/overview/overview-client";
import { ClassFilterChips } from "@/components/reports/class-filter-chips";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { PrintZoomControl, DEFAULT_PRINT_ZOOM } from "@/components/reports/print-zoom-control";

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
  const [selectedClasses, setSelectedClasses] = useState<Set<string> | null>(null);
  const [dateRange, setDateRange] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });
  const [zoom, setZoom] = useState(DEFAULT_PRINT_ZOOM);

  const visibleClasses = classes.filter((c) => selectedClasses === null || selectedClasses.has(c.id));
  const visibleSundays = sundays.filter((sunday) => {
    const key = sunday.slice(0, 10);
    if (dateRange.min && key < dateRange.min) return false;
    if (dateRange.max && key > dateRange.max) return false;
    return true;
  });

  return (
    <div className="space-y-4" style={{ zoom: `${zoom}%` }}>
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
          <ClassFilterChips classes={classes} selected={selectedClasses} onChange={setSelectedClasses} />
          <DateRangeFilter min={dateRange.min} max={dateRange.max} onChange={setDateRange} />
          <OverviewClient attendance={attendance} classes={visibleClasses} sundays={visibleSundays} />
        </div>
      )}
      <PrintZoomControl zoom={zoom} onChange={setZoom} />
    </div>
  );
}
