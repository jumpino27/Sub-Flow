import { NextResponse } from "next/server";
import { findItem, mutate, run } from "@/lib/db";

function normalizePayload(payload) {
  const type = payload.type === "income" ? "income" : payload.type === "expense" ? "expense" : null;
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const amount = Number(payload.amount);
  const startDate = String(payload.startDate || "").trim();
  const recurrenceMonths = Number(payload.recurrenceMonths || 0);

  if (!type || !name || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Type, name, and positive amount are required." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { error: "Choose a valid date." };
  }

  if (!Number.isInteger(recurrenceMonths) || recurrenceMonths < 0 || recurrenceMonths > 12) {
    return { error: "Repeat interval must be one-time or 1 to 12 months." };
  }

  return { type, name, description, amount, startDate, recurrenceMonths };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  const item = await findItem(Number(id));

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(request, { params }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const existing = await findItem(id);

  if (!existing) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const payload = normalizePayload(await request.json());
  if (payload.error) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const [item] = await mutate(
    `
      UPDATE items
      SET type = ?, name = ?, description = ?, amount = ?, startDate = ?, recurrenceMonths = ?, updatedAt = ?
      WHERE id = ?
      RETURNING id, type, name, description, amount, startDate, recurrenceMonths, createdAt, updatedAt
    `,
    [
      payload.type,
      payload.name,
      payload.description,
      payload.amount,
      payload.startDate,
      payload.recurrenceMonths,
      new Date().toISOString(),
      id
    ]
  );

  return NextResponse.json({ item });
}

export async function DELETE(_request, { params }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const existing = await findItem(id);

  if (!existing) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  await run("DELETE FROM items WHERE id = ?", [id]);

  return NextResponse.json({ ok: true });
}
