"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

type RawRow = {
  // Netflix headers vary a bit; these are the ones we use.
  // We only require Start Time and Title; Duration is optional.
  "Start Time"?: string;
  "Start Time UTC"?: string;  // some exports include this
  Duration?: string;
  Title?: string;
  [key: string]: any;
};

type DayPoint = { day: string; minutes: number };
type TitlePoint = { title: string; minutes: number };

function parseDurationToMinutes(raw?: string): number {
  if (!raw) return 0;
  const s = raw.trim();

  // HH:MM:SS
  let m = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const [_, h, mm, ss] = m;
    return parseInt(h) * 60 + parseInt(mm) + Math.floor(parseInt(ss) / 60);
  }

  // MM:SS
  m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const [_, mm, ss] = m;
    return parseInt(mm) + Math.floor(parseInt(ss) / 60);
  }

  // "Xh Ym" or "X h Y m"
  m = s.match(/^(\d+)\s*h\s*(\d+)\s*m$/i);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);

  // "Xm" or "X min"
  m = s.match(/^(\d+)\s*m(in)?$/i);
  if (m) return parseInt(m[1]);

  // plain number? assume minutes
  m = s.match(/^(\d+)$/);
  if (m) return parseInt(m[1]);

  return 0; // unknown format
}

function toDateKey(raw?: string): string | null {
  if (!raw) return null;
  // Many Netflix CSVs are ISO-ish; try native Date first.
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export default function Home() {
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { byDay, byTitle } = useMemo(() => {
    const dayMap = new Map<string, number>();
    const titleMap = new Map<string, number>();

    rows?.forEach((r) => {
      const start = toDateKey(r["Start Time"] ?? r["Start Time UTC"]);
      const title = (r["Title"] ?? "").toString();
      const minutes = parseDurationToMinutes(r["Duration"]);

      if (start) {
        dayMap.set(start, (dayMap.get(start) ?? 0) + minutes);
      }
      if (title) {
        titleMap.set(title, (titleMap.get(title) ?? 0) + minutes);
      }
    });

    const byDay: DayPoint[] = Array.from(dayMap.entries())
      .map(([day, minutes]) => ({ day, minutes }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));

    const byTitle: TitlePoint[] = Array.from(titleMap.entries())
      .map(([title, minutes]) => ({ title, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
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
                    <Line type="monotone" dataKey="minutes" />
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
                    <Bar dataKey="minutes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        <footer className="text-xs opacity-70">
          Tip: Get your CSV from Netflix → Account → Profile & Parental Controls → **Viewing activity** → **Download all**.
        </footer>
      </div>
    </main>
  );
}
