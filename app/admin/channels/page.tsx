import Link from "next/link";
import { Notice, recordPath, SearchBox } from "@/components/admin/fields";
import { ChannelForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { listChannels, userOptions } from "@/lib/admin";
import { deleteChannel } from "@/lib/admin-actions";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [rows, owners] = await Promise.all([listChannels(query), userOptions()]);

  return (
    <div>
      <Notice error={params.error} />
      <h2 className="mb-4 text-[20px] font-medium">Channels</h2>
      <SearchBox query={query} placeholder="Search channels" />
      <details className="mb-6 rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-[14px] font-medium">New channel</summary>
        <div className="mt-4">
          <ChannelForm owners={owners} />
        </div>
      </details>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-[14px]">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">UID</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((channel) => (
              <tr key={channel.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <Link href={recordPath("/admin/channels", channel.id)} className="font-medium hover:underline">
                    {channel.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{channel.slug}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-muted">{channel.id}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteButton action={deleteChannel} name="id" value={channel.id} label={channel.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-[14px] text-muted">No channels match that search.</p> : null}
    </div>
  );
}
