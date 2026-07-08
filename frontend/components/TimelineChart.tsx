"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Panel, SectionTitle } from "@/components/ui";

type TraceItem = {
  timestamp: string;
  duration: number;
  step: string;
};

type TimelineChartProps = {
  trace: TraceItem[];
};

export function TimelineChart({ trace }: TimelineChartProps) {
  const data = trace.map((item, index) => ({
    index: index + 1,
    duration: item.duration,
    step: item.step
  }));

  return (
    <Panel>
      <SectionTitle
        title="Execution timeline"
        description="Step index vs event duration (seconds)."
      />
      <div className="mt-2 h-56 w-full">
        {data.length === 0 ? (
          <p className="text-sm text-zinc-500">No trace data to chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="index" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e4e4e7",
                  color: "#18181b",
                  fontSize: 12
                }}
              />
              <Line type="monotone" dataKey="duration" stroke="#52525b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
