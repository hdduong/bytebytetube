<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pull requests

Before creating a pull request, fetch and start from the latest `main`.

Every pull request needs a GitHub Copilot review. Request it with `gh pr edit <number> --add-reviewer "@copilot"`, wait until the review finishes, and reply to every comment.

If a comment is a real problem, fix it in code, push, reply, and resolve the thread. If it is not a real problem, reply with the reason and leave the code as it is.

After those fixes, request Copilot again. Keep doing that until Copilot has no new comments, or a remaining comment does not make sense. Tell the user about any comment you did not change the code for.
