// lib/jobs/job.schema.ts
import { z } from "zod"

export const JobSchema = z.object({
  title: z.string(),
  employer: z.string(),
  location: z.string().default(""),
  salary: z.string().default("Not specified"),
  datePosted: z.string().default(""),
  closingDate: z.string().default(""),
  contractType: z.string().default(""),
  workingPattern: z.string().default(""),
  jobRef: z.string().default(""),
  url: z.string().url(),
})

export type Job = z.infer<typeof JobSchema>