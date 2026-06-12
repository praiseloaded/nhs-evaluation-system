// lib/jobs/parser.ts
import * as cheerio from "cheerio"
import { JobSchema } from "./job.schema"
import { cleanText } from "./cleanText"

export function parseJobs(html: string) {
  const $ = cheerio.load(html)

  const jobs = []

  $(".job-card, .vacancy, .search-result").each((_, el) => {
    const title = cleanText($(el).find(".job-title").text())
    const employer = cleanText($(el).find(".employer").text())
    const location = cleanText($(el).find(".location").text())
    const salary = cleanText($(el).find(".salary").text())
    const url = $(el).find("a").attr("href") ?? ""

    const jobRaw = {
      title,
      employer,
      location,
      salary,
      url,
    }

    const parsed = JobSchema.safeParse(jobRaw)

    if (parsed.success) {
      jobs.push(parsed.data)
    }
  })

  return jobs
}