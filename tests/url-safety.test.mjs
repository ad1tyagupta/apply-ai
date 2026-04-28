import test from "node:test";
import assert from "node:assert/strict";

import { isSafePublicHttpUrl } from "../career_ops_core/lib/url-safety.mjs";

test("public URL guard accepts only public http and https URLs by default", () => {
  assert.equal(isSafePublicHttpUrl("https://jobs.example.com/role"), true);
  assert.equal(isSafePublicHttpUrl("http://jobs.example.com/role"), true);

  assert.equal(isSafePublicHttpUrl("file:///tmp/job"), false);
  assert.equal(isSafePublicHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafePublicHttpUrl("data:text/html,hello"), false);
  assert.equal(isSafePublicHttpUrl("http://localhost:3000/job"), false);
  assert.equal(isSafePublicHttpUrl("http://127.0.0.1/job"), false);
  assert.equal(isSafePublicHttpUrl("http://192.168.1.20/job"), false);
});

test("public URL guard can allow local URLs for tests", () => {
  assert.equal(isSafePublicHttpUrl("http://127.0.0.1/job", { allowLocal: true }), true);
});
