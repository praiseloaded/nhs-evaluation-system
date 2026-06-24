// app/api/test-email/route.ts  ← DELETE after testing
import { sendEmail } from "@/lib/email"

export const runtime = 'nodejs'

export async function GET() {
  const result = await sendEmail({
    to:      "praiseloaded@gmail.com",
    subject: "SMTP test",
    html:    "<p>Test email from OmniJobReady AI</p>",
  })
  return Response.json(result)
}