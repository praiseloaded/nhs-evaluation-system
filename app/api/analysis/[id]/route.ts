import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: params.id },
    })

    if (!analysis) {
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      analysis,
    })
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to fetch analysis",
      },
      { status: 500 }
    )
  }
}