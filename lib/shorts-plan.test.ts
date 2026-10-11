import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseFromTop,
  exclusionLadder,
  neighborLimit,
  parseShortsRequest,
  pickFromNeighbors,
  shortKey,
} from "./shorts-plan";

test("neighbor count defaults to 10 and ignores bad values", () => {
  assert.equal(neighborLimit(undefined), 10);
  assert.equal(neighborLimit(""), 10);
  assert.equal(neighborLimit("10"), 10);
  assert.equal(neighborLimit("0"), 10);
  assert.equal(neighborLimit("51"), 10);
  assert.equal(neighborLimit("4"), 4);
});

test("older exclusions are dropped before newer ones", () => {
  assert.deepEqual(exclusionLadder(["older", "newer", "current"]), [
    ["older", "newer", "current"],
    ["current"],
    [],
  ]);
});

test("excluded neighbors stay out until older ones are released", () => {
  assert.equal(pickFromNeighbors(["near", "far"], ["near"], 10, () => 0), "far");
  assert.equal(pickFromNeighbors(["older", "newer"], ["older", "newer"], 10, () => 0), "older");
});

test("a next short is chosen at random from the top neighbors", () => {
  const neighbors = ["a", "b", "c"];
  assert.equal(chooseFromTop(neighbors, () => 0), "a");
  assert.equal(chooseFromTop(neighbors, () => 0.99), "c");
  assert.equal(chooseFromTop([], () => 0), null);
});

test("the same short can play again under a new feed key", () => {
  assert.notEqual(shortKey("the-chase", 1), shortKey("the-chase", 2));
});

test("requests reject oversized or malformed scopes", () => {
  assert.deepEqual(parseShortsRequest(undefined), { exclude: [], count: 3 });
  assert.equal(parseShortsRequest({ count: 9 }), null);
  assert.deepEqual(parseShortsRequest({ anchor: null, count: 1 }), { exclude: [], count: 1 });
  assert.equal(parseShortsRequest({ exclude: [""] }), null);
  assert.equal(parseShortsRequest({ anchor: "Hold On" })?.anchor, "Hold On");
  assert.equal(parseShortsRequest({ anchor: "x".repeat(120) })?.anchor?.length, 120);
  assert.equal(parseShortsRequest({ anchor: "x".repeat(121) }), null);
  assert.equal(parseShortsRequest({ anchor: "bad\0slug" }), null);
  assert.equal(parseShortsRequest({ anchor: "the-chase", exclude: ["older", "older"], count: 2 })?.exclude.length, 1);
});
