import Link from "next/link";
import { Notice, recordPath, SearchBox } from "@/components/admin/fields";
import { VideoForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { channelOptions, listVideos } from "@/lib/admin";
import { deleteVideo } from "@/lib/admin-actions";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [rows, choices] = await Promise.all([listVideos(query), channelOptions()]);

  return (
    <div>
      <Notice error={params.error} />
      <h2 className="mb-4 text-[20px] font-medium">Videos</h2>
      <SearchBox query={query} placeholder="Search videos" />
      <details className="mb-6 rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-[14px] font-medium">New video</summary>
        <div className="mt-4">
          <VideoForm channelChoices={choices} />
        </div>
      </details>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-[14px]">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">UID</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((video) => (
              <tr key={video.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <Link href={recordPath("/admin/videos", video.id)} className="font-medium hover:underline">
                    {video.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{video.slug}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-muted">{video.id}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteButton action={deleteVideo} name="id" value={video.id} label={video.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-[14px] text-muted">No videos match that search.</p> : null}
    </div>
  );
}
