import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/fields";
import { UserForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { getUser } from "@/lib/admin";
import { deleteUser } from "@/lib/admin-actions";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getUser(id);
  if (!user) notFound();

  return (
    <div>
      <Link href="/admin/users" className="text-[14px] text-muted hover:text-ink">
        Users
      </Link>
      <h2 className="mb-4 mt-2 text-[20px] font-medium">{user.name}</h2>
      <Notice error={query.error} saved={query.saved} />
      <UserForm user={user} />
      <div className="mt-6">
        <DeleteButton action={deleteUser} name="id" value={user.id} label={user.name} />
      </div>
    </div>
  );
}
