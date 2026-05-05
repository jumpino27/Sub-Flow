"use client";

/*
 * Composition sketch — first viewport
 *
 * The screen reads as a single editorial ledger spread on warm cream paper,
 * not a stack of rounded SaaS cards. A thin masthead at the top carries an
 * embossed brand mark on the left, the SubFlow wordmark set in Fraunces
 * (italic accent on "Flow") with a small "personal ledger" eyebrow, and the
 * month chooser on the right — all sharing one horizontal rule beneath. Below
 * the masthead, three rule-bordered metric columns (income / expenses /
 * monthly balance) read like newspaper deck stats, big serif numerals tracked
 * tight, no boxed cards. Below that the eye drops to the dominant object: a
 * dense, ledger-ruled infinite calendar with hairline rules, ink-on-cream
 * day cells, today marked by a gold dot and a warm tint, and the selected
 * day inverted to ink. A right rail (visible at xl+ as a sliver, stacked
 * below on mobile) holds the selected-day agenda, the create/edit form, and
 * a search-driven all-flows index. The yearly bar chart anchors the next
 * scroll beat — visible just under the calendar fold to signal scrollable
 * depth. Palette: warm cream paper, ink near-black, deep-teal as the single
 * brand accent, income green and expense brick used only where functional,
 * gold reserved for "today". Two type families: Fraunces (display + numerals)
 * and Bricolage Grotesque (body); JetBrains Mono only for tabular numerals.
 */

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
  const chartHasData = chartData.some((row) => Number(row.income) > 0 || Number(row.expense) > 0);

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

  const monthLabel = selectedMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthLabelShort = selectedMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" });

  return (
    <main className="app-shell">
      <header className="masthead rise rise-1">
        <div className="masthead-brand">
          <div className="brand-mark" aria-hidden>
            <img src="/subflow-mark.png" alt="" />
          </div>
          <div className="masthead-words">
            <p className="eyebrow with-rule">Personal ledger · est. {today.getFullYear()}</p>
            <h1 className="wordmark">
              Sub<em>Flow</em>
            </h1>
          </div>
        </div>

        <div className="masthead-meta">
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ArrowLeft size={17} />
          </button>
          <div className="month-chip" aria-live="polite">{monthLabel}</div>
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ArrowRight size={17} />
          </button>
          <button
            className="today-button"
            onClick={() => {
              setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedDay(todayISO);
            }}
          >
            <CalendarDays size={15} />
            Today
          </button>
        </div>
      </header>

      <section className="metric-row rise rise-2" aria-label="Monthly summary">
        <Metric
          eyebrow="Income"
          label={monthLabelShort}
          value={formatMoney(totals.income)}
          tone="income"
          icon={TrendingUp}
        />
        <Metric
          eyebrow="Expenses"
          label={monthLabelShort}
          value={formatMoney(totals.expense)}
          tone="expense"
          icon={TrendingDown}
        />
        <Metric
          eyebrow="Net"
          label={monthLabelShort}
          value={formatMoney(balance)}
          tone={balance >= 0 ? "income" : "expense"}
          icon={CircleDollarSign}
        />
      </section>

      <div className="workspace-grid">
        <div className="workspace-stack">
          <section className="panel rise rise-3" aria-label="Calendar">
            <div className="panel-head">
              <div className="stack">
                <p className="eyebrow">Infinite calendar</p>
                <h2 className="panel-title">
                  {selectedMonth.toLocaleDateString(undefined, { month: "long" })} <em>{year}</em>
                </h2>
              </div>
              <button className="new-button" onClick={() => startNew("expense", selectedDay)}>
                <Plus size={16} />
                New flow
              </button>
            </div>

            <div className="calendar-grid weekday-grid">
              {weekDays.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="calendar-grid day-grid" role="grid">
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
                    ].filter(Boolean).join(" ")}
                    onClick={() => {
                      setSelectedDay(iso);
                      if (!isCurrentMonth) {
                        setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      }
                    }}
                    aria-label={date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    aria-pressed={isSelected}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    {occurrences.length > 0 && (
                      <span className="day-signals">
                        {incomeCount > 0 && <span className="signal income">{incomeCount} in</span>}
                        {expenseCount > 0 && <span className="signal expense">{expenseCount} out</span>}
                      </span>
                    )}
                    {occurrences.length > 0 && <span className="day-net">{formatMoney(net)}</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel rise rise-4" aria-label="Annual rhythm">
            <div className="panel-head">
              <div className="stack">
                <p className="eyebrow">Annual rhythm</p>
                <h2 className="panel-title">
                  Income &amp; expenses <em>{year}</em>
                </h2>
              </div>
              <div className="mini-nav" role="group" aria-label="Year navigation">
                <button onClick={() => setSelectedMonth(new Date(year - 1, monthIndex, 1))} aria-label="Previous year">
                  <ArrowLeft size={15} />
                </button>
                <button onClick={() => setSelectedMonth(new Date(year + 1, monthIndex, 1))} aria-label="Next year">
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div className="chart-shell">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: 8, left: -12, bottom: 0 }} barCategoryGap={18}>
                    <CartesianGrid vertical={false} stroke="rgba(26, 29, 31, 0.10)" strokeDasharray="2 4" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-strong)", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 1 }}
                      dy={6}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-strong)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                      tickFormatter={(value) => `$${Math.round(value)}`}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(19, 94, 79, 0.06)" }}
                      formatter={(value, name) => [formatMoney(value), name]}
                      contentStyle={{
                        background: "var(--paper-strong)",
                        border: "1px solid var(--rule-strong)",
                        borderRadius: 2,
                        fontFamily: "var(--font-body)",
                        fontSize: 12,
                        boxShadow: "0 16px 32px -20px rgba(26, 29, 31, 0.4)"
                      }}
                      labelStyle={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--ink)" }}
                    />
                    <Bar dataKey="income" name="Income" fill="var(--income)" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="var(--expense)" radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {!chartHasData && <div className="chart-empty">No flows recorded for {year} yet.</div>}
              </div>
              <div className="chart-legend">
                <span className="lg-income">Income</span>
                <span className="lg-expense">Expenses</span>
              </div>
            </div>
          </section>
        </div>

        <aside className="side-rail">
          <section className="panel rise rise-3" aria-label="Selected day">
            <div className="panel-head">
              <div className="stack">
                <p className="eyebrow">Selected day</p>
                <h2 className="panel-title">
                  {selectedDate.toLocaleDateString(undefined, { weekday: "long" })}{" "}
                  <em>
                    {selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </em>
                </h2>
              </div>
              <button className="icon-button small" onClick={() => startNew("income", selectedDay)} aria-label="Add income on selected day">
                <Plus size={15} />
              </button>
            </div>

            <div className="list-scroll">
              {dayOccurrences.length === 0 ? (
                <EmptyState title="Nothing scheduled" />
              ) : (
                dayOccurrences.map((item) => (
                  <FlowRow key={`${item.id}-${item.occurrenceDate}`} item={item} onClick={() => editItem(item)} />
                ))
              )}
            </div>
          </section>

          <section className="panel rise rise-4" aria-label={editingId ? "Edit flow" : "Create flow"}>
            <div className="panel-head">
              <div className="stack">
                <p className="eyebrow">{editingId ? "Edit flow" : "Create flow"}</p>
                <h2 className="panel-title">
                  {editingId ? draft.name || <em>Untitled</em> : <>New <em>entry</em></>}
                </h2>
              </div>
              {editingId && (
                <button className="icon-button small" onClick={() => startNew()} aria-label="Close editor">
                  <X size={15} />
                </button>
              )}
            </div>

            <form className="flow-form" onSubmit={saveItem}>
              <div className="segmented" role="tablist" aria-label="Flow type">
                <button
                  type="button"
                  className={draft.type === "income" ? "active income" : ""}
                  onClick={() => setDraft((current) => ({ ...current, type: "income" }))}
                  aria-pressed={draft.type === "income"}
                >
                  <TrendingUp size={15} />
                  Income
                </button>
                <button
                  type="button"
                  className={draft.type === "expense" ? "active expense" : ""}
                  onClick={() => setDraft((current) => ({ ...current, type: "expense" }))}
                  aria-pressed={draft.type === "expense"}
                >
                  <TrendingDown size={15} />
                  Expense
                </button>
              </div>

              <label>
                <span>Name</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Rent, Salary, Spotify…"
                  required
                />
              </label>

              <label>
                <span>Note</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  rows={3}
                  placeholder="Optional context"
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

              {error && <p className="form-error" role="alert">{error}</p>}

              <div className="form-actions">
                {editingId && (
                  <button type="button" className="danger-button" onClick={deleteItem} disabled={saving}>
                    <Trash2 size={15} />
                    Delete
                  </button>
                )}
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? <RefreshCw className="spin" size={15} /> : <Check size={15} />}
                  {editingId ? "Save changes" : "Create flow"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel rise rise-4" aria-label="All flows">
            <div className="panel-head">
              <div className="stack">
                <p className="eyebrow">All flows</p>
                <h2 className="panel-title">
                  {items.length} <em>saved</em>
                </h2>
              </div>
            </div>

            <div className="search-box">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or note"
                aria-label="Search flows"
              />
            </div>

            <div className="list-scroll">
              {loading ? (
                <EmptyState title="Loading flows" />
              ) : filteredItems.length === 0 ? (
                <EmptyState title={query ? "No matches" : "No saved flows yet"} />
              ) : (
                filteredItems.map((item) => (
                  <FlowRow key={item.id} item={item} onClick={() => editItem(item)} editing={editingId === item.id} />
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer className="app-foot">
        <span><strong>SubFlow</strong> — local-first finance ledger</span>
        <span>{items.length.toString().padStart(3, "0")} flows · {monthLabelShort}</span>
      </footer>
    </main>
  );
}

function Metric({ eyebrow, label, value, tone, icon: Icon }) {
  return (
    <div className={`metric ${tone}`}>
      <div>
        <div className="metric-head">
          <span className="metric-tick">
            <Icon size={15} />
          </span>
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <span className="metric-value">{value}</span>
      </div>
      <span className="metric-watermark">{label}</span>
    </div>
  );
}

function FlowRow({ item, onClick, editing = false }) {
  const recurrence = Number(item.recurrenceMonths || 0);

  return (
    <button className={`flow-row ${item.type} ${editing ? "editing" : ""}`} onClick={onClick}>
      <span className="flow-icon">{item.type === "income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}</span>
      <span className="flow-copy">
        <strong>{item.name || "Untitled"}</strong>
        <small>
          <Clock3 size={11} />
          {recurrence === 0 ? "One time" : `Every ${recurrence} ${recurrence === 1 ? "month" : "months"}`}
        </small>
      </span>
      <span className="flow-amount">{formatMoney(item.amount)}</span>
      <Pencil className="flow-edit" size={13} />
    </button>
  );
}

function EmptyState({ title }) {
  return (
    <div className="empty-state">
      <span className="pulse" aria-hidden />
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
