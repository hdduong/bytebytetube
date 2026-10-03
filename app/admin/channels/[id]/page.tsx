import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/fields";
import { ChannelForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { getChannelRecord, userOptions } from "@/lib/admin";
import { deleteChannel } from "@/lib/admin-actions";

export default async function EditChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [channel, owners] = await Promise.all([getChannelRecord(id), userOptions()]);
  if (!channel) notFound();

  return (
    <div>
      <Link href="/admin/channels" className="text-[14px] text-muted hover:text-ink">
        Channels
      </Link>
      <h2 className="mb-4 mt-2 text-[20px] font-medium">{channel.name}</h2>
      <Notice error={query.error} saved={query.saved} />
      <ChannelForm channel={channel} owners={owners} />
      <div className="mt-6">
        <DeleteButton action={deleteChannel} name="id" value={channel.id} label={channel.name} />
      </div>
    </div>
  );
}
