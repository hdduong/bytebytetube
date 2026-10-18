import { blockedModelHosts, installModelHostGuard, modelHostGuardInstalled } from "@/lib/model-host-guard";

export function GET() {
  if (process.env.VISUAL_TEST_GUARD !== "1") {
    return new Response(null, { status: 404 });
  }
  installModelHostGuard();
  if (!modelHostGuardInstalled()) {
    return new Response(null, { status: 404 });
  }
  return Response.json({ blocked: blockedModelHosts().length });
}
