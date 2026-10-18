import assert from "node:assert/strict";
import test from "node:test";
import { installModelHostGuard, modelHostGuardInstalled } from "./model-host-guard";

test("model host guard stays installed when fetch is reassigned", async () => {
  const original = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = async (input) => {
    seen.push(String(input));
    return new Response("local");
  };
  try {
    installModelHostGuard();
    assert.equal(modelHostGuardInstalled(), true);

    globalThis.fetch = async () => new Response("restored");
    assert.equal(modelHostGuardInstalled(), true);

    await assert.rejects(() => fetch("https://api.openai.com/v1/models"), /Refusing network model request/);
    const response = await fetch("http://127.0.0.1:3200/api/model-host-guard");
    assert.equal(await response.text(), "restored");
    assert.deepEqual(seen, []);
  } finally {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: original,
    });
  }
});
