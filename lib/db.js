import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "subflow.db");

let databasePromise;

async function createDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });

  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  const db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL CHECK(amount >= 0),
      startDate TEXT NOT NULL,
      recurrenceMonths INTEGER NOT NULL DEFAULT 0 CHECK(recurrenceMonths BETWEEN 0 AND 12),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  persist(db);
  return db;
}

export async function getDb() {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}

export function persist(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function rowsFromResult(result) {
  if (!result.length) {
    return [];
  }

  const [{ columns, values }] = result;
  return values.map((valueSet) =>
    Object.fromEntries(columns.map((column, index) => [column, valueSet[index]]))
  );
}

export async function all(sql, params = []) {
  const db = await getDb();
  const statement = db.prepare(sql);
  statement.bind(params);

  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }

  statement.free();
  return rows;
}

export async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

export async function run(sql, params = []) {
  const db = await getDb();
  const statement = db.prepare(sql);
  statement.bind(params);
  statement.step();
  statement.free();
  persist(db);
}

export async function mutate(sql, params = []) {
  const db = await getDb();
  const statement = db.prepare(sql);
  statement.bind(params);

  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }

  statement.free();
  persist(db);
  return rows;
}

export async function listItems() {
  return all(`
    SELECT id, type, name, description, amount, startDate, recurrenceMonths, createdAt, updatedAt
    FROM items
    ORDER BY startDate ASC, name ASC
  `);
}

export async function findItem(id) {
  return get(
    `
      SELECT id, type, name, description, amount, startDate, recurrenceMonths, createdAt, updatedAt
      FROM items
      WHERE id = ?
    `,
    [id]
  );
}
