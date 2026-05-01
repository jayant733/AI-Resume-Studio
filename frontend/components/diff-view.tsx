"use client";

import DiffViewer from "@/components/analysis/DiffViewer";
import { DiffResponse } from "@/lib/types";

export function DiffView({ data }: { data: DiffResponse }) {
  return <DiffViewer data={data as any} />;
}

