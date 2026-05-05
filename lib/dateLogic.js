export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function itemOccurrenceInMonth(item, year, monthIndex) {
  const start = parseISODate(item.startDate);
  if (!start) {
    return null;
  }

  const recurrence = Number(item.recurrenceMonths || 0);
  const targetMonth = year * 12 + monthIndex;
  const startMonth = start.getFullYear() * 12 + start.getMonth();

  if (targetMonth < startMonth) {
    return null;
  }

  if (recurrence === 0) {
    if (start.getFullYear() !== year || start.getMonth() !== monthIndex) {
      return null;
    }
  } else if ((targetMonth - startMonth) % recurrence !== 0) {
    return null;
  }

  const day = Math.min(start.getDate(), daysInMonth(year, monthIndex));
  const occurrenceDate = new Date(year, monthIndex, day);

  return {
    ...item,
    amount: Number(item.amount),
    recurrenceMonths: recurrence,
    occurrenceDate: toISODate(occurrenceDate)
  };
}

export function occurrencesForMonth(items, year, monthIndex) {
  return items
    .map((item) => itemOccurrenceInMonth(item, year, monthIndex))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.occurrenceDate !== b.occurrenceDate) {
        return a.occurrenceDate.localeCompare(b.occurrenceDate);
      }
      return a.name.localeCompare(b.name);
    });
}

export function occurrencesForDay(items, dateString) {
  const date = parseISODate(dateString);
  if (!date) {
    return [];
  }

  return occurrencesForMonth(items, date.getFullYear(), date.getMonth()).filter(
    (item) => item.occurrenceDate === dateString
  );
}

export function monthTotals(items, year, monthIndex) {
  return occurrencesForMonth(items, year, monthIndex).reduce(
    (totals, item) => {
      totals[item.type] += Number(item.amount);
      return totals;
    },
    { income: 0, expense: 0 }
  );
}

export function yearSeries(items, year) {
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const totals = monthTotals(items, year, monthIndex);
    const label = new Date(year, monthIndex, 1).toLocaleString(undefined, {
      month: "short"
    });

    return {
      month: label,
      income: totals.income,
      expense: totals.expense,
      balance: totals.income - totals.expense
    };
  });
}

export function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}
