import type { ReactNode } from "react";

export const control =
  "w-full rounded-lg border border-line bg-field px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[13px] text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Notice({ error, saved }: { error?: string; saved?: string }) {
  if (error) {
    return <p className="mb-4 rounded-lg border border-line bg-raised px-3 py-2 text-[14px] text-[#ff4e45]">{error}</p>;
  }
  if (saved) {
    return <p className="mb-4 rounded-lg border border-line bg-raised px-3 py-2 text-[14px]">Saved.</p>;
  }
  return null;
}

export function SearchBox({ query, placeholder }: { query: string; placeholder: string }) {
  return (
    <form className="mb-4 max-w-md">
      <input name="q" defaultValue={query} placeholder={placeholder} aria-label={placeholder} className={control} />
    </form>
  );
}

export function recordPath(base: string, id: string) {
  return `${base}/${encodeURIComponent(id)}`;
}

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-[14px] text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}
