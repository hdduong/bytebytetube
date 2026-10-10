import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { clipImageEmbedding, ensureVectorSchema, vectorLiteral } from "./clip-embedding";

function loadEnv(text: string) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[name]) process.env[name] = value;
  }
}

function report(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    try {
      loadEnv(await readFile(path.join(process.cwd(), ".env"), "utf8"));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code !== "ENOENT") throw error;
    }
  }
  const connectionString = process.env.DATABASE_URL?.replace(":6543/", ":5432/");
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = postgres(connectionString, { prepare: false, max: 1 });
  try {
    await ensureVectorSchema(sql);
    const rows = await sql<{ id: string; thumbnail: string }[]>`
      select id, thumbnail
      from videos
      where thumbnail_embedding is null and thumbnail <> ''
      order by slug
    `;
    const byThumbnail = new Map<string, string[]>();
    for (const row of rows) {
      const ids = byThumbnail.get(row.thumbnail) ?? [];
      ids.push(row.id);
      byThumbnail.set(row.thumbnail, ids);
    }
    console.log(`videos=${rows.length} uniqueThumbnails=${byThumbnail.size}`);
    let done = 0;
    for (const [thumbnail, ids] of byThumbnail) {
      const embedding = vectorLiteral(await clipImageEmbedding(thumbnail));
      await sql`
        update videos
        set thumbnail_embedding = ${embedding}::extensions.vector
        where id in ${sql(ids)}
      `;
      done += ids.length;
      console.log(`embedded ${done}/${rows.length}`);
    }
    const [summary] = await sql<{ embedded: number; total: number; dimensions: number | null }[]>`
      select
        count(*) filter (where thumbnail_embedding is not null)::int as embedded,
        count(*)::int as total,
        (select vector_dims(thumbnail_embedding) from videos where thumbnail_embedding is not null limit 1) as dimensions
      from videos
    `;
    const [index] = await sql<{ name: string | null }[]>`
      select indexrelid::regclass::text as name
      from pg_index
      join pg_class on pg_class.oid = pg_index.indexrelid
      where pg_class.relname = 'videos_thumbnail_embedding_idx' and pg_index.indisvalid
    `;
    console.log(
      `done embedded=${summary?.embedded ?? 0} total=${summary?.total ?? 0} dimensions=${summary?.dimensions ?? "none"} index=${index?.name ?? "missing"}`,
    );
    if (!summary || summary.embedded !== summary.total || summary.dimensions !== 512 || !index?.name) {
      process.exitCode = 1;
    }
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(report(error));
  process.exit(1);
});
