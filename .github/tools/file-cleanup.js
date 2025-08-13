const fetch = require('node-fetch');
const { execSync } = require('child_process');
const path = require('path');

// Configuration
const WIKIJS_URL = 'https://docs.vasseurlaurent.com'; // Change to your Wiki.js URL
const WIKIJS_API_TOKEN = process.env.WIKIJS_API_TOKEN; // Set this secret in GitHub Actions
const REPO_DOCS_PATH = './docs'; // Local folder where your markdown files live; adjust as needed

// Helper to fetch all pages from Wiki.js (with paging)
async function fetchAllPages() {
    let pages = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        const response = await fetch(`${WIKIJS_URL}/api/pages?limit=50&page=${page}`, {
            headers: { Authorization: `Bearer ${WIKIJS_API_TOKEN}` },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch pages: ${response.statusText}`);
        }
        const data = await response.json();
        pages = pages.concat(data.items);
        totalPages = data.meta.pageCount;
        page++;
    }
    return pages;
}

// Helper to delete a page by ID
async function deletePage(pageId) {
    const response = await fetch(`${WIKIJS_URL}/api/pages/${pageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${WIKIJS_API_TOKEN}` },
    });
    if (!response.ok) {
        throw new Error(`Failed to delete page ${pageId}: ${response.statusText}`);
    }
    console.log(`Deleted page ID: ${pageId}`);
}

// Helper to get local markdown file paths (relative to root docs folder)
function getLocalMarkdownFiles() {
    // Use git ls-files or find command to get markdown files in docs folder
    let output;
    try {
        output = execSync(`git ls-files ${REPO_DOCS_PATH}/*.md`).toString();
    } catch (error) {
        throw new Error(`Failed to list Markdown files: ${error.message}`);
    }
    const files = output.split('\n').filter(Boolean).map(f => path.basename(f, '.md').toLowerCase());
    return files;
}

async function main() {
    try {
        console.log('Fetching Wiki.js pages...');
        const pages = await fetchAllPages();

        console.log(`Found ${pages.length} pages in Wiki.js`);

        const localFiles = getLocalMarkdownFiles();
        console.log(`Found ${localFiles.length} markdown files in repo at ${REPO_DOCS_PATH}`);

        // Identify pages in Wiki.js without corresponding Markdown files
        const orphanPages = pages.filter(page => {
            if (!page.slug) return false;
            const pageSlug = page.slug.toLowerCase();
            return !localFiles.includes(pageSlug);
        });

        console.log(`Found ${orphanPages.length} orphan pages to delete`);

        // Delete orphan pages
        for (const orphan of orphanPages) {
            await deletePage(orphan.id);
        }

        console.log('Cleanup complete.');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
