"use client";

import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export type ExecutiveChartType =
  | "bar"
  | "line"
  | "area"
  | "donut"
  | "pie"
  | "pyramid"
  | "funnel"
  | "stacked_bar"
  | "radial";

export type ChartSettings = {
  showValues: boolean;
  showPercentage: boolean;
  comparePreviousPeriod: boolean;
  showLegend: boolean;
  showGridLines: boolean;
};

export type ChartSwitcherProps = {
  title: string;
  data: Array<Record<string, any>>;
  selectedChartType: ExecutiveChartType;
  onChartTypeChange: (next: ExecutiveChartType) => void;
  availableChartTypes: ExecutiveChartType[];
  settings?: ChartSettings;
  onSettingsChange?: (next: ChartSettings) => void;
  valueFormatter?: (value: number) => string;
  onSegmentClick?: (input: { name: string; value: number; raw: any }) => void;
  subtitle?: string;
  exportLabel?: string;
  showExport?: boolean;
};

const DEFAULT_SETTINGS: ChartSettings = {
  showValues: true,
  showPercentage: false,
  comparePreviousPeriod: false,
  showLegend: true,
  showGridLines: true,
};

const palette = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#0ea5e9"];

const toName = (row: any) => (row?.name ?? row?.label ?? row?.month ?? row?.category ?? "—") as string;
const toValue = (row: any) => (typeof row?.value === "number" ? row.value : typeof row?.amount === "number" ? row.amount : 0) as number;

const normalize = (data: Array<Record<string, any>>) => {
  return data.map((row) => ({
    ...row,
    __name: toName(row),
    __value: toValue(row),
    __prev: typeof row?.prev === "number" ? row.prev : undefined,
  }));
};

const pickNumericKeys = (row: Record<string, any>) => {
  const ignore = new Set(["name", "label", "month", "category", "value", "prev", "__name", "__value", "__prev"]);
  const keys = Object.keys(row).filter((k) => !ignore.has(k) && typeof row[k] === "number");
  return keys;
};

const fmtDefault = (v: number) => new Intl.NumberFormat("en-US").format(v);

const Pyramid = ({
  rows,
  showValues,
  valueFormatter,
  onClick,
}: {
  rows: Array<{ name: string; value: number; raw: any }>;
  showValues: boolean;
  valueFormatter: (n: number) => string;
  onClick?: (r: { name: string; value: number; raw: any }) => void;
}) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const ordered = [...rows].sort((a, b) => a.value - b.value);
  return (
    <div className="h-[260px] flex flex-col justify-end gap-2">
      {ordered.map((r, idx) => {
        const w = Math.max(10, (r.value / max) * 100);
        const color = palette[idx % palette.length]!;
        return (
          <button
            key={r.name}
            type="button"
            className="w-full flex justify-center"
            onClick={() => onClick?.(r)}
          >
            <div
              className="h-10 rounded-2xl flex items-center justify-between px-4 text-white text-sm font-black"
              style={{ width: `${w}%`, background: color }}
            >
              <div className="truncate">{r.name}</div>
              {showValues ? <div className="ml-4 shrink-0 text-xs font-black">{valueFormatter(r.value)}</div> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export const ChartSwitcher = (props: ChartSwitcherProps) => {
  const settings = props.settings ?? DEFAULT_SETTINGS;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rows = useMemo(() => normalize(props.data ?? []), [props.data]);
  const valueFormatter = props.valueFormatter ?? fmtDefault;

  const stackedKeys = useMemo(() => {
    const first = rows[0];
    if (!first) return [];
    return pickNumericKeys(first).slice(0, 4);
  }, [rows]);

  const hasPrev = useMemo(() => rows.some((r) => typeof r.__prev === "number"), [rows]);

  const showPrev = settings.comparePreviousPeriod && hasPrev;

  const donutInner = 62;

  const clickRow = (r: any) => {
    const name = r?.__name ?? toName(r);
    const value = typeof r?.__value === "number" ? r.__value : toValue(r);
    props.onSegmentClick?.({ name, value, raw: r });
  };

  const renderChart = () => {
    if (rows.length === 0) {
      return <div className="h-[280px] rounded-3xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-600">No data</div>;
    }

    if (props.selectedChartType === "pyramid") {
      const list = rows.map((r) => ({ name: r.__name as string, value: r.__value as number, raw: r }));
      return (
        <Pyramid
          rows={list}
          showValues={settings.showValues}
          valueFormatter={valueFormatter}
          onClick={props.onSegmentClick ? (x) => props.onSegmentClick?.({ name: x.name, value: x.value, raw: x.raw }) : undefined}
        />
      );
    }

    if (props.selectedChartType === "radial") {
      const radialData = rows.map((r, i) => ({ name: r.__name, value: r.__value, fill: palette[i % palette.length] }));
      return (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="30%" outerRadius="100%" data={radialData}>
              {settings.showLegend ? <Legend /> : null}
              <Tooltip formatter={(v: any) => valueFormatter(Number(v))} />
              <RadialBar dataKey="value" background cornerRadius={8} onClick={(d: any) => props.onSegmentClick?.({ name: d?.name ?? "—", value: d?.value ?? 0, raw: d })} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (props.selectedChartType === "funnel") {
      const funnelData = rows
        .slice()
        .sort((a, b) => b.__value - a.__value)
        .map((r) => ({ name: r.__name, value: r.__value }));
      return (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip formatter={(v: any) => valueFormatter(Number(v))} />
              <Funnel dataKey="value" nameKey="name" data={funnelData} isAnimationActive>
                <LabelList position="right" dataKey="name" fill="#111827" fontSize={12} />
                <LabelList position="right" dataKey="value" fill="#6b7280" fontSize={11} formatter={(v: any) => valueFormatter(Number(v))} />
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (props.selectedChartType === "pie" || props.selectedChartType === "donut") {
      const pieData = rows.map((r, i) => ({ name: r.__name, value: r.__value, fill: palette[i % palette.length], raw: r }));
      const total = pieData.reduce((s, x) => s + x.value, 0);
      const label = settings.showPercentage
        ? (p: any) => `${p.name} ${(total ? (p.value / total) * 100 : 0).toFixed(0)}%`
        : settings.showValues
          ? (p: any) => `${p.name} ${valueFormatter(p.value)}`
          : undefined;
      return (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(v: any) => valueFormatter(Number(v))} />
              {settings.showLegend ? <Legend /> : null}
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={props.selectedChartType === "donut" ? donutInner : 0}
                outerRadius={105}
                label={label as any}
                onClick={(d: any) => props.onSegmentClick?.({ name: d?.name ?? "—", value: d?.value ?? 0, raw: d?.payload?.raw ?? d })}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    const shared = (
      <>
        {settings.showGridLines ? <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /> : null}
        <XAxis dataKey="__name" tick={{ fontSize: 12, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
        <Tooltip formatter={(v: any) => valueFormatter(Number(v))} />
        {settings.showLegend ? <Legend /> : null}
      </>
    );

    if (props.selectedChartType === "line") {
      return (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              {shared}
              <Line type="monotone" dataKey="__value" stroke={palette[0]} strokeWidth={3} dot={false} activeDot={{ r: 5 }} onClick={clickRow as any} />
              {showPrev ? <Line type="monotone" dataKey="__prev" stroke={palette[1]} strokeWidth={2} strokeDasharray="6 4" dot={false} /> : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (props.selectedChartType === "area") {
      return (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows}>
              {shared}
              <Area type="monotone" dataKey="__value" stroke={palette[0]} fill={palette[0]} fillOpacity={0.18} strokeWidth={3} onClick={clickRow as any} />
              {showPrev ? <Area type="monotone" dataKey="__prev" stroke={palette[1]} fill={palette[1]} fillOpacity={0.12} strokeWidth={2} /> : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (props.selectedChartType === "stacked_bar" && stackedKeys.length > 0) {
      return (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows}>
              {shared}
              {stackedKeys.map((k, i) => (
                <Bar key={k} dataKey={k} stackId="a" fill={palette[i % palette.length]} radius={[10, 10, 0, 0]} onClick={clickRow as any} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            {shared}
            <Bar dataKey="__value" fill={palette[0]} radius={[10, 10, 0, 0]} onClick={clickRow as any}>
              {rows.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
              {settings.showValues ? <LabelList dataKey="__value" position="top" formatter={(v: any) => valueFormatter(Number(v))} fill="#111827" fontSize={11} /> : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const currentSettings = settings;

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-gray-100/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-black text-gray-900">{props.title}</div>
          {props.subtitle ? <div className="text-sm text-gray-500 mt-1">{props.subtitle}</div> : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm shadow-gray-900/5">
            <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Chart</div>
            <select
              value={props.selectedChartType}
              onChange={(e) => props.onChartTypeChange(e.target.value as ExecutiveChartType)}
              className="mt-1 w-full bg-transparent text-sm font-black text-gray-900 focus:outline-none"
            >
              {props.availableChartTypes.map((t) => (
                <option key={t} value={t}>
                  {t === "bar"
                    ? "Bar Chart"
                    : t === "line"
                      ? "Line Graph"
                      : t === "area"
                        ? "Area Chart"
                        : t === "donut"
                          ? "Donut Chart"
                          : t === "pie"
                            ? "Pie Chart"
                            : t === "pyramid"
                              ? "Pyramid Chart"
                              : t === "funnel"
                                ? "Funnel Chart"
                                : t === "stacked_bar"
                                  ? "Stacked Bar Chart"
                                  : "Radial Chart"}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={() => setSettingsOpen((v) => !v)}>
            Settings
          </Button>
          {props.showExport !== false ? (
            <Button variant="outline" onClick={() => window.alert("Mock: Export Report")}>
              {props.exportLabel ?? "Export Report"}
            </Button>
          ) : null}
        </div>
      </div>
      <CardContent className="p-6">
        {settingsOpen ? (
          <div className="mb-6 rounded-3xl border border-gray-200/60 bg-white p-5">
            <div className="text-sm font-black text-gray-900">Chart settings</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(
                [
                  { key: "showValues", label: "Show values" },
                  { key: "showPercentage", label: "Show percentage" },
                  { key: "comparePreviousPeriod", label: "Compare previous period" },
                  { key: "showLegend", label: "Show legend" },
                  { key: "showGridLines", label: "Show grid lines" },
                ] as Array<{ key: keyof ChartSettings; label: string }>
              ).map((c) => (
                <label key={c.key} className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(currentSettings[c.key])}
                    onChange={(e) => {
                      const next: ChartSettings = { ...currentSettings, [c.key]: e.target.checked };
                      props.onSettingsChange?.(next);
                    }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {renderChart()}
      </CardContent>
    </Card>
  );
};
