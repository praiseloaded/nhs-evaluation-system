import { z } from "zod";

export const AnalysisSchema = z.object({
  totalScore: z.number(),
  verdictTitle: z.string(),
  verdictSub: z.string(),

  dimensions: z.array(
    z.object({
      id: z.enum(["coverage", "star", "values", "language", "specificity"]),
      score: z.number(),
      justification: z.string()
    })
  ),

  improvements: z.array(z.string())
});