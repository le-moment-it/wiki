const fetch = require("node-fetch");
const { execSync } = require("child_process");
const path = require("path");

// ===== CONFIG =====
const WIKIJS_URL = "https://docs.vasseurlaurent.com"; // your wiki
const WIKIJS_API_TOKEN = process.env.WIKIJS_API_TOKEN; // set as GH Actions secret
const REPO_DOCS_PATH = "."; // root folder of your markdown docs in repo

// === GraphQL helper ===
async function gqlRequest(query, variables = {}) {
    const res = await fetch(`${WIKIJS_URL}/graphql`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${WIKIJS_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
        throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    return data.data;
}

// === Get all pages from Wiki.js ===
async function fetchAllPages() {
    const query = `
    query {
      pages {
        id
        slug
        path
      }
    }
  `;
    const data = await gqlRequest(query);
    return data.pages;
}

// === Delete page by ID ===
async function deletePage(pageId) {
    const mutation = `
    mutation ($id: Int!) {
      pages {
        delete(id: $id)
      }
    }
  `;
    await gqlRequest(mutation, { id: pageId });
    console.log(`Deleted page ID ${pageId}`);
}

// === Get local markdown filename slugs ===
function getLocalSlugs() {
    const output = execSync(`git ls-files "${REPO_DOCS_PATH}" | grep -E "\\.md$"`).toString();
    return output
        .split("\n")
        .filter(Boolean)
        .map(f => {
            const base = path.basename(f, ".md");
            return base.toLowerCase();
        });
}

(async () => {
    try {
        console.log("Fetching pages from Wiki.js...");
        const wikiPages = await fetchAllPages();
        console.log(`Total pages in Wiki.js: ${wikiPages.length}`);

        const localSlugs = getLocalSlugs();
        console.log(`Total Markdown files in repo: ${localSlugs.length}`);

        const orphanPages = wikiPages.filter(p => !localSlugs.includes(p.slug.toLowerCase()));
        console.log(`Orphan pages found: ${orphanPages.length}`);

        for (const orphan of orphanPages) {
            await deletePage(orphan.id);
        }

        console.log("Wiki cleanup complete.");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
