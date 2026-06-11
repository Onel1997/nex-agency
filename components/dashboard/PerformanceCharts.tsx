"use client";

import type { ReactNode } from "react";
import { formatCents } from "@/lib/dashboard/format";
import type {
  PerformanceCommissionBars,
  PerformanceLeadStatusSlice,
  PerformanceRevenuePoint,
} from "@/lib/dashboard/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "#8b5cf6",
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fbbf24",
];

interface PerformanceChartsProps {
  revenueTrend: PerformanceRevenuePoint[];
  leadsByStatus: PerformanceLeadStatusSlice[];
  commissions: PerformanceCommissionBars;
}

export function PerformanceCharts({
  revenueTrend,
  leadsByStatus,
  commissions,
}: PerformanceChartsProps) {
  const commissionData = [
    { name: "Offen", value: commissions.outstandingCents },
    { name: "Ausgezahlt", value: commissions.paidCents },
  ];

  const revenueChartData = revenueTrend.map((point) => ({
    ...point,
    revenueEuros: point.revenueCents / 100,
  }));

  const leadChartData = leadsByStatus.filter((slice) => slice.count > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartCard title="Umsatzentwicklung" subtitle="Monatlicher Umsatz">
        {revenueChartData.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueChartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("de-DE", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <Tooltip content={<RevenueTooltip />} />
              <Line
                type="monotone"
                dataKey="revenueEuros"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ fill: "#8b5cf6", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Leads nach Status" subtitle="Verteilung im Zeitraum">
        {leadChartData.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={leadChartData}
                dataKey="count"
                nameKey="label"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
              >
                {leadChartData.map((slice, index) => (
                  <Cell
                    key={slice.status}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<LeadTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {leadsByStatus.map((slice, index) => (
            <span
              key={slice.status}
              className="inline-flex items-center gap-1.5 text-xs text-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              {slice.label}: {slice.count}
            </span>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Provisionen" subtitle="Offen vs. ausgezahlt">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={commissionData}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat("de-DE", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(value / 100)
              }
            />
            <Tooltip content={<CommissionTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              <Cell fill="#f59e0b" />
              <Cell fill="#34d399" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted">
      Keine Daten im gewählten Zeitraum
    </div>
  );
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; revenueCents: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-surface-elevated px-3 py-2 text-xs ring-1 ring-border">
      <p className="text-muted">{point.label}</p>
      <p className="font-medium text-foreground">
        {formatCents(point.revenueCents)}
      </p>
    </div>
  );
}

function LeadTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-lg bg-surface-elevated px-3 py-2 text-xs ring-1 ring-border">
      <p className="text-muted">{payload[0].name}</p>
      <p className="font-medium text-foreground">{payload[0].value} Leads</p>
    </div>
  );
}

function CommissionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-lg bg-surface-elevated px-3 py-2 text-xs ring-1 ring-border">
      <p className="text-muted">{payload[0].name}</p>
      <p className="font-medium text-foreground">
        {formatCents(payload[0].value)}
      </p>
    </div>
  );
}
