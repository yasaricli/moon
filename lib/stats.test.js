import assert from "node:assert/strict";
import { summarize, trend, codes, incidents, downsample, percentile } from "./stats.js";

const ok = (at, ms) => ({ at, ms, status: 200, ok: true, error: "" });
const fail = (at, status = 503) => ({ at, ms: 0, status, ok: false, error: "" });

assert.equal(percentile([], 50), 0);
assert.equal(percentile([1, 2, 3, 4], 50), 3);

const s = summarize([ok(1, 100), ok(2, 300), fail(3)]);
assert.equal(s.avg, 200);
assert.equal(Math.round(s.uptime), 67);
assert.equal(s.min, 100);

const flat = Array.from({ length: 10 }, (_, i) => ok(i, 100));
assert.equal(trend([...flat, ok(10, 200)]).state, "slow");
assert.equal(trend([...flat, ok(10, 200)]).delta, 100);
assert.equal(trend([...flat, ok(10, 50)]).state, "fast");
assert.equal(trend([...flat, ok(10, 110)]).state, "normal");
assert.equal(trend([...flat, fail(10)]).state, "down");
assert.equal(trend([]).state, "idle");

assert.deepEqual(codes([ok(1, 1), ok(2, 1), fail(3)]), [
  { status: 200, count: 2 },
  { status: 503, count: 1 },
]);

const inc = incidents([ok(1, 1), fail(2), fail(3), ok(4, 1), fail(5, 404)]);
assert.equal(inc.length, 2);
assert.deepEqual(inc[1], { start: 2, end: 4, count: 2, status: 503, error: "" });
assert.equal(inc[0].end, 0);
assert.equal(inc[0].status, 404);

const ds = downsample([ok(1, 100), ok(2, 200), fail(3), ok(4, 50)], 2);
assert.equal(ds.length, 2);
assert.equal(ds[0].ms, 150);
assert.equal(ds[1].ok, false);

console.log("stats ok");
