import { Check, control, Field } from "@/components/admin/fields";
import {
  createChannel,
  createComment,
  createUser,
  createVideo,
  updateChannel,
  updateComment,
  updateUser,
  updateVideo,
} from "@/lib/admin-actions";
import { exploreTopics, genres } from "@/lib/videos";
import type { channels, comments, users, videos } from "@/drizzle/schema";

type UserRow = typeof users.$inferSelect;
type ChannelRow = typeof channels.$inferSelect;
type VideoRow = typeof videos.$inferSelect;
type CommentRow = typeof comments.$inferSelect;

const submit = "h-9 rounded-full bg-chip px-4 text-[14px] font-medium text-on-chip";

export function UserForm({ user }: { user?: UserRow }) {
  return (
    <form action={user ? updateUser : createUser} className="grid max-w-xl gap-4">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      {user ? <p className="text-[13px] text-muted">UID {user.id}</p> : null}
      <Field label="Name">
        <input name="name" required defaultValue={user?.name} className={control} />
      </Field>
      <Field label="Handle">
        <input name="handle" required defaultValue={user?.handle} className={control} placeholder="@Name" />
      </Field>
      <Field label="Avatar path">
        <input name="avatar" required defaultValue={user?.avatar ?? "/avatars/avatar-you.png"} className={control} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={user?.email ?? ""} className={control} />
      </Field>
      <Check name="admin" label="Admin" defaultChecked={user?.admin ?? false} />
      <button type="submit" className={submit}>
        {user ? "Save user" : "Create user"}
      </button>
    </form>
  );
}

export function ChannelForm({
  channel,
  owners,
}: {
  channel?: ChannelRow;
  owners: Array<{ id: string; name: string; handle: string }>;
}) {
  return (
    <form action={channel ? updateChannel : createChannel} className="grid max-w-xl gap-4">
      {channel ? <input type="hidden" name="id" value={channel.id} /> : null}
      {channel ? <p className="text-[13px] text-muted">UID {channel.id}</p> : null}
      <Field label="Slug">
        <input name="slug" required defaultValue={channel?.slug} className={control} placeholder="admin-desk" />
      </Field>
      <Field label="Name">
        <input name="name" required defaultValue={channel?.name} className={control} />
      </Field>
      <Field label="Handle">
        <input name="handle" required defaultValue={channel?.handle} className={control} />
      </Field>
      <Field label="Owner">
        <select name="ownerId" required defaultValue={channel?.ownerId ?? ""} className={control}>
          <option value="" disabled>
            Choose a user
          </option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name} ({owner.handle})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Avatar path">
        <input name="avatar" required defaultValue={channel?.avatar ?? "/avatars/avatar-you.png"} className={control} />
      </Field>
      <Field label="Banner path">
        <input name="banner" required defaultValue={channel?.banner ?? "/channel/banner.png"} className={control} />
      </Field>
      <Field label="Banner title">
        <input name="bannerTitle" required defaultValue={channel?.bannerTitle} className={control} />
      </Field>
      <Field label="Tagline">
        <input name="tagline" required defaultValue={channel?.tagline} className={control} />
      </Field>
      <Field label="Bio">
        <input name="bio" required defaultValue={channel?.bio} className={control} />
      </Field>
      <Field label="About">
        <textarea name="about" required defaultValue={channel?.about} rows={3} className={control} />
      </Field>
      <Field label="Subscribers">
        <input name="subscribers" required defaultValue={channel?.subscribers ?? "1K subscribers"} className={control} />
      </Field>
      <Field label="Video count">
        <input name="videoCount" type="number" required defaultValue={channel?.videoCount ?? 0} className={control} />
      </Field>
      <button type="submit" className={submit}>
        {channel ? "Save channel" : "Create channel"}
      </button>
    </form>
  );
}

export function VideoForm({
  video,
  channelChoices,
}: {
  video?: VideoRow;
  channelChoices: Array<{ id: string; name: string }>;
}) {
  return (
    <form action={video ? updateVideo : createVideo} className="grid max-w-3xl gap-4">
      {video ? <input type="hidden" name="id" value={video.id} /> : null}
      {video ? <p className="text-[13px] text-muted">UID {video.id}</p> : null}
      <Field label="Slug">
        <input name="slug" required defaultValue={video?.slug} className={control} placeholder="admin-test-video" />
      </Field>
      <Field label="Title">
        <input name="title" required defaultValue={video?.title} className={control} />
      </Field>
      <div className="grid gap-4 palm:grid-cols-2">
        <Field label="Channel">
          <select name="channelId" required defaultValue={video?.channelId ?? ""} className={control}>
            <option value="" disabled>
              Choose a channel
            </option>
            {channelChoices.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Channel name">
          <input name="channelName" required defaultValue={video?.channelName} className={control} />
        </Field>
      </div>
      <div className="grid gap-4 palm:grid-cols-3">
        <Field label="Source">
          <select name="source" required defaultValue={video?.source ?? "feed"} className={control}>
            <option value="feed">Feed</option>
            <option value="explore">Explore</option>
            <option value="channel">Channel</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Genre">
          <select name="genre" defaultValue={video?.genre ?? ""} className={control}>
            <option value="">None</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Topic">
          <select name="topic" defaultValue={video?.topic ?? ""} className={control}>
            <option value="">None</option>
            {exploreTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 palm:grid-cols-3">
        <Field label="Duration">
          <input name="duration" required defaultValue={video?.duration ?? "1:00"} className={control} />
        </Field>
        <Field label="Views">
          <input name="views" required defaultValue={video?.views ?? "1K views"} className={control} />
        </Field>
        <Field label="View count">
          <input name="viewCount" type="number" defaultValue={video?.viewCount ?? 1000} className={control} />
        </Field>
      </div>
      <div className="grid gap-4 palm:grid-cols-3">
        <Field label="Uploaded">
          <input name="uploaded" required defaultValue={video?.uploaded ?? "1 day ago"} className={control} />
        </Field>
        <Field label="Recency">
          <input name="recency" type="number" defaultValue={video?.recency ?? 0} className={control} />
        </Field>
        <Field label="Sort order">
          <input name="sortOrder" type="number" defaultValue={video?.sortOrder ?? 0} className={control} />
        </Field>
      </div>
      <Field label="Thumbnail path">
        <input name="thumbnail" required defaultValue={video?.thumbnail ?? "/thumbnails/thumb-worth-the-hype.png"} className={control} />
      </Field>
      <Field label="Avatar path">
        <input name="avatar" required defaultValue={video?.avatar ?? "/avatars/avatar-you.png"} className={control} />
      </Field>
      <div className="grid gap-4 palm:grid-cols-3">
        <Field label="Align">
          <select name="align" defaultValue={video?.align ?? "left"} className={control}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Field>
        <Field label="Shelf">
          <select name="shelf" defaultValue={video?.shelf ?? "fresh"} className={control}>
            <option value="fresh">Fresh</option>
            <option value="popular">Popular</option>
          </select>
        </Field>
        <Field label="Likes">
          <input name="likeCount" type="number" defaultValue={video?.likeCount ?? 0} className={control} />
        </Field>
      </div>
      <Field label="Overlay JSON">
        <textarea
          name="overlay"
          required
          rows={5}
          defaultValue={JSON.stringify(video?.overlay ?? [[{ text: "NEW", style: "poster" }]], null, 2)}
          className={`${control} font-mono text-[12px]`}
        />
      </Field>
      <div className="flex flex-wrap gap-4">
        <Check name="live" label="Live" defaultChecked={video?.live} />
        <Check name="newRelease" label="New release" defaultChecked={video?.newRelease} />
        <Check name="spoilerFree" label="Spoiler-free" defaultChecked={video?.spoilerFree} />
        <Check name="topRated" label="Top rated" defaultChecked={video?.topRated} />
        <Check name="subscribed" label="Subscribed" defaultChecked={video?.subscribed} />
        <Check name="unlisted" label="Unlisted" defaultChecked={video?.unlisted} />
      </div>
      <button type="submit" className={submit}>
        {video ? "Save video" : "Create video"}
      </button>
    </form>
  );
}

export function CommentForm({
  comment,
  videoChoices,
  userChoices,
}: {
  comment?: CommentRow;
  videoChoices: Array<{ id: string; title: string }>;
  userChoices: Array<{ id: string; name: string; handle: string }>;
}) {
  return (
    <form action={comment ? updateComment : createComment} className="grid max-w-xl gap-4">
      {comment ? <input type="hidden" name="id" value={comment.id} /> : null}
      {comment ? <p className="text-[13px] text-muted">UID {comment.id}</p> : null}
      <Field label="Video">
        <select name="videoId" required defaultValue={comment?.videoId ?? ""} className={control}>
          <option value="" disabled>
            Choose a video
          </option>
          {videoChoices.map((video) => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="User">
        <select name="userId" required defaultValue={comment?.userId ?? ""} className={control}>
          <option value="" disabled>
            Choose a user
          </option>
          {userChoices.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.handle})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Comment">
        <textarea name="body" required rows={4} defaultValue={comment?.body} className={control} />
      </Field>
      <div className="grid gap-4 palm:grid-cols-3">
        <Field label="Posted">
          <input name="posted" required defaultValue={comment?.posted ?? "Just now"} className={control} />
        </Field>
        <Field label="Likes">
          <input name="likes" type="number" defaultValue={comment?.likes ?? 0} className={control} />
        </Field>
        <Field label="Sort order">
          <input name="sortOrder" type="number" defaultValue={comment?.sortOrder ?? 0} className={control} />
        </Field>
      </div>
      <button type="submit" className={submit}>
        {comment ? "Save comment" : "Create comment"}
      </button>
    </form>
  );
}
