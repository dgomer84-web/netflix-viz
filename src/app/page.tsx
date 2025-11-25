//Frontend app - no server code here
"use client";

//useState - React tool to remember something and re-render when it changes
//useMemo - React tool to remember a computed value until dependencies change
import { useMemo, useState } from "react";
//Papa - CSV parsing library
import Papa from "papaparse";
//Recharts - charting library for the visualizations
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LabelList
} from "recharts";
import { title } from "process";

// Create a type for each show/film viewed
type RawRow = {
  Title?: string;
  Date?: string;
};

type DayPoint = { day: string; watched: number };
type TitlePoint = { title: string; watched: number };

export default function Home() {
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);

  const { byDay, byTitle } = useMemo(() => {
    const dayMap = new Map<string, number>();
    const titleMap = new Map<string, number>();

    rows?.forEach((r) => {
      const title = (r["Title"] ?? "").toString();
      const date = (r["Date"] ?? "1/1/75").toString();

      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
      titleMap.set(title, (titleMap.get(title) ?? 0) + 1);
    });

    const byDay: DayPoint[] = Array.from(dayMap.entries())
      .map(([day, watched]) => ({ day, watched }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));

    const byTitle: TitlePoint[] = Array.from(titleMap.entries())
      .map(([title, watched]) => ({ title, watched }))
      .sort((a, b) => b.watched - a.watched);

    return { byDay, byTitle };
  }, [rows]);
  
  const totalPages = Math.max(1, Math.ceil(byTitle.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = byTitle.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function identifyShow(title?: string) {
    if (!title) return "";
    const firstColon = title.indexOf(":");
    return (firstColon === -1 ? title : title.slice(0, firstColon)).trim();
  }

  function handleFile(file: File) {
    setError(null);
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (result) => {
        if (result.errors?.length) setError(result.errors[0].message);
        const normalized: RawRow[] = result.data.map(r => ({
          Title: identifyShow(r.Title),
          Date: r.Date,
        }));
        setRows(normalized);
      },
      error: (err) => setError(err.message),
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Netflix Viewing Dashboard</h1>
          <p className="text-sm opacity-80">
            Upload your <code>ViewingActivity.csv</code>. We process it locally in your browser.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 hover:bg-gray-100/60 dark:hover:bg-gray-900"
          >
            <span className="text-base font-medium">Drag & drop CSV here, or click to choose</span>
            <span className="text-xs opacity-70">Only reads locally. No upload to a server.</span>
          </label>
          <input
            id="file"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {rows && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="opacity-80">Parsed {rows.length.toLocaleString()} rows.</p>
              <button
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-900"
                onClick={() => setRows(null)}
              >
                Clear data
              </button>
            </div>
          )}
        </section>

        {rows && (
          <section className="grid gap-6 md:grid-cols-2">
            {/* LEFT CARD */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="mb-3 text-lg font-semibold">Watches per day</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="watched" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Top titles (by watches)</h2>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >◀ Prev</button>
                  <span className="text-sm opacity-70">{safePage + 1} / {totalPages}</span>
                  <button
                    className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                  >Next ▶</button>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pageData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, bottom: 8, left: 180 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="title"
                      tick={{ fontSize: 12 }}
                      width={180}
                      tickFormatter={(t: string) => (t.length > 40 ? t.slice(0, 39) + "…" : t)}
                    />
                    <Tooltip />
                    <Bar dataKey="watched" radius={[6, 6, 6, 6]}>
                      <LabelList dataKey="watched" position="right" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}


        <footer className="text-xs opacity-70">
          Tip: Get your CSV from Netflix → Account → Profiles → Your Profile → Viewing activity → Download all.
        </footer>
      </div>
    </main>
  );
}
