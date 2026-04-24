#!/usr/bin/env node
/**
 * Fetches English Wikipedia mushroom article titles and lead image URLs.
 *
 * Uses the Wikimedia Action API only. Set a real contact in USER_AGENT /
 * WIKI_USER_AGENT per
 * https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
 *
 * Licensing: Wikipedia text is CC BY-SA 4.0; each image has its own license
 * on Commons — check the file page before commercial use.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const USER_AGENT =
  process.env.WIKI_USER_AGENT ||
  "DagrunMushroomFetcher/1.0 (https://github.com/Eirikur1/LandaGisk; mushroom-list tooling)";

const API = "https://en.wikipedia.org/w/api.php";
const CATEGORY_TITLES = [
  "Category:Edible fungi",
  "Category:Poisonous fungi",
  "Category:Psychoactive fungi",
  "Category:Medicinal fungi",
];

const EXCLUDED_TITLE_PATTERNS = [
  /^List of /i,
  /^Mushroom$/i,
  /^Mushroom (hunting|poisoning)$/i,
  /^Edible mushroom$/i,
  /^Fungiculture$/i,
  /^Mycophagy$/i,
];

async function api(params) {
  const url = new URL(API);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function allCategoryMembers(cmtitle) {
  const members = [];
  let cmcontinue = undefined;
  do {
    /** @type {Record<string, string>} */
    const q = {
      action: "query",
      list: "categorymembers",
      cmtitle,
      cmlimit: "500",
    };
    if (cmcontinue) q.cmcontinue = cmcontinue;

    const data = await api(q);
    const batch = data.query?.categorymembers ?? [];
    for (const m of batch) {
      if (m.ns === 0 && !EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(m.title))) {
        members.push(m);
      }
    }
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return members;
}

/** @param {string[]} titles */
async function queryPages(titles) {
  const joined = titles.join("|");
  const data = await api({
    action: "query",
    titles: joined,
    redirects: "1",
    prop: "pageimages|info",
    piprop: "thumbnail|original",
    pithumbsize: "800",
    inprop: "url",
  });

  const pages = data.query?.pages ?? {};
  return Object.values(pages)
    .filter((p) => p && !p.missing && p.title)
    .map((p) => ({
      pageid: p.pageid,
      title: p.title,
      pageUrl: p.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      thumbnailUrl: p.thumbnail?.source ?? null,
      originalUrl: p.original?.source ?? null,
      thumbWidth: p.thumbnail?.width ?? null,
      thumbHeight: p.thumbnail?.height ?? null,
    }));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const membersByTitle = new Map();

  for (const categoryTitle of CATEGORY_TITLES) {
    const members = await allCategoryMembers(categoryTitle);
    for (const member of members) {
      membersByTitle.set(member.title, member);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const titles = Array.from(membersByTitle.keys());
  titles.sort((a, b) => a.localeCompare(b, "en"));

  const results = [];
  for (const batch of chunk(titles, 50)) {
    const rows = await queryPages(batch);
    results.push(...rows);
    await new Promise((r) => setTimeout(r, 150));
  }

  results.sort((a, b) => a.title.localeCompare(b.title, "en"));

  const outPath = process.argv[2] ?? join(__dirname, "..", "data", "english-wiki-mushrooms.json");

  const summary = {
    sourceCategories: CATEGORY_TITLES.map((title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`),
    fetchedAt: new Date().toISOString(),
    count: results.length,
    withThumbnail: results.filter((r) => r.thumbnailUrl).length,
    withOriginal: results.filter((r) => r.originalUrl).length,
  };

  const payload = { summary, species: results };

  await mkdir(join(__dirname, "..", "data"), { recursive: true });
  await writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.error(`Wrote ${results.length} rows → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
