import assert from "node:assert/strict";
import test from "node:test";
import { averageEmbeddings, rankNearest } from "./like-taste";

function unit(index: number) {
  const vector = new Array<number>(512).fill(0);
  vector[index] = 1;
  return vector;
}

test("averaging keeps a single embedding on the unit sphere", () => {
  const taste = averageEmbeddings([unit(3)]);
  assert.ok(taste);
  assert.equal(taste[3], 1);
  assert.equal(taste[0], 0);
});

test("averaging two opposite axes lands between them", () => {
  const taste = averageEmbeddings([unit(0), unit(1)]);
  assert.ok(taste);
  assert.ok(Math.abs(taste[0] - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(taste[1] - Math.SQRT1_2) < 1e-9);
});

test("missing embeddings and a zero average do not create a taste vector", () => {
  assert.equal(averageEmbeddings([null, "nope", []]), null);
  assert.equal(averageEmbeddings([new Array(512).fill(0)]), null);
});

test("ranking uses cosine distance and skips videos the user already liked", () => {
  assert.deepEqual(
    rankNearest(
      [
        { id: "far", distance: 0.4 },
        { id: "liked", distance: 0.01 },
        { id: "near", distance: 0.1 },
      ],
      new Set(["liked"]),
    ),
    ["near", "far"],
  );
});
