import assert from "node:assert/strict";
import test from "node:test";
import { safeAdminPath, safeNextPath } from "./return-path";

test("return paths stay on this site", () => {
  assert.equal(safeNextPath("/shorts"), "/shorts");
  assert.equal(safeNextPath("/channel/frame-rate"), "/channel/frame-rate");
  assert.equal(safeNextPath("https://evil.example"), "/admin");
  assert.equal(safeNextPath("//evil.example"), "/admin");
  assert.equal(safeNextPath("/\\evil.example"), "/admin");
  assert.equal(safeNextPath("/\t/evil.example"), "/admin");
  assert.equal(safeNextPath("/%09/evil.example"), "/admin");
  assert.equal(safeNextPath("/%2509/evil.example"), "/admin");
  assert.equal(safeNextPath("/%2f%2fevil.example"), "/admin");
  assert.equal(safeAdminPath("/admin/videos"), "/admin/videos");
  assert.equal(safeAdminPath("/admin\t/../evil.example"), "/admin");
});
