import assert from "node:assert/strict";
import { analyse } from "../src/analyse.ts";
import { MeterNotApplicableError } from "../src/meters.ts";

const FALLERSLEBEN = `Ich muß hinaus, ich muß zu dir,
Ich muß es selbst dir sagen:
Du bist mein Frühling, du nur mir
In diesen lichten Tagen.`;

const HEIDENROESLEIN = `Sah ein Knab ein Röslein stehn,
Röslein auf der Heiden,
War so jung und morgenschön,
Lief er schnell, es nah zu sehn,
Sah's mit vielen Freuden.
Röslein, Röslein, Röslein rot,
Röslein auf der Heiden.`;

const HEIDELBERG = `Lange lieb ich dich schon, möchte dich, mir zur Lust,
Mutter nennen und dir schenken ein kunstlos Lied,
Du, der Vaterlandsstädte
Ländlichschönste, so viel ich sah.`;

const DISTICHON = `Im Hexameter steigt des Springquells flüssige Säule,
Im Pentameter drauf fällt sie melodisch herab.`;

Deno.test("auto meter: iambic", () => assert.equal(analyse(FALLERSLEBEN).family, "iambic"));
Deno.test("auto meter: trochaic", () => assert.equal(analyse(HEIDENROESLEIN).family, "trochaic"));
Deno.test("auto meter: asclepiadean ode", () => assert.equal(analyse(HEIDELBERG).family, "asclepiadean_a"));
Deno.test("auto meter: distich", () => assert.equal(analyse(DISTICHON).family, "distich"));

Deno.test("a forced ode that does not fit is rejected", () => {
  assert.throws(() => analyse(FALLERSLEBEN, { meter: "alcaic" }), MeterNotApplicableError);
});
