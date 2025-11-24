//Frontend app - no server code here
"use client";

//useState - React tool to remeber something and re-render when it changes
//useMemo - React tool to remember a computed value until dependencies change
import { useMemo, useState } from "react";
//Papa - CSV parsing library
import Papa from "papaparse";
//Recharts - charting library for the visualizations
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart
} from "recharts";
import { skip } from "node:test";

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
      .sort((a, b) => b.watched - a.watched)
      .slice(0, 10);

    return { byDay, byTitle };
  }, [rows]);

  function handleFile(file: File) {
    setError(null);
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (result) => {
        if (result.errors?.length) {
          setError(result.errors[0].message);
        }
        setRows(result.data);
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
            accept=".csv,text/csv"
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
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="mb-3 text-lg font-semibold">Minutes per day</h2>
              <div className="h-64">
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

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="mb-3 text-lg font-semibold">Top 10 titles (by minutes)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byTitle}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-30} height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="watched" />
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
