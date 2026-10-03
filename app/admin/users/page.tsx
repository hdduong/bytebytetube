import Link from "next/link";
import { Notice, recordPath, SearchBox } from "@/components/admin/fields";
import { UserForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { listUsers } from "@/lib/admin";
import { deleteUser } from "@/lib/admin-actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const rows = await listUsers(query);

  return (
    <div>
      <Notice error={params.error} />
      <h2 className="mb-4 text-[20px] font-medium">Users</h2>
      <SearchBox query={query} placeholder="Search users" />
      <details className="mb-6 rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-[14px] font-medium">New user</summary>
        <div className="mt-4">
          <UserForm />
        </div>
      </details>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-[14px]">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Handle</th>
              <th className="px-3 py-2 font-medium">UID</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <Link href={recordPath("/admin/users", user.id)} className="font-medium hover:underline">
                    {user.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{user.handle}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-muted">{user.id}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteButton action={deleteUser} name="id" value={user.id} label={user.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-[14px] text-muted">No users match that search.</p> : null}
    </div>
  );
}
