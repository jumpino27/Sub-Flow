"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
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
  const [hasActiveSelection, setHasActiveSelection] = useState(false);
  const [draft, setDraft] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const modalReturnFocusRef = useRef(null);

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

  // Items that have at least one occurrence in the active month.
  // One-time payments from previous months are filtered out;
  // recurring items applicable to this month are kept.
  const monthlyItems = useMemo(() => {
    const idsInMonth = new Set(activeMonthOccurrences.map((o) => o.id));
    return items.filter((item) => idsInMonth.has(item.id));
  }, [items, activeMonthOccurrences]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return monthlyItems;
    return monthlyItems.filter((item) =>
      [item.name, item.description, item.type].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      )
    );
  }, [monthlyItems, query]);

  const occurrenceByDay = useMemo(() => {
    return activeMonthOccurrences.reduce((map, occurrence) => {
      map[occurrence.occurrenceDate] ||= [];
      map[occurrence.occurrenceDate].push(occurrence);
      return map;
    }, {});
  }, [activeMonthOccurrences]);

  function blankDraft(type = "expense", date = selectedDay) {
    return { ...blankForm, type, startDate: date };
  }

  function selectDay(iso) {
    setSelectedDay(iso);
    setHasActiveSelection(true);
    setDraft((current) => ({ ...current, startDate: iso }));
  }

  function selectCalendarDate(date) {
    const iso = toISODate(date);
    selectDay(iso);
    setHasActiveSelection(true);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) {
      setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function changeDraftDate(iso) {
    setDraft((current) => ({ ...current, startDate: iso }));
    const parsed = parseISODate(iso);
    if (!parsed) return;
    setSelectedDay(iso);
    setSelectedMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }

  function shiftMonth(amount) {
    const next = new Date(year, monthIndex + amount, 1);
    const nextDay = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()
      ? todayISO
      : toISODate(next);
    setSelectedMonth(next);
    setSelectedDay(nextDay);
    setHasActiveSelection(false);
    setDraft((current) => ({ ...current, startDate: nextDay }));
  }

  function startNew(type = "expense", date = selectedDay) {
    modalReturnFocusRef.current = document.activeElement;
    setEditingId(null);
    setDraft(blankDraft(type, date));
    setError("");
    setDrawerOpen(true);
  }

  function editItem(item) {
    modalReturnFocusRef.current = document.activeElement;
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
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setDraft(blankDraft("expense", selectedDay));
    setError("");
    const returnTarget = modalReturnFocusRef.current;
    modalReturnFocusRef.current = null;
    if (returnTarget && typeof returnTarget.focus === "function") {
      requestAnimationFrame(() => returnTarget.focus());
    }
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
    setSaving(false);
    closeDrawer();
  }

  async function deleteItem() {
    if (!editingId) return;
    setSaving(true);
    await fetch(`/api/items/${editingId}`, { method: "DELETE" });
    setSaving(false);
    closeDrawer();
    await loadItems();
  }

  const monthLabel = selectedMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthLabelShort = selectedMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" });

  return (
    <main className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} flowCount={items.length} />

      <header className="masthead rise rise-1">
        <div className="masthead-words">
          <p className="eyebrow">Local-first finance ledger</p>
          <h1 className="wordmark">
            Sub<em>Flow</em>
          </h1>
        </div>

        <div className="masthead-meta" aria-label="Month context">
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ArrowLeft size={16} />
          </button>
          <span className="month-chip" aria-live="polite">{monthLabel}</span>
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <section className="metric-row rise rise-2" aria-label="Monthly summary">
        <Metric eyebrow="Income" label={monthLabelShort} value={formatMoney(totals.income)} tone="income" icon={TrendingUp} />
        <Metric eyebrow="Expenses" label={monthLabelShort} value={formatMoney(totals.expense)} tone="expense" icon={TrendingDown} />
        <Metric eyebrow="Net" label={monthLabelShort} value={formatMoney(balance)} tone={balance >= 0 ? "income" : "expense"} icon={CircleDollarSign} />
      </section>

      <div className="workspace-grid">
        <section
          className="main-content"
          role="region"
          aria-label={activeTab === "calendar" ? "Calendar view" : "Graphs view"}
        >
          <div key={activeTab} className="tab-content">
            {activeTab === "calendar" ? (
              <CalendarPanel
                selectedMonth={selectedMonth}
                year={year}
                selectedDay={selectedDay}
                todayISO={todayISO}
                monthIndex={monthIndex}
                occurrenceByDay={occurrenceByDay}
                selectCalendarDate={selectCalendarDate}
                startNew={startNew}
                hasActiveSelection={hasActiveSelection}
              />
            ) : (
              <GraphPanel
                chartData={chartData}
                year={year}
                chartHasData={chartHasData}
                setSelectedMonth={setSelectedMonth}
                monthIndex={monthIndex}
              />
            )}
          </div>
        </section>

        <aside className="side-rail">
          <SelectedDayPanel
            selectedDate={selectedDate}
            dayOccurrences={dayOccurrences}
            editItem={editItem}
            startNew={startNew}
            selectedDay={selectedDay}
            hasActiveSelection={hasActiveSelection}
          />
          <AllFlowsPanel
            monthLabelShort={monthLabelShort}
            monthlyItems={monthlyItems}
            loading={loading}
            filteredItems={filteredItems}
            query={query}
            setQuery={setQuery}
            editItem={editItem}
            editingId={editingId}
          />
        </aside>
      </div>

      <footer className="app-foot">
        <span><strong>SubFlow</strong> &middot; local-first finance ledger</span>
        <span>{items.length.toString().padStart(3, "0")} flows / {monthLabelShort}</span>
      </footer>

      {drawerOpen && (
        <FormModal
          editingId={editingId}
          draft={draft}
          setDraft={setDraft}
          saveItem={saveItem}
          closeDrawer={closeDrawer}
          saving={saving}
          error={error}
          deleteItem={deleteItem}
          changeDraftDate={changeDraftDate}
        />
      )}
    </main>
  );
}

function Sidebar({ activeTab, setActiveTab, flowCount }) {
  const tabs = [
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "graphs", label: "Graphs", icon: BarChart3 }
  ];
  return (
    <aside className="app-rail rise rise-1" aria-label="Primary navigation">
      <div className="rail-mark" aria-hidden>
        <img src="/subflow-mark.png" alt="" />
      </div>
      <nav className="rail-tabs" aria-label="Views">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              className="rail-tab"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="rail-foot" aria-hidden>
        <span>{flowCount.toString().padStart(3, "0")}</span>
      </div>
    </aside>
  );
}

function CalendarPanel({ selectedMonth, year, selectedDay, todayISO, monthIndex, occurrenceByDay, selectCalendarDate, startNew, hasActiveSelection }) {
  const selectedDateObj = parseISODate(selectedDay);
  return (
    <section className="panel calendar-panel" aria-label="Calendar">
      <div className="panel-head">
        <div className="stack">
          <p className="eyebrow">Infinite calendar</p>
          <h2 className="panel-title">
            {selectedMonth.toLocaleDateString(undefined, { month: "long" })} <em>{year}</em>
          </h2>
        </div>
        {hasActiveSelection && selectedDateObj && (
          <button
            className="new-button"
            onClick={() => startNew("expense", selectedDay)}
            aria-label={`Add flow on ${selectedDateObj.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`}
          >
            <Plus size={16} />
            Add on {selectedDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </button>
        )}
      </div>

      <div className="calendar-grid weekday-grid">
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="calendar-grid day-grid" aria-label="Choose a date">
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
              type="button"
              className={[
                "day-cell",
                isCurrentMonth ? "" : "outside-month",
                isToday ? "is-today" : "",
                isSelected ? "is-selected" : ""
              ].filter(Boolean).join(" ")}
              onClick={() => selectCalendarDate(date)}
              aria-label={date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              aria-current={isToday ? "date" : undefined}
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
  );
}

function GraphPanel({ chartData, year, chartHasData, setSelectedMonth, monthIndex }) {
  return (
    <section className="panel" aria-label="Annual rhythm">
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
  );
}

function SelectedDayPanel({ selectedDate, dayOccurrences, editItem, startNew, selectedDay, hasActiveSelection }) {
  return (
    <section className="panel side-panel rise rise-3" aria-label="Selected day">
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
        {hasActiveSelection && (
          <button
            className="icon-button small"
            onClick={() => startNew("expense", selectedDay)}
            aria-label="Add flow on selected day"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      <div className="list-scroll selected-day-list">
        {dayOccurrences.length === 0 ? (
          <EmptyState title={hasActiveSelection ? "Nothing scheduled" : "Pick a day from the calendar"} />
        ) : (
          dayOccurrences.map((item) => (
            <FlowRow key={`${item.id}-${item.occurrenceDate}`} item={item} onEdit={() => editItem(item)} />
          ))
        )}
      </div>
    </section>
  );
}

function FormModal({ editingId, draft, setDraft, saveItem, closeDrawer, saving, error, deleteItem, changeDraftDate }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const firstField = modalRef.current?.querySelector("[data-autofocus]");
    firstField?.focus();
  }, []);

  function handleModalKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeDrawer();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      modalRef.current?.querySelectorAll(
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter((node) => node.offsetParent !== null);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function chooseType(type) {
    setDraft((current) => ({ ...current, type }));
  }

  function handleTypeKeyDown(event) {
    const keys = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const options = ["income", "expense"];
    const currentIndex = options.indexOf(draft.type);
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const nextType = options[(currentIndex + direction + options.length) % options.length];
    chooseType(nextType);
    event.currentTarget.querySelector(`[data-flow-type="${nextType}"]`)?.focus();
  }

  return (
    <div
      className="modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flow-modal-title"
      onKeyDown={handleModalKeyDown}
      ref={modalRef}
    >
      <button
        type="button"
        className="modal-backdrop"
        onClick={closeDrawer}
        tabIndex={-1}
        aria-hidden="true"
      />
      <section className={`modal-card${editingId ? " is-editing" : ""}`}>
        <header className="modal-head">
          <div className="stack">
            <p className="eyebrow">{editingId ? "Edit flow" : "Create flow"}</p>
            <h2 className="panel-title" id="flow-modal-title">
              {editingId ? draft.name || <em>Untitled</em> : <>New <em>entry</em></>}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button small"
            onClick={closeDrawer}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </header>

        <form className="flow-form" onSubmit={saveItem}>
          <fieldset
            className="segmented"
            role="radiogroup"
            aria-labelledby="flow-type-label"
            onKeyDown={handleTypeKeyDown}
          >
            <legend className="sr-only" id="flow-type-label">Flow type</legend>
            <button
              type="button"
              className={draft.type === "income" ? "active income" : ""}
              onClick={() => chooseType("income")}
              role="radio"
              aria-checked={draft.type === "income"}
              tabIndex={draft.type === "income" ? 0 : -1}
              data-flow-type="income"
            >
              <TrendingUp size={15} />
              Income
            </button>
            <button
              type="button"
              className={draft.type === "expense" ? "active expense" : ""}
              onClick={() => chooseType("expense")}
              role="radio"
              aria-checked={draft.type === "expense"}
              tabIndex={draft.type === "expense" ? 0 : -1}
              data-flow-type="expense"
            >
              <TrendingDown size={15} />
              Expense
            </button>
          </fieldset>

          <label>
            <span>Name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Rent, Salary, Spotify..."
              maxLength={80}
              data-autofocus
              required
            />
          </label>

          <label>
            <span>Note</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              rows={2}
              maxLength={240}
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
                onChange={(event) => changeDraftDate(event.target.value)}
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
            <button type="button" className="ghost-button" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? <RefreshCw className="spin" size={15} /> : <Check size={15} />}
              {editingId ? "Save changes" : "Create flow"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AllFlowsPanel({ monthLabelShort, monthlyItems, loading, filteredItems, query, setQuery, editItem, editingId }) {
  return (
    <section className="panel side-panel rise rise-4" aria-label="All flows this month">
      <div className="panel-head">
        <div className="stack">
          <p className="eyebrow">All flows &middot; {monthLabelShort}</p>
          <h2 className="panel-title">
            {monthlyItems.length} <em>this month</em>
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

      <div className="list-scroll all-flows-list">
        {loading ? (
          <EmptyState title="Loading flows" />
        ) : filteredItems.length === 0 ? (
          <EmptyState title={query ? "No matches" : "No flows in this month"} />
        ) : (
          filteredItems.map((item) => (
            <FlowRow key={item.id} item={item} onEdit={() => editItem(item)} editing={editingId === item.id} />
          ))
        )}
      </div>
    </section>
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

function FlowRow({ item, onEdit, editing = false }) {
  const recurrence = Number(item.recurrenceMonths || 0);

  return (
    <div className={`flow-row ${item.type} ${editing ? "editing" : ""}`}>
      <span className="flow-icon">{item.type === "income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}</span>
      <span className="flow-copy">
        <strong title={item.name || "Untitled"}>{item.name || "Untitled"}</strong>
        <small>
          <Clock3 size={11} />
          {recurrence === 0 ? "One time" : `Every ${recurrence} ${recurrence === 1 ? "month" : "months"}`}
        </small>
      </span>
      <span className="flow-amount">{formatMoney(item.amount)}</span>
      <button type="button" className="flow-edit-button" onClick={onEdit} aria-label={`Edit ${item.name || "flow"}`}>
        <Pencil size={13} />
      </button>
    </div>
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
