import { NextResponse } from "next/server";
import { listItems, mutate } from "@/lib/db";

function normalizePayload(payload) {
  const type = payload.type === "income" ? "income" : payload.type === "expense" ? "expense" : null;
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const amount = Number(payload.amount);
  const startDate = String(payload.startDate || "").trim();
  const recurrenceMonths = Number(payload.recurrenceMonths || 0);

  if (!type) {
    return { error: "Choose income or expense." };
  }

  if (!name) {
    return { error: "Name is required." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { error: "Choose a valid date." };
  }

  if (!Number.isInteger(recurrenceMonths) || recurrenceMonths < 0 || recurrenceMonths > 12) {
    return { error: "Repeat interval must be one-time or 1 to 12 months." };
  }

  return { type, name, description, amount, startDate, recurrenceMonths };
}

export async function GET() {
  return NextResponse.json({ items: await listItems() });
}

export async function POST(request) {
  const payload = normalizePayload(await request.json());

  if (payload.error) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const now = new Date().toISOString();
  const [item] = await mutate(
    `
      INSERT INTO items (type, name, description, amount, startDate, recurrenceMonths, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, type, name, description, amount, startDate, recurrenceMonths, createdAt, updatedAt
    `,
    [
      payload.type,
      payload.name,
      payload.description,
      payload.amount,
      payload.startDate,
      payload.recurrenceMonths,
      now,
      now
    ]
  );

  return NextResponse.json({ item }, { status: 201 });
}
