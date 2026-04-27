/**
 * Huggy Web Research Agent
 * 
 * Capabilities:
 * 1. URL Scraping — Fetch a webpage, extract clean text/structure for design inspiration.
 * 2. Web Search — Lightweight search via DuckDuckGo Instant Answer API (free, no key).
 * 
 * This agent runs BEFORE the PM agent to enrich the user prompt with real-world context.
 * Cost: ~0 (no LLM call, just HTTP fetches).
 */

const URL_REGEX = /https?:\/\/[^\s"'<>]+/gi;
const MAX_CONTENT_LENGTH = 8000; // chars to keep from scraped page

/**
 * Detect if the user prompt contains URLs to scrape.
 * @param {string} prompt
 * @returns {string[]}
 */
export function extractUrls(prompt) {
  const matches = prompt.match(URL_REGEX);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches)];
}

/**
 * Detect if the user prompt implies web research is needed.
 * @param {string} prompt
 * @returns {boolean}
 */
export function needsWebResearch(prompt) {
  const lower = prompt.toLowerCase();
  const triggers = [
    'inspire-toi de', 'inspiré de', 'comme le site', 'like the website',
    'clone de', 'clone of', 'copie de', 'copy of', 'similar to',
    'ressemble à', 'looks like', 'design de', 'design of',
    'scrape', 'analyse le site', 'analyze the site', 'fetch',
    'http://', 'https://', '.com', '.fr', '.io', '.dev', '.app',
  ];
  return triggers.some(t => lower.includes(t)) || extractUrls(prompt).length > 0;
}

/**
 * Scrape a single URL and extract clean text content.
 * Uses native fetch (Node 18+). No external dependencies.
 * @param {string} url
 * @returns {Promise<{url: string, title: string, description: string, headings: string[], bodyText: string, success: boolean}>}
 */
export async function scrapeUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HuggyBot/1.0; +https://huggy.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!resp.ok) return { url, title: '', description: '', headings: [], bodyText: '', success: false };

    const html = await resp.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract headings (h1-h3)
    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    const headings = [];
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 20) {
      const clean = hMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
      if (clean) headings.push(clean);
    }

    // Extract visible text (strip tags, scripts, styles)
    let bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate to avoid token explosion
    if (bodyText.length > MAX_CONTENT_LENGTH) {
      bodyText = bodyText.slice(0, MAX_CONTENT_LENGTH) + '...';
    }

    // Extract navigation links for structure insight
    const navLinks = [];
    const linkRegex = /<a[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let lMatch;
    while ((lMatch = linkRegex.exec(html)) !== null && navLinks.length < 15) {
      const text = lMatch[2].replace(/<[^>]+>/g, '').trim();
      if (text && text.length < 50) navLinks.push({ href: lMatch[1], text });
    }

    return { url, title, description, headings, bodyText, navLinks, success: true };
  } catch (e) {
    console.warn(`[WebResearch] Failed to scrape ${url}:`, e.message);
    return { url, title: '', description: '', headings: [], bodyText: '', success: false };
  }
}

/**
 * Perform a lightweight web search using DuckDuckGo Instant Answer API.
 * @param {string} query
 * @returns {Promise<{abstract: string, results: Array<{title: string, url: string, snippet: string}>}>}
 */
export async function webSearch(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const encoded = encodeURIComponent(query);
    const resp = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HuggyBot/1.0' },
    });
    clearTimeout(timeout);

    const data = await resp.json();

    const abstract = data.Abstract || data.AbstractText || '';
    const results = (data.RelatedTopics || [])
      .filter(t => t.Text && t.FirstURL)
      .slice(0, 5)
      .map(t => ({ title: t.Text.slice(0, 100), url: t.FirstURL, snippet: t.Text }));

    return { abstract, results };
  } catch (e) {
    console.warn('[WebResearch] Search failed:', e.message);
    return { abstract: '', results: [] };
  }
}

/**
 * Run the full Web Research Agent pipeline.
 * Detects URLs in the prompt, scrapes them, and optionally searches the web.
 * Returns enriched context to inject into the PM agent prompt.
 * 
 * @param {string} userPrompt
 * @returns {Promise<{enrichedContext: string, scrapedSites: Array, searchResults: object|null, didResearch: boolean}>}
 */
export async function runWebResearchAgent(userPrompt) {
  if (!needsWebResearch(userPrompt)) {
    return { enrichedContext: '', scrapedSites: [], searchResults: null, didResearch: false };
  }

  const urls = extractUrls(userPrompt);
  const scrapedSites = [];
  let enrichedParts = [];

  // 1. Scrape all detected URLs in parallel
  if (urls.length > 0) {
    const scrapeResults = await Promise.all(urls.slice(0, 3).map(scrapeUrl));
    for (const site of scrapeResults) {
      if (!site.success) continue;
      scrapedSites.push(site);
      enrichedParts.push([
        `## Scraped Site: ${site.url}`,
        `Title: ${site.title}`,
        `Description: ${site.description}`,
        site.headings.length ? `Main Headings: ${site.headings.join(' | ')}` : '',
        site.navLinks?.length ? `Navigation: ${site.navLinks.map(l => l.text).join(', ')}` : '',
        `Content Preview: ${site.bodyText.slice(0, 3000)}`,
      ].filter(Boolean).join('\n'));
    }
  }

  // 2. Web search for general queries without URLs
  let searchResults = null;
  if (urls.length === 0) {
    // Extract the key topic for search
    const searchQuery = userPrompt
      .replace(/crée|créer|fais|faire|construis|build|make|create/gi, '')
      .replace(/un site|une app|an app|a website/gi, '')
      .trim()
      .slice(0, 80);
    
    if (searchQuery.length > 5) {
      searchResults = await webSearch(searchQuery + ' website design');
      if (searchResults.abstract) {
        enrichedParts.push([
          `## Web Research Context`,
          `Summary: ${searchResults.abstract}`,
          searchResults.results.length 
            ? `Related: ${searchResults.results.map(r => r.title).join(' | ')}`
            : '',
        ].filter(Boolean).join('\n'));
      }
    }
  }

  const enrichedContext = enrichedParts.length
    ? `\n\n# WEB RESEARCH RESULTS (Use this as design inspiration)\n${enrichedParts.join('\n\n')}\n`
    : '';

  return { enrichedContext, scrapedSites, searchResults, didResearch: enrichedParts.length > 0 };
}
