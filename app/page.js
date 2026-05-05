"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  formatMoney,
  monthTotals,
  occurrencesForDay,
  occurrencesForMonth,
  parseISODate,
  toISODate,
  yearSeries
} from "@/lib/dateLogic";

const blankForm = {
  type: "expense",
  name: "",
  description: "",
  amount: "",
  startDate: toISODate(new Date()),
  recurrenceMonths: 0
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISODate(today), [today]);
  const [items, setItems] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(todayISO);
  const [draft, setDraft] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function loadItems() {
    setLoading(true);
    const response = await fetch("/api/items", { cache: "no-store" });
    const data = await response.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const year = selectedMonth.getFullYear();
  const monthIndex = selectedMonth.getMonth();
  const selectedDate = parseISODate(selectedDay) || today;
  const activeMonthOccurrences = useMemo(
    () => occurrencesForMonth(items, year, monthIndex),
    [items, year, monthIndex]
  );
  const dayOccurrences = useMemo(() => occurrencesForDay(items, selectedDay), [items, selectedDay]);
  const totals = useMemo(() => monthTotals(items, year, monthIndex), [items, year, monthIndex]);
  const chartData = useMemo(() => yearSeries(items, year), [items, year]);
  const balance = totals.income - totals.expense;

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.description, item.type].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(needle)
      )
    );
  }, [items, query]);

  const occurrenceByDay = useMemo(() => {
    return activeMonthOccurrences.reduce((map, occurrence) => {
      map[occurrence.occurrenceDate] ||= [];
      map[occurrence.occurrenceDate].push(occurrence);
      return map;
    }, {});
  }, [activeMonthOccurrences]);

  function shiftMonth(amount) {
    const next = new Date(year, monthIndex + amount, 1);
    setSelectedMonth(next);
    const shouldUseToday = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
    setSelectedDay(shouldUseToday ? todayISO : toISODate(next));
  }

  function startNew(type = "expense", date = selectedDay) {
    setEditingId(null);
    setDraft({ ...blankForm, type, startDate: date });
    setError("");
  }

  function editItem(item) {
    setEditingId(item.id);
    setDraft({
      type: item.type,
      name: item.name,
      description: item.description,
      amount: String(item.amount),
      startDate: item.startDate,
      recurrenceMonths: Number(item.recurrenceMonths || 0)
    });
    setError("");
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch(editingId ? `/api/items/${editingId}` : "/api/items", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not save this item.");
      setSaving(false);
      return;
    }

    await loadItems();
    setEditingId(data.item.id);
    setDraft({
      type: data.item.type,
      name: data.item.name,
      description: data.item.description,
      amount: String(data.item.amount),
      startDate: data.item.startDate,
      recurrenceMonths: Number(data.item.recurrenceMonths || 0)
    });
    setSaving(false);
  }

  async function deleteItem() {
    if (!editingId) {
      return;
    }

    setSaving(true);
    await fetch(`/api/items/${editingId}`, { method: "DELETE" });
    setSaving(false);
    startNew();
    await loadItems();
  }

  return (
    <main className="min-h-screen bg-[var(--page)] text-[var(--ink)]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="header-shell">
          <div className="flex min-w-0 items-center gap-4">
            <div className="brand-mark">
              <img src="/subflow-mark.png" alt="" />
            </div>
            <div className="min-w-0">
              <p className="eyebrow">Local finance planner</p>
              <h1 className="truncate font-display text-3xl font-semibold tracking-normal sm:text-5xl">SubFlow</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ArrowLeft size={18} />
            </button>
            <div className="month-chip">
              {selectedMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ArrowRight size={18} />
            </button>
            <button
              className="today-button"
              onClick={() => {
                setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDay(todayISO);
              }}
            >
              <CalendarDays size={17} />
              Today
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Income this month" value={formatMoney(totals.income)} tone="income" icon={TrendingUp} />
          <MetricCard label="Expenses this month" value={formatMoney(totals.expense)} tone="expense" icon={TrendingDown} />
          <MetricCard
            label="Monthly balance"
            value={formatMoney(balance)}
            tone={balance >= 0 ? "income" : "expense"}
            icon={CircleDollarSign}
          />
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_440px]">
          <div className="space-y-5">
            <div className="workspace-panel">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">Infinite calendar</p>
                  <h2>{selectedMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
                </div>
                <button className="new-button" onClick={() => startNew("expense", selectedDay)}>
                  <Plus size={18} />
                  Add flow
                </button>
              </div>

              <div className="calendar-grid weekday-grid">
                {weekDays.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {buildCalendarDays(selectedMonth).map((date) => {
                  const iso = toISODate(date);
                  const occurrences = occurrenceByDay[iso] || [];
                  const isCurrentMonth = date.getMonth() === monthIndex;
                  const isToday = iso === todayISO;
                  const isSelected = iso === selectedDay;
                  const incomeCount = occurrences.filter((item) => item.type === "income").length;
                  const expenseCount = occurrences.filter((item) => item.type === "expense").length;
                  const net = occurrences.reduce(
                    (sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)),
                    0
                  );

                  return (
                    <button
                      key={iso}
                      className={[
                        "day-cell",
                        isCurrentMonth ? "" : "outside-month",
                        isToday ? "is-today" : "",
                        isSelected ? "is-selected" : ""
                      ].join(" ")}
                      onClick={() => {
                        setSelectedDay(iso);
                        if (!isCurrentMonth) {
                          setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                        }
                      }}
                    >
                      <span className="day-number">{date.getDate()}</span>
                      {occurrences.length > 0 && (
                        <span className="day-signals">
                          {incomeCount > 0 && <span className="signal income">{incomeCount}</span>}
                          {expenseCount > 0 && <span className="signal expense">{expenseCount}</span>}
                        </span>
                      )}
                      {occurrences.length > 0 && <span className="day-net">{formatMoney(net)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="workspace-panel">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">Annual rhythm</p>
                  <h2>{year} income and expenses</h2>
                </div>
                <div className="mini-nav">
                  <button onClick={() => setSelectedMonth(new Date(year - 1, monthIndex, 1))} aria-label="Previous year">
                    <ArrowLeft size={16} />
                  </button>
                  <button onClick={() => setSelectedMonth(new Date(year + 1, monthIndex, 1))} aria-label="Next year">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(34, 47, 62, .10)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#5b6472", fontSize: 12 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#5b6472", fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(17, 89, 89, .08)" }}
                      formatter={(value, name) => [formatMoney(value), name]}
                      contentStyle={{
                        border: "1px solid rgba(20, 27, 36, .12)",
                        borderRadius: 8,
                        boxShadow: "0 12px 34px rgba(20, 27, 36, .14)"
                      }}
                    />
                    <Bar dataKey="income" name="Income" fill="#177b67" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#c25545" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <aside className="side-rail">
            <section className="workspace-panel">
              <div className="panel-title compact">
                <div>
                  <p className="eyebrow">Selected day</p>
                  <h2>
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </h2>
                </div>
                <button className="icon-button small" onClick={() => startNew("income", selectedDay)} aria-label="Add income">
                  <Plus size={16} />
                </button>
              </div>

              <div className="agenda-list">
                {dayOccurrences.length === 0 ? (
                  <EmptyState title="No flows on this day" />
                ) : (
                  dayOccurrences.map((item) => <FlowRow key={`${item.id}-${item.occurrenceDate}`} item={item} onClick={() => editItem(item)} />)
                )}
              </div>
            </section>

            <section className="workspace-panel">
              <div className="panel-title compact">
                <div>
                  <p className="eyebrow">{editingId ? "Edit flow" : "Create flow"}</p>
                  <h2>{editingId ? draft.name || "Untitled flow" : "New entry"}</h2>
                </div>
                {editingId && (
                  <button className="icon-button small" onClick={() => startNew()} aria-label="Close editor">
                    <X size={16} />
                  </button>
                )}
              </div>

              <form className="flow-form" onSubmit={saveItem}>
                <div className="segmented">
                  <button
                    type="button"
                    className={draft.type === "income" ? "active income" : ""}
                    onClick={() => setDraft((current) => ({ ...current, type: "income" }))}
                  >
                    <TrendingUp size={16} />
                    Income
                  </button>
                  <button
                    type="button"
                    className={draft.type === "expense" ? "active expense" : ""}
                    onClick={() => setDraft((current) => ({ ...current, type: "expense" }))}
                  >
                    <TrendingDown size={16} />
                    Expense
                  </button>
                </div>

                <label>
                  <span>Name</span>
                  <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
                </label>

                <label>
                  <span>Description</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    rows={3}
                  />
                </label>

                <div className="form-grid">
                  <label>
                    <span>Amount</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    <span>Date</span>
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                      required
                    />
                  </label>
                </div>

                <label>
                  <span>Repeats</span>
                  <select
                    value={draft.recurrenceMonths}
                    onChange={(event) => setDraft({ ...draft, recurrenceMonths: Number(event.target.value) })}
                  >
                    <option value={0}>One time only</option>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((months) => (
                      <option key={months} value={months}>
                        Every {months} {months === 1 ? "month" : "months"}
                      </option>
                    ))}
                  </select>
                </label>

                {error && <p className="form-error">{error}</p>}

                <div className="form-actions">
                  {editingId && (
                    <button type="button" className="danger-button" onClick={deleteItem} disabled={saving}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                  )}
                  <button type="submit" className="save-button" disabled={saving}>
                    {saving ? <RefreshCw className="spin" size={16} /> : <Check size={16} />}
                    {editingId ? "Save changes" : "Create flow"}
                  </button>
                </div>
              </form>
            </section>

            <section className="workspace-panel">
              <div className="panel-title compact">
                <div>
                  <p className="eyebrow">All flows</p>
                  <h2>{items.length} saved</h2>
                </div>
              </div>

              <div className="search-box">
                <Search size={16} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search flows" />
              </div>

              <div className="item-list">
                {loading ? (
                  <EmptyState title="Loading flows" />
                ) : filteredItems.length === 0 ? (
                  <EmptyState title="No saved flows" />
                ) : (
                  filteredItems.map((item) => <FlowRow key={item.id} item={item} onClick={() => editItem(item)} editing={editingId === item.id} />)
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, tone, icon: Icon }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <span>
        <Icon size={22} />
      </span>
    </div>
  );
}

function FlowRow({ item, onClick, editing = false }) {
  const recurrence = Number(item.recurrenceMonths || 0);

  return (
    <button className={`flow-row ${item.type} ${editing ? "editing" : ""}`} onClick={onClick}>
      <span className="flow-icon">{item.type === "income" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</span>
      <span className="flow-copy">
        <strong>{item.name}</strong>
        <small>
          <Clock3 size={13} />
          {recurrence === 0 ? "One time" : `Every ${recurrence} ${recurrence === 1 ? "month" : "months"}`}
        </small>
      </span>
      <span className="flow-amount">{formatMoney(item.amount)}</span>
      <Pencil className="flow-edit" size={14} />
    </button>
  );
}

function EmptyState({ title }) {
  return (
    <div className="empty-state">
      <span />
      <p>{title}</p>
    </div>
  );
}

function buildCalendarDays(month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const mondayOffset = (first.getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => new Date(year, monthIndex, index - mondayOffset + 1));
}
