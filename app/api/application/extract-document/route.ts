// app/api/application/extract-document/route.ts

import { auth } from "@/auth"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()

    if (file.size > 10 * 1024 * 1024) {
      return Response.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let extractedText: string = ""

    // ------------------------------------------------------------------
    // PDF
    // ------------------------------------------------------------------
    if (fileName.endsWith(".pdf")) {
      try {
        const { extractText } = await import("unpdf")

        const result: any = await extractText(new Uint8Array(buffer))

        console.log("UNPDF RESULT:", JSON.stringify(result, null, 2))

        if (typeof result === "string") {
          extractedText = result
        } else if (typeof result?.text === "string") {
          extractedText = result.text
        } else if (Array.isArray(result?.text)) {
          extractedText = result.text
            .map((item: any) => {
              if (typeof item === "string") return item
              if (typeof item?.text === "string") return item.text
              return ""
            })
            .join("\n")
        } else if (Array.isArray(result?.pages)) {
          extractedText = result.pages
            .map((page: any) => {
              if (typeof page === "string") return page
              if (typeof page?.text === "string") return page.text
              return ""
            })
            .join("\n")
        } else {
          extractedText = JSON.stringify(result)
        }
      } catch (err: any) {
        console.error("PDF parse error:", err)

        return Response.json(
          { error: "Failed to parse PDF." },
          { status: 422 }
        )
      }
    }

    // ------------------------------------------------------------------
    // DOCX / DOC
    // ------------------------------------------------------------------
    else if (
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc")
    ) {
      try {
        const mammoth = await import("mammoth")

        const result = await mammoth.extractRawText({
          buffer,
        })

        extractedText = result.value || ""
      } catch (err: any) {
        console.error("DOCX parse error:", err)

        return Response.json(
          {
            error:
              "Failed to parse document. Ensure it's a valid Word file.",
          },
          { status: 422 }
        )
      }
    }

    // ------------------------------------------------------------------
    // TXT / RTF
    // ------------------------------------------------------------------
    else if (
      fileName.endsWith(".txt") ||
      fileName.endsWith(".rtf")
    ) {
      extractedText = buffer.toString("utf-8")
    }

    // ------------------------------------------------------------------
    // Unsupported
    // ------------------------------------------------------------------
    else {
      return Response.json(
        {
          error:
            "Unsupported file type. Upload PDF, DOCX, DOC, TXT, or RTF.",
        },
        { status: 400 }
      )
    }

    // ------------------------------------------------------------------
    // Ensure string
    // ------------------------------------------------------------------
    if (typeof extractedText !== "string") {
      console.error("Unexpected extractedText:", extractedText)

      return Response.json(
        {
          error: "Could not extract text from document.",
        },
        { status: 422 }
      )
    }

    // ------------------------------------------------------------------
    // Clean text
    // ------------------------------------------------------------------
    extractedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/ {3,}/g, " ")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim()

    if (extractedText.length < 50) {
      return Response.json(
        {
          error:
            "Could not extract meaningful text. The document may be scanned/image-based.",
        },
        { status: 422 }
      )
    }

    // ------------------------------------------------------------------
    // Detect title
    // ------------------------------------------------------------------
    let detectedTitle = ""

    const lines = extractedText
      .split("\n")
      .filter((line) => line.trim().length > 0)

    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim()

      const titleMatch = trimmed.match(
        /^(?:job\s*title|post|role|position|vacancy)\s*[:–-]\s*(.+)/i
      )

      if (titleMatch) {
        detectedTitle = titleMatch[1].trim()
        break
      }

      if (
        trimmed.length > 5 &&
        trimmed.length < 80 &&
        trimmed === trimmed.toUpperCase()
      ) {
        detectedTitle =
          trimmed.charAt(0) +
          trimmed.slice(1).toLowerCase()

        break
      }
    }

    // ------------------------------------------------------------------
    // Detect band
    // ------------------------------------------------------------------
    let detectedBand = ""

    const bandMatch = extractedText.match(
      /band\s*(\d+[a-c]?)/i
    )

    if (bandMatch) {
      detectedBand = `Band ${bandMatch[1]}`
    }

    // ------------------------------------------------------------------
    // Detect employer
    // ------------------------------------------------------------------
    let detectedEmployer = ""

    const trustMatch = extractedText.match(
      /([A-Z][A-Za-z\s&]+NHS\s+(?:Trust|Foundation Trust))/i
    )

    if (trustMatch) {
      detectedEmployer = trustMatch[1].trim()
    }

    return Response.json({
      success: true,
      text: extractedText,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      fileName: file.name,
      fileType: fileName.split(".").pop(),
      detected: {
        jobTitle: detectedTitle,
        band: detectedBand,
        employer: detectedEmployer,
      },
    })
  } catch (error: any) {
    console.error("EXTRACT_DOCUMENT_ERROR:", error)

    return Response.json(
      {
        error: error?.message ?? "Extraction failed",
      },
      { status: 500 }
    )
  }
}