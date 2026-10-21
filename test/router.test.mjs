import test from "node:test";
import assert from "node:assert/strict";
import { PAGES, href, isAdvancedPage, pagesFor, parseHash } from "../src/lib/router.js";

// Every page has an address, Basic lists three of them in the header, Advanced lists all, and old addresses still arrive.

test("Basic lists the three everyday pages and Advanced lists every one, in the same order", () => {
  assert.deepEqual(pagesFor("basic").map((p) => p.route), ["trade", "portfolio", "house"]);
  assert.deepEqual(pagesFor("advanced").map((p) => p.route), PAGES.filter((p) => !p.unlisted).map((p) => p.route));
  assert.deepEqual(pagesFor("advanced").map((p) => p.route), ["trade", "markets", "portfolio", "activity", "house", "fees", "funds", "netsplit"]);
});

test("the header keeps the minor pages under More: they are all Advanced pages", () => {
  assert.deepEqual(PAGES.filter((p) => p.minor).map((p) => p.route), ["fees", "funds", "netsplit"]);
  assert.ok(PAGES.filter((p) => p.minor).every((p) => p.advanced));
});

test("the comparison page is routed but not listed: its address works, no header lists it", () => {
  assert.equal(PAGES.find((p) => p.route === "compare")?.unlisted, true);
  assert.equal(parseHash("#/compare").route, "compare");
  assert.equal(isAdvancedPage("compare"), true);
  for (const mode of ["basic", "advanced"]) assert.ok(!pagesFor(mode).some((p) => p.route === "compare"), mode);
});

test("a page only Advanced lists is known as one, and the others are not", () => {
  for (const r of ["markets", "activity", "fees", "funds", "netsplit", "compare"]) assert.equal(isAdvancedPage(r), true, r);
  for (const r of ["home", "trade", "portfolio", "house"]) assert.equal(isAdvancedPage(r), false, r);
});

test("addresses are built and read back the same way", () => {
  assert.equal(href("trade"), "#/trade");
  assert.equal(href("house", "crypto/risk"), "#/house/crypto/risk");
  assert.equal(href("home"), "#/");
  assert.equal(href("home", "how"), "#/?s=how");
  assert.deepEqual(parseHash("#/house/crypto/risk"), { route: "house", sub: "crypto/risk", section: null });
  assert.deepEqual(parseHash("#/portfolio"), { route: "portfolio", sub: null, section: null });
  assert.deepEqual(parseHash("#/?s=trust"), { route: "home", sub: null, section: "trust" });
  assert.deepEqual(parseHash(""), { route: "home", sub: null, section: null });
});

test("the docs page is an address with sections, and is not one of the app's pages", () => {
  assert.equal(href("docs"), "#/docs");
  assert.equal(href("docs", "fees"), "#/docs?s=fees");
  assert.deepEqual(parseHash("#/docs"), { route: "docs", sub: null, section: null });
  assert.deepEqual(parseHash("#/docs?s=trust"), { route: "docs", sub: null, section: "trust" });
  assert.equal(PAGES.some((p) => p.route === "docs"), false);
  assert.equal(isAdvancedPage("docs"), false);
});

test("an address that is not a page opens the home page", () => {
  assert.equal(parseHash("#/nowhere").route, "home");
  assert.deepEqual(parseHash("#/compare"), { route: "compare", sub: null, section: null }); // demo shots 7 and 8
});

test("addresses that moved still arrive in the right place", () => {
  assert.deepEqual(parseHash("#/receipts"), { route: "portfolio", sub: "history", section: null });
  assert.deepEqual(parseHash("#/portfolio/receipts"), { route: "portfolio", sub: "history", section: null });
  assert.equal(parseHash("#/money-map").route, "funds");
  assert.equal(parseHash("#/portfolio/funds").route, "funds");
  assert.equal(parseHash("#/net-split").route, "netsplit");
  assert.equal(parseHash("#/house/joint/net-split").route, "netsplit");
  assert.equal(parseHash("#/house/fees").route, "fees");
  assert.equal(parseHash("#/house/joint/fees").route, "fees");
});
