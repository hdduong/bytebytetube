import Link from "next/link";
import { adminCounts } from "@/lib/admin";

export default async function AdminHome() {
  const counts = await adminCounts();
  const cards = [
    ["Users", counts.users, "/admin/users"],
    ["Channels", counts.channels, "/admin/channels"],
    ["Videos", counts.videos, "/admin/videos"],
    ["Comments", counts.comments, "/admin/comments"],
  ] as const;

  return (
    <div>
      <p className="mb-6 max-w-2xl text-[14px] text-muted">
        Create, edit, and delete the catalog. This page is open. There is no sign-in yet.
      </p>
      <div className="grid gap-3 palm:grid-cols-2 desk:grid-cols-4">
        {cards.map(([label, total, href]) => (
          <Link key={href} href={href} className="rounded-xl border border-line bg-raised p-4 hover:bg-raised-hover">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="mt-1 text-[28px] font-medium">{total}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
