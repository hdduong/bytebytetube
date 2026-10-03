import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const statements = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS uid uuid NOT NULL DEFAULT gen_random_uuid()",
  "ALTER TABLE channels ADD COLUMN IF NOT EXISTS uid uuid NOT NULL DEFAULT gen_random_uuid()",
  "ALTER TABLE videos ADD COLUMN IF NOT EXISTS uid uuid NOT NULL DEFAULT gen_random_uuid()",
  "ALTER TABLE comments ADD COLUMN IF NOT EXISTS uid uuid NOT NULL DEFAULT gen_random_uuid()",
  "ALTER TABLE channels ADD COLUMN IF NOT EXISTS owner_uid uuid",
  "UPDATE channels AS c SET owner_uid = u.uid FROM users AS u WHERE u.id = c.owner_id AND c.owner_uid IS NULL",
  "ALTER TABLE channels ALTER COLUMN owner_uid SET NOT NULL",
  "ALTER TABLE videos ADD COLUMN IF NOT EXISTS slug text",
  "UPDATE videos SET slug = id WHERE slug IS NULL",
  "ALTER TABLE videos ALTER COLUMN slug SET NOT NULL",
  "ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_uid uuid",
  "UPDATE videos AS v SET channel_uid = c.uid FROM channels AS c WHERE c.slug = v.channel_slug AND v.channel_uid IS NULL",
  "ALTER TABLE videos ALTER COLUMN channel_uid SET NOT NULL",
  "ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_uid uuid",
  "ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_uid uuid",
  "UPDATE comments AS cm SET video_uid = v.uid FROM videos AS v WHERE v.id = cm.video_id AND cm.video_uid IS NULL",
  "UPDATE comments AS cm SET user_uid = u.uid FROM users AS u WHERE u.id = cm.user_id AND cm.user_uid IS NULL",
  "ALTER TABLE comments ALTER COLUMN video_uid SET NOT NULL",
  "ALTER TABLE comments ALTER COLUMN user_uid SET NOT NULL",
  "ALTER TABLE comments DROP CONSTRAINT comments_video_id_videos_id_fk",
  "ALTER TABLE comments DROP CONSTRAINT comments_user_id_users_id_fk",
  "ALTER TABLE videos DROP CONSTRAINT videos_channel_slug_channels_slug_fk",
  "ALTER TABLE channels DROP CONSTRAINT channels_owner_id_users_id_fk",
  "ALTER TABLE comments DROP COLUMN video_id",
  "ALTER TABLE comments DROP COLUMN user_id",
  "ALTER TABLE comments DROP CONSTRAINT comments_pkey",
  "ALTER TABLE comments DROP COLUMN id",
  "ALTER TABLE comments RENAME COLUMN uid TO id",
  "ALTER TABLE comments RENAME COLUMN video_uid TO video_id",
  "ALTER TABLE comments RENAME COLUMN user_uid TO user_id",
  "ALTER TABLE comments ADD PRIMARY KEY (id)",
  "ALTER TABLE videos DROP COLUMN channel_slug",
  "ALTER TABLE videos DROP CONSTRAINT videos_pkey",
  "ALTER TABLE videos DROP COLUMN id",
  "ALTER TABLE videos RENAME COLUMN uid TO id",
  "ALTER TABLE videos RENAME COLUMN channel_uid TO channel_id",
  "ALTER TABLE videos ADD PRIMARY KEY (id)",
  "ALTER TABLE videos ADD CONSTRAINT videos_slug_unique UNIQUE (slug)",
  "ALTER TABLE channels DROP COLUMN owner_id",
  "ALTER TABLE channels DROP CONSTRAINT channels_pkey",
  "ALTER TABLE channels RENAME COLUMN uid TO id",
  "ALTER TABLE channels RENAME COLUMN owner_uid TO owner_id",
  "ALTER TABLE channels ADD PRIMARY KEY (id)",
  "ALTER TABLE channels ADD CONSTRAINT channels_slug_unique UNIQUE (slug)",
  "ALTER TABLE users DROP CONSTRAINT users_pkey",
  "ALTER TABLE users DROP COLUMN id",
  "ALTER TABLE users RENAME COLUMN uid TO id",
  "ALTER TABLE users ADD PRIMARY KEY (id)",
  "ALTER TABLE channels ADD CONSTRAINT channels_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES users(id)",
  "ALTER TABLE videos ADD CONSTRAINT videos_channel_id_channels_id_fk FOREIGN KEY (channel_id) REFERENCES channels(id)",
  "ALTER TABLE comments ADD CONSTRAINT comments_video_id_videos_id_fk FOREIGN KEY (video_id) REFERENCES videos(id)",
  "ALTER TABLE comments ADD CONSTRAINT comments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id)",
  "CREATE INDEX videos_channel_id_idx ON videos (channel_id)",
  "CREATE INDEX comments_video_id_idx ON comments (video_id)",
];

async function main() {
  const sql = postgres(connectionString!, { prepare: false });
  const ready = await sql<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'id' and data_type = 'uuid'
  `;
  if (ready.length > 0) {
    console.log("User ids are already uuids. Nothing to migrate.");
    await sql.end();
    return;
  }

  await sql.begin(async (tx) => {
    for (const statement of statements) {
      await tx.unsafe(statement);
    }
  });

  const sample = await sql<{ id: string; slug: string }[]>`
    select id::text, slug from videos where slug = 'scifi-done-right'
  `;
  const counts = await sql<{ users: number; channels: number; videos: number; comments: number }[]>`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from channels) as channels,
      (select count(*)::int from videos) as videos,
      (select count(*)::int from comments) as comments
  `;
  console.log(sample[0] ? `scifi-done-right -> ${sample[0].id}` : "missing scifi-done-right");
  console.log(JSON.stringify(counts[0]));
  await sql.end();
}

main();
