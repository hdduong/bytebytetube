import Link from "next/link";
import { AdminNav } from "@/components/admin/ui";

export const metadata = {
  title: "Admin - CinemaTube",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-muted">CinemaTube</p>
            <h1 className="text-[20px] font-medium">Admin</h1>
          </div>
          <Link href="/" className="text-[14px] text-muted hover:text-ink">
            Back to site
          </Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
