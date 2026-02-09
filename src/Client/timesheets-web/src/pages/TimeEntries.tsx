// src/pages/TimeEntries.tsx

import { useEffect, useMemo, useState } from "react";
import type { DailyTimeEntryDto, UserDto } from "../api";
import {
  fetchUsers,
  fetchDailyTimeEntries,
  saveDailyTimeEntriesBulk,
} from "../api";

interface EditableEntry {
  id?: number;
  userId: number;
  workDate: string; // YYYY-MM-DD
  workedHours: number;
  ptoHours: number;
  dayType: string;
  notes: string;
}

function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

function formatLong(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function buildDateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  for (let cur = new Date(s); cur <= e; cur = addDays(cur, 1)) {
    out.push(toDateOnlyString(cur));
  }
  return out;
}

export default function TimeEntries() {
  const today = useMemo(() => new Date(), []);

  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>(() =>
    toDateOnlyString(new Date(today.getFullYear(), today.getMonth(), 1))
  );
  const [endDate, setEndDate] = useState<string>(() =>
    toDateOnlyString(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  );

  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const totalWorked = useMemo(
    () =>
      entries.reduce(
        (sum, e) => sum + (Number(e.workedHours) || 0),
        0
      ),
    [entries]
  );

  const totalPto = useMemo(
    () =>
      entries.reduce((sum, e) => sum + (Number(e.ptoHours) || 0), 0),
    [entries]
  );

  // ---------- Date range quick actions ----------
  const handleThisWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0 Sun .. 6 Sat

    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setStartDate(toDateOnlyString(monday));
    setEndDate(toDateOnlyString(sunday));
  };

  const handleLastWeek = () => {
    const now = new Date();
    const day = now.getDay();

    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((day + 6) % 7) - 7);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);

    setStartDate(toDateOnlyString(lastMonday));
    setEndDate(toDateOnlyString(lastSunday));
  };

  // ---------- Load users ----------
  useEffect(() => {
    (async () => {
      try {
        setError("");
        const u = await fetchUsers();
        setUsers(u);

        // default selected user if not set
        if (u.length && selectedUserId == null) {
          const firstActive = u.find((x) => x.isActive === 1) ?? u[0];
          setSelectedUserId(firstActive.id);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load users.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Load entries whenever range/user changes ----------
  useEffect(() => {
    if (!selectedUserId) return;

    (async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const apiEntries = await fetchDailyTimeEntries(
          selectedUserId,
          startDate,
          endDate
        );

        // Index by date for easy merge
        const byDate = new Map<string, DailyTimeEntryDto>();
        for (const e of apiEntries) byDate.set(e.workDate.slice(0, 10), e);

        const days = buildDateRange(startDate, endDate);

        const merged: EditableEntry[] = days.map((d) => {
          const existing = byDate.get(d);

          if (existing) {
            return {
              id: existing.id,
              userId: existing.userId,
              workDate: existing.workDate.slice(0, 10),
              workedHours: Number(existing.workedHours) || 0,
              ptoHours: Number(existing.ptoHours) || 0,
              dayType: existing.dayType || "Work",
              notes: existing.notes || "",
            };
          }

          return {
            userId: selectedUserId,
            workDate: d,
            workedHours: 0,
            ptoHours: 0,
            dayType: "Work",
            notes: "",
          };
        });

        setEntries(merged);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load time entries.");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedUserId, startDate, endDate]);

  // ---------- Update entry ----------
  const handleEntryChange = (
    idx: number,
    field: keyof EditableEntry,
    value: string
  ) => {
    setEntries((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };

      if (field === "workedHours" || field === "ptoHours") {
        const n = value === "" ? 0 : Number(value);
        (row as any)[field] = Number.isFinite(n) ? n : 0;
      } else {
        (row as any)[field] = value;
      }

      // Optional: auto dayType based on PTO usage
      if (field === "ptoHours" || field === "workedHours") {
        const wh = Number(row.workedHours) || 0;
        const ph = Number(row.ptoHours) || 0;

        if (ph > 0 && wh > 0) row.dayType = "Mixed";
        else if (ph > 0) row.dayType = "PTO";
        else row.dayType = "Work";
      }

      next[idx] = row;
      return next;
    });
  };

  // ---------- Save ----------
  const handleSave = async () => {
    if (!selectedUserId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Convert to DTO for API
      const payload: DailyTimeEntryDto[] = entries.map((e) => ({
        id: e.id ?? 0,
        userId: e.userId,
        workDate: e.workDate,
        workedHours: Number(e.workedHours) || 0,
        ptoHours: Number(e.ptoHours) || 0,
        dayType: e.dayType || "Work",
        notes: e.notes || "",
      }));

      // ⚠️ If your api.ts signature differs, adjust this ONE line.
      // Common patterns:
      //   await saveDailyTimeEntriesBulk(selectedUserId, payload);
      //   await saveDailyTimeEntriesBulk(payload);
      await saveDailyTimeEntriesBulk(payload);

      setSuccess("Saved successfully.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save entries.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Time Entries
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter worked hours or PTO used for each day. Save when finished.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={handleThisWeek}
            >
              This Week
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={handleLastWeek}
            >
              Last Week
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-xl bg-afh-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-afh-navyDark disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {(error || success) && (
          <div className="mt-4 space-y-2">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Employee
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-afh-gold focus:outline-none focus:ring-4 focus:ring-afh-gold/20"
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
            >
              {users
                .filter((u) => u.isActive === 1)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                    {u.department ? ` • ${u.department}` : ""}
                  </option>
                ))}
            </select>

            <div className="mt-1 text-xs text-slate-500">
              Viewing:{" "}
              <span className="font-medium text-slate-700">
                {selectedUser
                  ? `${selectedUser.firstName} ${selectedUser.lastName}`
                  : "—"}
              </span>
              {selectedUser?.department ? ` • ${selectedUser.department}` : ""}
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Start
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-afh-gold focus:outline-none focus:ring-4 focus:ring-afh-gold/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              End
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-afh-gold focus:outline-none focus:ring-4 focus:ring-afh-gold/20"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Worked: {totalWorked.toFixed(2)}h
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              PTO: {totalPto.toFixed(2)}h
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Tip: use <span className="font-medium">0.25</span> increments (15
            min)
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Worked</th>
                <th className="px-4 py-3 text-right">PTO</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : (
                entries.map((e, idx) => {
                  const weekend = isWeekend(e.workDate);
                  const zebra = idx % 2 === 1;

                  const notesValue =
                    (e.notes || "").startsWith("Imported from legacy") ? "" : e.notes;

                  return (
                    <tr
                      key={e.workDate}
                      className={[
                        zebra ? "bg-slate-50/50" : "bg-white",
                        weekend ? "bg-amber-50/50" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {formatLong(e.workDate)}
                        </div>
                        <div className="text-xs text-slate-500">{e.workDate}</div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-right text-sm text-slate-900 shadow-sm focus:border-afh-gold focus:outline-none focus:ring-4 focus:ring-afh-gold/20"
                          value={e.workedHours}
                          onChange={(ev) =>
                            handleEntryChange(idx, "workedHours", ev.target.value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-right text-sm text-slate-900 shadow-sm focus:border-afh-gold focus:outline-none focus:ring-4 focus:ring-afh-gold/20"
                          value={e.ptoHours}
                          onChange={(ev) =>
                            handleEntryChange(idx, "ptoHours", ev.target.value)
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-afh-gold focus:outline-none focus:ring-4 focus:ring-afh-gold/20"
                          value={notesValue}
                          onChange={(ev) =>
                            handleEntryChange(idx, "notes", ev.target.value)
                          }
                          placeholder="Optional note…"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}