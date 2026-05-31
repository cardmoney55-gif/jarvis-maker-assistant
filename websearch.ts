/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JARVIS's own free web-search pipeline (no paid Google grounding, no API key).
 *
 *  - webSearch():     queries DuckDuckGo's HTML endpoint and parses results.
 *  - fetchReadable(): pulls a page's main text (via the free r.jina.ai reader,
 *                     falling back to raw fetch + tag stripping).
 *
 * Everything is best-effort: on any network/parse failure it returns empty so
 * the assistant degrades gracefully to its own knowledge.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

/** Resolve DuckDuckGo's redirect links (//duckduckgo.com/l/?uddg=...) to the real URL. */
function resolveDdgUrl(href: string): string {
  try {
    const m = href.match(/[?&]uddg=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {
    /* ignore */
  }
  if (href.startsWith("//")) return "https:" + href;
  return href;
}

/** Free web search via DuckDuckGo's no-JS HTML endpoint. */
export async function webSearch(query: string, max = 5): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "q=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const results: SearchResult[] = [];
    // Each organic result: <a ... class="result__a" href="...">Title</a>
    const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const snippets: string[] = [];
    let sm: RegExpExecArray | null;
    while ((sm = snippetRe.exec(html)) !== null) snippets.push(stripTags(sm[1]));

    let lm: RegExpExecArray | null;
    let i = 0;
    while ((lm = linkRe.exec(html)) !== null && results.length < max) {
      const url = resolveDdgUrl(lm[1]);
      const title = stripTags(lm[2]);
      if (!url.startsWith("http")) {
        i++;
        continue;
      }
      results.push({ title, url, snippet: snippets[i] || "" });
      i++;
    }
    return results;
  } catch (e) {
    console.warn("webSearch failed:", (e as Error)?.message);
    return [];
  }
}

/** Fetch a page's readable text. Tries the free jina reader, then raw HTML. */
export async function fetchReadable(url: string, maxChars = 3500): Promise<string> {
  // 1) jina.ai reader returns clean markdown text of the page.
  try {
    const r = await fetch("https://r.jina.ai/" + url, {
      headers: { "User-Agent": UA, "X-Return-Format": "text" },
      signal: AbortSignal.timeout(9000),
    });
    if (r.ok) {
      const txt = await r.text();
      if (txt && txt.length > 200) return txt.slice(0, maxChars);
    }
  } catch {
    /* fall through */
  }
  // 2) Fallback: fetch raw HTML and strip tags.
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    return stripTags(html).slice(0, maxChars);
  } catch (e) {
    return "";
  }
}

/**
 * Gather web context for a query: search, then optionally read the top pages.
 * Returns a text block to feed the model and the list of sources for citation.
 */
export async function gatherWebContext(
  query: string,
  opts: { readPages?: number; maxResults?: number } = {}
): Promise<{ context: string; sources: Array<{ title: string; url: string }> }> {
  const maxResults = opts.maxResults ?? 5;
  const readPages = opts.readPages ?? 0;

  const results = await webSearch(query, maxResults);
  if (results.length === 0) return { context: "", sources: [] };

  let context = results
    .map((r, i) => `(${i + 1}) ${r.title}\n${r.snippet}\nДжерело: ${r.url}`)
    .join("\n\n");

  // Optionally read the full text of the top pages for deeper research.
  if (readPages > 0) {
    const toRead = results.slice(0, readPages);
    const pages = await Promise.all(toRead.map((r) => fetchReadable(r.url)));
    const pageText = pages
      .map((t, i) => (t ? `\n\n[Повний текст джерела ${i + 1} — ${toRead[i].url}]:\n${t}` : ""))
      .join("");
    context += pageText;
  }

  return {
    context,
    sources: results.map((r) => ({ title: r.title || r.url, url: r.url })),
  };
}
