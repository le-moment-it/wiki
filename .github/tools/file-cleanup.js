const fetch = require("node-fetch");
const { execSync } = require("child_process");
const path = require("path");

// ===== CONFIG =====
const WIKIJS_URL = "https://docs.vasseurlaurent.com"; // your wiki URL
const WIKIJS_API_TOKEN = process.env.WIKIJS_API_TOKEN; // secret in GitHub Actions
const REPO_DOCS_PATH = "."; // root directory with markdown docs in repo

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

// === Get ALL pages from Wiki.js (paginated) ===
async function fetchAllPages() {
    let allPages = [];
    let page = 1;
    let totalPages = 1;
    const limit = 50;

    const query = `
    query getPages($limit: Int, $page: Int) {
      pages(options: {limit: $limit, page: $page}) {
        items {
          id
          slug
          path
        }
        meta {
          pageCount
          totalCount
        }
      }
    }
  `;

    while (page <= totalPages) {
        const data = await gqlRequest(query, { limit, page });
        allPages = allPages.concat(data.pages.items);
        totalPages = data.pages.meta.pageCount;
        console.log(`Fetched page ${page} of ${totalPages} from Wiki.js`);
        page++;
    }
    return allPages;
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

// === Get all local Markdown file paths (no extension, relative paths) ===
function getLocalSlugs() {
    const output = execSync(`git ls-files "${REPO_DOCS_PATH}" | grep -E "\\.md$"`).toString();
    return output
        .split("\n")
        .filter(Boolean)
        .map(f => {
            let rel = path.relative(REPO_DOCS_PATH, f);
            rel = rel.replace(/\.md$/, "");
            return rel.toLowerCase(); // match Wiki.js slug/path style
        });
}

// === Main execution ===
(async () => {
    try {
        console.log("Fetching pages from Wiki.js...");
        const wikiPages = await fetchAllPages();
        console.log(`Total pages in Wiki.js: ${wikiPages.length}`);

        const localSlugs = getLocalSlugs();
        console.log(`Total Markdown files in repo: ${localSlugs.length}`);

        // Compare using full path (virtual path in Wiki.js)
        const orphanPages = wikiPages.filter(p => {
            const wikiPath = p.path.toLowerCase();
            return !localSlugs.includes(wikiPath);
        });

        console.log(`Orphan pages to delete: ${orphanPages.length}`);
        for (const orphan of orphanPages) {
            await deletePage(orphan.id);
        }

        console.log("Wiki cleanup complete ✅");
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
})();
