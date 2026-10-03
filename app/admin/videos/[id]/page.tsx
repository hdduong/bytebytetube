import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/fields";
import { VideoForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { channelOptions, getVideo } from "@/lib/admin";
import { deleteVideo } from "@/lib/admin-actions";

export default async function EditVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [video, choices] = await Promise.all([getVideo(id), channelOptions()]);
  if (!video) notFound();

  return (
    <div>
      <Link href="/admin/videos" className="text-[14px] text-muted hover:text-ink">
        Videos
      </Link>
      <h2 className="mb-4 mt-2 text-[20px] font-medium">{video.title}</h2>
      <Notice error={query.error} saved={query.saved} />
      <VideoForm video={video} channelChoices={choices} />
      <div className="mt-6">
        <DeleteButton action={deleteVideo} name="id" value={video.id} label={video.title} />
      </div>
    </div>
  );
}
