import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { grokChatCompletion } from "@/lib/xai";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedJob {
  jobTitle: string;
  band: string;
  location: string;
  jobDescription: string;
  personSpec: string;
  essentialCriteria: string;
  desirableCriteria: string;
}

const EMPTY_JOB: ExtractedJob = {
  jobTitle: "",
  band: "",
  location: "",
  jobDescription: "",
  personSpec: "",
  essentialCriteria: "",
  desirableCriteria: "",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SCRAPE_CHAR_LIMIT = 12_000;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_PROTOCOLS = ["https:", "http:"];

const SYSTEM_PROMPT = `
You are an NHS job extraction engine. Analyse the provided webpage text and extract structured job listing data.

Return ONLY a valid JSON object with these exact keys — no markdown, no explanation, no preamble:
{
  "jobTitle": "string",
  "band": "string (e.g. Band 5, Band 7)",
  "location": "string",
  "jobDescription": "string (concise summary)",
  "personSpec": "string (overview of the person specification)",
  "essentialCriteria": "string (comma-separated or paragraph)",
  "desirableCriteria": "string (comma-separated or paragraph)"
}

If a field cannot be found, return an empty string for that field.
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    return ALLOWED_PROTOCOLS.includes(protocol) && hostname.length > 0;
  } catch {
    return false;
  }
}

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NHSJobAgent/1.0; +https://your-domain.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Unexpected content type: ${contentType}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, iframe, noscript, [aria-hidden='true']").remove();

  const text = $("main, article, .job-description, body")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SCRAPE_CHAR_LIMIT);

  if (!text) throw new Error("No readable text found on page");

  return text;
}

function sanitiseJob(raw: unknown): ExtractedJob {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_JOB };

  const obj = raw as Record<string, unknown>;

  return Object.fromEntries(
    Object.keys(EMPTY_JOB).map((key) => [
      key,
      typeof obj[key] === "string" ? obj[key].trim() : "",
    ])
  ) as ExtractedJob;
}

function parseJsonFromLLM(raw: string): ExtractedJob {
  // Strip markdown code fences if the model wraps its output
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return sanitiseJob(parsed);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // 1. Parse & validate request body
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url field is required" }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json({ error: "url is not a valid http/https URL" }, { status: 400 });
  }

  // 2. Scrape
  let pageText: string;
  try {
    pageText = await fetchPageText(url);
  } catch (err: any) {
    const timedOut = err?.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "Page fetch timed out" : err.message },
      { status: timedOut ? 504 : 502 }
    );
  }

  // 3. Extract with LLM
  let rawContent: string;
  try {
    rawContent = await grokChatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: pageText },
    ]);
  } catch (err: any) {
    return NextResponse.json(
      { error: `LLM request failed: ${err.message}` },
      { status: 502 }
    );
  }

  // 4. Parse LLM response
  let job: ExtractedJob;
  try {
    job = parseJsonFromLLM(rawContent);
  } catch {
    return NextResponse.json(
      { error: "LLM returned unparseable JSON", raw: rawContent },
      { status: 502 }
    );
  }

  return NextResponse.json(job);
}