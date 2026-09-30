// app/api/extract-job/route.ts

import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { grokChatCompletion } from "@/lib/xai";
import WordExtractor from "word-extractor";
import { parseOffice } from "officeparser";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  name: string;
  base64: string;
  mimeType: string;
}

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

// Errors caused by the user's input (bad file type, unreadable file) -> HTTP 400
class UserInputError extends Error {}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCRAPE_CHAR_LIMIT = 12_000;
const FILE_TEXT_CHAR_LIMIT = 30_000;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_PROTOCOLS = ["https:", "http:"];
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_MAX_ATTEMPTS = 2;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SYSTEM_PROMPT = `
You are an NHS job extraction engine. Analyse the provided content and extract structured job listing data.

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      typeof obj[key] === "string" ? (obj[key] as string).trim() : "",
    ])
  ) as unknown as ExtractedJob;
}

function parseJsonFromLLM(raw: string): ExtractedJob {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return sanitiseJob(JSON.parse(cleaned));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * officeparser v5 returned a plain string; v6+ returns an AST with .toText().
 * This handles both so the code works whichever version is installed.
 */
async function extractOfficeText(buffer: Buffer): Promise<string> {
  const result: unknown = await parseOffice(buffer);
  if (typeof result === "string") return result;
  if (
    result &&
    typeof (result as { toText?: unknown }).toText === "function"
  ) {
    return (result as { toText: () => string }).toText();
  }
  return "";
}

// ─── File handling ────────────────────────────────────────────────────────────

/**
 * Turns an uploaded file into Gemini "parts".
 * - PDF and DOCX are sent as files (MIME type set from the extension, not the browser).
 * - DOC, ODT, TXT and MD are converted to text first, because Gemini
 *   doesn't accept them as inline files.
 */
async function buildFileParts(file: UploadedFile, label: string): Promise<any[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(file.base64, "base64");

  if (ext === "pdf") {
    return [
      { inlineData: { mimeType: "application/pdf", data: file.base64 } },
      { text: `The document above is the ${label}.` },
    ];
  }

  if (ext === "docx") {
    return [
      { inlineData: { mimeType: DOCX_MIME, data: file.base64 } },
      { text: `The document above is the ${label}.` },
    ];
  }

  let text = "";
  try {
    if (ext === "doc") {
      const doc = await new WordExtractor().extract(buffer);
      text = doc.getBody();
    } else if (ext === "odt") {
      text = await extractOfficeText(buffer);
    } else if (ext === "txt" || ext === "md") {
      text = buffer.toString("utf-8");
    } else {
      throw new UserInputError(
        `Unsupported file type: .${ext}. Use PDF, DOC, DOCX, ODT, TXT or MD.`
      );
    }
  } catch (err: any) {
    if (err instanceof UserInputError) throw err;
    throw new UserInputError(
      `Could not read "${file.name}". Try re-saving it as DOCX or PDF.`
    );
  }

  text = text.trim();
  if (!text) {
    throw new UserInputError(`Could not find any text in "${file.name}".`);
  }

  return [{ text: `${label}:\n\n${text.slice(0, FILE_TEXT_CHAR_LIMIT)}` }];
}

async function extractFromFiles(
  jobDescFile?: UploadedFile,
  personSpecFile?: UploadedFile
): Promise<ExtractedJob> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const parts: any[] = [
    { text: SYSTEM_PROMPT + "\n\nExtract from the uploaded document(s) below:" },
  ];

  if (jobDescFile) {
    parts.push(...(await buildFileParts(jobDescFile, "Job Description")));
  }
  if (personSpecFile) {
    parts.push(...(await buildFileParts(personSpecFile, "Person Specification")));
  }

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4000,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError = "";

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: requestBody,
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p?.text ?? "")
        .join("")
        .trim();

      if (!text) throw new Error("Gemini returned an empty response");
      return parseJsonFromLLM(text);
    }

    lastError = await res.text();

    // Retry once on temporary errors
    const retryable = [429, 500, 503].includes(res.status);
    if (retryable && attempt < GEMINI_MAX_ATTEMPTS) {
      await sleep(1500);
      continue;
    }
    break;
  }

  throw new Error(`Gemini file extraction failed: ${lastError}`);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // 1. Parse request body
  let body: {
    url?: string;
    jobDescFile?: UploadedFile;
    personSpecFile?: UploadedFile;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url, jobDescFile, personSpecFile } = body;

  // 2. Must have at least one source
  const hasUrl = !!url && typeof url === "string";
  const hasFiles = !!jobDescFile || !!personSpecFile;

  if (!hasUrl && !hasFiles) {
    return NextResponse.json(
      {
        error:
          "Please provide at least one source: a job URL, a Job Description file, or a Person Specification file.",
      },
      { status: 400 }
    );
  }

  // 3a. File-based path
  if (hasFiles) {
    let job: ExtractedJob;
    try {
      job = await extractFromFiles(jobDescFile, personSpecFile);
    } catch (err: any) {
      console.error("[extract-job] file extraction error:", err);
      if (err instanceof UserInputError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      return NextResponse.json(
        { error: `File extraction failed: ${err.message}` },
        { status: 502 }
      );
    }

    // If a URL was also given, scrape it and merge (file fields win, URL fills gaps)
    if (hasUrl) {
      try {
        if (!isValidUrl(url!)) throw new Error("Invalid URL");
        const pageText = await fetchPageText(url!);
        const rawContent = await grokChatCompletion([
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: pageText },
        ]);
        const urlJob = parseJsonFromLLM(rawContent);

        const merged = {} as ExtractedJob;
        for (const key of Object.keys(EMPTY_JOB) as (keyof ExtractedJob)[]) {
          merged[key] = job[key] || urlJob[key] || "";
        }
        return NextResponse.json(merged);
      } catch {
        // URL scrape failed: return what we got from the files
        return NextResponse.json(job);
      }
    }

    return NextResponse.json(job);
  }

  // 3b. URL-only path
  if (!isValidUrl(url!)) {
    return NextResponse.json(
      { error: "URL is not a valid http/https address" },
      { status: 400 }
    );
  }

  let pageText: string;
  try {
    pageText = await fetchPageText(url!);
  } catch (err: any) {
    const timedOut = err?.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "Page fetch timed out" : err.message },
      { status: timedOut ? 504 : 502 }
    );
  }

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