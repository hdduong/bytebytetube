"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/channels", "Channels"],
  ["/admin/videos", "Videos"],
  ["/admin/comments", "Comments"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-2">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full bg-chip px-3 py-1.5 text-[14px] font-medium text-on-chip"
                : "rounded-full px-3 py-1.5 text-[14px] text-muted hover:bg-raised"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DeleteButton({
  action,
  name,
  value,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
  value: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${label}?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name={name} value={value} />
      <button type="submit" className="text-[13px] text-[#ff4e45]">
        Delete
      </button>
    </form>
  );
}
