import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/fields";
import { CommentForm } from "@/components/admin/record-forms";
import { DeleteButton } from "@/components/admin/ui";
import { getComment, userOptions, videoOptions } from "@/lib/admin";
import { deleteComment } from "@/lib/admin-actions";

export default async function EditCommentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [comment, users, videoChoices] = await Promise.all([getComment(id), userOptions(), videoOptions()]);
  if (!comment) notFound();

  return (
    <div>
      <Link href="/admin/comments" className="text-[14px] text-muted hover:text-ink">
        Comments
      </Link>
      <h2 className="mb-4 mt-2 text-[20px] font-medium">Edit comment</h2>
      <Notice error={query.error} saved={query.saved} />
      <CommentForm comment={comment} userChoices={users} videoChoices={videoChoices} />
      <div className="mt-6">
        <DeleteButton action={deleteComment} name="id" value={comment.id} label="this comment" />
      </div>
    </div>
  );
}
