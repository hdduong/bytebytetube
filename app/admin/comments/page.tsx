import Link from "next/link";
import { Notice, recordPath, SearchBox } from "@/components/admin/fields";
import { CommentForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { listComments, userOptions, videoOptions } from "@/lib/admin";
import { deleteComment } from "@/lib/admin-actions";

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [rows, users, videoChoices] = await Promise.all([listComments(query), userOptions(), videoOptions()]);

  return (
    <div>
      <Notice error={params.error} />
      <h2 className="mb-4 text-[20px] font-medium">Comments</h2>
      <SearchBox query={query} placeholder="Search comments" />
      <details className="mb-6 rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-[14px] font-medium">New comment</summary>
        <div className="mt-4">
          <CommentForm userChoices={users} videoChoices={videoChoices} />
        </div>
      </details>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-[14px]">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Comment</th>
              <th className="px-3 py-2 font-medium">Video</th>
              <th className="px-3 py-2 font-medium">Likes</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((comment) => (
              <tr key={comment.id} className="border-b border-line last:border-0">
                <td className="max-w-md px-3 py-2">
                  <Link href={recordPath("/admin/comments", comment.id)} className="line-clamp-2 font-medium hover:underline">
                    {comment.body}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{comment.videoTitle}</td>
                <td className="px-3 py-2 text-muted">{comment.likes}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteButton action={deleteComment} name="id" value={comment.id} label="this comment" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-[14px] text-muted">No comments match that search.</p> : null}
    </div>
  );
}
