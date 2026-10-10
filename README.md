This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Node.js 22 or newer is required. Better Auth depends on Kysely, which does not run on older Node versions.

## Auth database

Before the first `npm run dev` or `npm start` on a database that does not already have the auth tables, run:

```bash
npm run db:auth
```

That applies `scripts/auth-schema.mjs` with Node. It is safe to run again. Set `DATABASE_URL` and `BETTER_AUTH_SECRET` first. See `.env.example`.

After an upgrade that adds thumbnail search, run:

```bash
npm run db:upgrade
npm run clip:setup
```

`db:upgrade` creates the pgvector column and index, then fills a CLIP embedding for every existing thumbnail. `clip:setup` downloads the CLIP model into a writable cache before the server handles a search. The app also loads that model when the Node server starts.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
