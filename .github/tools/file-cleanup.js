const fetch = require("node-fetch");
const { execSync } = require("child_process");
const path = require("path");

const WIKIJS_URL = "https://docs.vasseurlaurent.com";
const WIKIJS_API_TOKEN = process.env.WIKIJS_API_TOKEN;
const REPO_DOCS_PATH = "./data/repo";

async function gqlRequest(query, variables = {}) {
    const res = await fetch(`${WIKIJS_URL}/graphql`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${WIKIJS_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (data.errors) throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    return data.data;
}

async function fetchAllPages() {
    let format = null;
    let pages = [];
    let pageNum = 1;
    let pageCount = 1;
    const limit = 50;

    const queries = {
        newFormat: `
      query getPages($limit: Int, $page: Int) {
        pages(options: {limit: $limit, page: $page}) {
          items { id slug path }
          meta { pageCount }
        }
      }`,
        oldFormat: `
      query getPages($limit: Int, $page: Int) {
        pages(limit: $limit, page: $page) {
          items { id slug path }
          meta { pageCount }
        }
      }`,
    };

    // Auto‑detect format
    for (const [name, q] of Object.entries(queries)) {
        try {
            await gqlRequest(q, { limit, page: 1 });
            format = name;
            break;
        } catch (err) {
            // try the next format
        }
    }
    if (!format) throw new Error("Could not find working pages query format for this Wiki.js API");

    console.log(`Using ${format} GraphQL query format`);
    while (pageNum <= pageCount) {
        const data = await gqlRequest(queries[format], { limit, page: pageNum });
        const res = data.pages;
        pages = pages.concat(res.items);
        pageCount = res.meta.pageCount;
        console.log(`Fetched page ${pageNum}/${pageCount}`);
        pageNum++;
    }
    return pages;
}

async function deletePage(pageId) {
    const mutation = `
    mutation ($id: Int!) {
      pages { delete(id: $id) }
    }
  `;
    await gqlRequest(mutation, { id: pageId });
    console.log(`Deleted page ID: ${pageId}`);
}

function getLocalPaths() {
    const output = execSync(`git ls-files "${REPO_DOCS_PATH}" | grep -E "\\.md$"`).toString();
    return output
        .split("\n")
        .filter(Boolean)
        .map(f => path.relative(REPO_DOCS_PATH, f).replace(/\.md$/, "").toLowerCase());
}

(async () => {
    try {
        const wikiPages = await fetchAllPages();
        const localPaths = getLocalPaths();

        const orphans = wikiPages.filter(p => !localPaths.includes(p.path.toLowerCase()));
        console.log(`Found ${orphans.length} orphan pages`);

        for (const orphan of orphans) {
            await deletePage(orphan.id);
        }
        console.log("Cleanup complete ✅");
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
})();
