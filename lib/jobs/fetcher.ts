// lib/jobs/fetcher.ts
export async function fetchNhsJobs(keyword: string, location: string) {
  const url = `https://example-nhs-jobs-site.com/search?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  })

  if (!res.ok) throw new Error("Failed to fetch NHS jobs")

  return res.text()
}