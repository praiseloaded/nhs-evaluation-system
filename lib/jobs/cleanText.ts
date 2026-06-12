// lib/jobs/cleanText.ts
export function cleanText(input: string = "") {
  return input
    .replace(/class="[^"]*"/g, "")
    .replace(/style="[^"]*"/g, "")
    .replace(/<\/?[^>]+>/g, "")   // remove tags
    .replace(/"\s*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}