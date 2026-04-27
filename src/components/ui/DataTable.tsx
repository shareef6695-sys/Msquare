"use client";

import React, { useMemo, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (row: Row) => React.ReactNode;
  value?: (row: Row) => unknown;
};

type SortDir = "asc" | "desc";

export const DataTable = <Row,>({
  rows,
  columns,
  getRowId,
  searchPlaceholder = "Search…",
  searchKeys,
  initialSort,
  className,
}: {
  rows: Row[];
  columns: Array<DataTableColumn<Row>>;
  getRowId: (row: Row) => string;
  searchPlaceholder?: string;
  searchKeys?: Array<(row: Row) => unknown>;
  initialSort?: { key: string; dir: SortDir };
  className?: string;
}) => {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? "asc");

  const searchable = useMemo(() => {
    if (searchKeys && searchKeys.length > 0) return searchKeys;
    return columns.map((c) => (row: Row) => (c.value ? c.value(row) : c.render ? null : (row as any)?.[c.key]));
  }, [columns, searchKeys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = searchable
        .map((fn) => {
          try {
            const v = fn(r);
            if (v === null || v === undefined) return "";
            return typeof v === "string" ? v : typeof v === "number" ? String(v) : JSON.stringify(v);
          } catch {
            return "";
          }
        })
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows, searchable]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const accessor = col?.value ?? ((r: Row) => (r as any)?.[sortKey]);
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [columns, filtered, sortDir, sortKey]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full sm:w-[320px] rounded-xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {sorted.length} row{sorted.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200/60 bg-white">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-gray-50/60">
            <tr className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              {columns.map((c) => {
                const isSorted = sortKey === c.key;
                return (
                  <th key={c.key} className={cn("text-left px-4 py-3", c.headerClassName)}>
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-2 hover:text-gray-600"
                      >
                        <span>{c.header}</span>
                        <span className="text-[10px] font-black text-gray-300">{isSorted ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-600">
                  No results
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-gray-50/50">
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3 align-middle text-gray-700", c.className)}>
                      {c.render ? c.render(row) : String(c.value ? c.value(row) : (row as any)?.[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

