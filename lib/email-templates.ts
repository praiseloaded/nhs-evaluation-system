// lib/email-templates.ts
// HTML email templates for all NHS JobReady AI notifications.
// Inline styles only — email clients strip external CSS.

const BRAND_BLUE  = '#1e3a5f'
const BRAND_LIGHT = '#dbeafe'
const BODY_BG     = '#f8fafc'
const WHITE       = '#ffffff'
const TEXT_DARK   = '#1e293b'
const TEXT_MID    = '#64748b'
const TEXT_LIGHT  = '#94a3b8'
const BORDER      = '#e2e8f0'
const SUCCESS     = '#10b981'
const AMBER       = '#f59e0b'
const DANGER      = '#ef4444'

function base(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:${BODY_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BODY_BG};padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background-color:${BRAND_BLUE};padding:24px 32px 20px;border-radius:12px 12px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <p style="margin:0 0 2px;font-size:20px;font-weight:700;color:${WHITE};letter-spacing:-0.3px;">
          OmniJobReady AI&#8482;
        </p>
        <p style="margin:0;font-size:11px;color:${BRAND_LIGHT};font-weight:400;letter-spacing:0.3px;">
          Your AI Healthcare Career Platform
        </p>
      </td>
      <td align="right" valign="bottom">
        <p style="margin:0;font-size:10px;color:${BRAND_LIGHT};opacity:0.75;font-style:italic;">
          Powered by Omni Buddy&#8482;
        </p>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Tagline strip -->
  <tr><td style="background-color:#162d4a;padding:8px 32px;">
    <p style="margin:0;font-size:10px;color:${BRAND_LIGHT};opacity:0.6;letter-spacing:0.8px;text-transform:uppercase;">
      Powered by Omni Buddy&#8482; &nbsp;·&nbsp; AI Healthcare Career Platform
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:${WHITE};padding:32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
    ${body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:${BODY_BG};padding:20px 32px;border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding-bottom:10px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:${BRAND_BLUE};">OmniJobReady AI&#8482;</p>
        <p style="margin:2px 0 0;font-size:11px;color:${TEXT_LIGHT};">Your AI Healthcare Career Platform &nbsp;·&nbsp; Powered by Omni Buddy&#8482;</p>
      </td>
    </tr>
    <tr><td style="border-top:1px solid ${BORDER};padding-top:10px;">
      <p style="margin:0;font-size:12px;color:${TEXT_LIGHT};text-align:center;line-height:1.6;">
        You are receiving this because you have an OmniJobReady AI account.<br>
        Questions? <a href="mailto:support@omnijobready.co.uk" style="color:${BRAND_BLUE};">support@omnijobready.co.uk</a>
      </p>
    </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function button(text: string, url: string, color = BRAND_BLUE): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background-color:${color};border-radius:8px;padding:0;">
    <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:${WHITE};text-decoration:none;">${text}</a>
  </td></tr>
</table>`
}

function scoreBar(score: number): string {
  const color = score >= 75 ? SUCCESS : score >= 55 ? AMBER : DANGER
  const label = score >= 80 ? 'Strong' : score >= 65 ? 'Competitive' : score >= 45 ? 'Developing' : 'Needs work'
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr>
    <td style="font-size:13px;color:${TEXT_MID};">Overall Score</td>
    <td align="right" style="font-size:20px;font-weight:700;color:${color};">${score}% <span style="font-size:12px;font-weight:500;color:${TEXT_MID};">${label}</span></td>
  </tr>
  <tr><td colspan="2" style="padding-top:8px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background-color:${color};height:8px;width:${score}%;border-radius:4px;"></td>
      <td style="background-color:${BORDER};height:8px;border-radius:4px;"></td>
    </tr>
    </table>
  </td></tr>
</table>`
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. WELCOME EMAIL — sent on account creation
// ─────────────────────────────────────────────────────────────────────────────

export function welcomeEmail(name: string, dashboardUrl: string): string {
  return base('Welcome to OmniJobReady AI™', `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:${TEXT_DARK};">Welcome${name ? ', ' + name : ''}! 👋</h1>
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${BRAND_BLUE};">OmniJobReady AI&#8482; — Your AI Healthcare Career Platform</p>
    <p style="margin:0 0 20px;font-size:11px;color:${TEXT_MID};">Powered by Omni Buddy&#8482;</p>
    <p style="margin:0 0 20px;font-size:15px;color:${TEXT_MID};line-height:1.7;">
      Your OmniJobReady AI account is ready. You can now analyse job descriptions, extract competencies, and build evidence-based supporting statements for NHS and healthcare roles.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BODY_BG};border-radius:10px;padding:20px;margin:0 0 24px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${TEXT_DARK};text-transform:uppercase;letter-spacing:.05em;">What you can do now</p>
      ${['Upload a job description and extract all criteria automatically',
         'Auto-cluster criteria into NHS competency areas',
         'Answer 12–15 competency questions (not 45 individual criteria)',
         'Generate a human-sounding statement — Q1, Q2, and Q3',
         'Get your Shortlist Score and Missing Evidence Report',
        ].map(item => `<p style="margin:0 0 8px;font-size:14px;color:${TEXT_MID};">✓ &nbsp;${item}</p>`).join('')}
    </td></tr>
    </table>

    ${button('Go to your dashboard →', dashboardUrl)}

    <p style="margin:0;font-size:13px;color:${TEXT_LIGHT};">
      Need help getting started? Reply to this email — we read every message.
    </p>
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ANALYSIS COMPLETE — sent when AI analysis finishes
// ─────────────────────────────────────────────────────────────────────────────

export function analysisCompleteEmail(params: {
  name:         string
  jobTitle:     string
  employer:     string | null
  overallScore: number
  grade:        string
  essentialCoverage: number
  shortlistUrl: string
}): string {
  const { name, jobTitle, employer, overallScore, grade, essentialCoverage, shortlistUrl } = params
  const gradeLabel = grade === 'excellent' ? '🏆 Excellent' : grade === 'strong' ? '⭐ Strong' : grade === 'developing' ? '📈 Developing' : '⚠ Needs work'

  return base('Your NHS analysis is ready', `
    <p style="margin:0 0 4px;font-size:14px;color:${TEXT_MID};">Hi ${name || 'there'},</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:${TEXT_DARK};">Your analysis is ready</h1>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:10px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:16px 20px;background:${BODY_BG};border-bottom:1px solid ${BORDER};">
      <p style="margin:0;font-size:16px;font-weight:600;color:${TEXT_DARK};">${jobTitle}</p>
      ${employer ? `<p style="margin:4px 0 0;font-size:13px;color:${TEXT_MID};">${employer}</p>` : ''}
    </td></tr>
    <tr><td style="padding:20px;">
      ${scoreBar(overallScore)}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${BORDER};">
          <span style="font-size:13px;color:${TEXT_MID};">Grade</span>
        </td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid ${BORDER};">
          <span style="font-size:13px;font-weight:600;color:${TEXT_DARK};">${gradeLabel}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <span style="font-size:13px;color:${TEXT_MID};">Essential criteria coverage</span>
        </td>
        <td align="right" style="padding:8px 0;">
          <span style="font-size:13px;font-weight:600;color:${essentialCoverage >= 80 ? SUCCESS : AMBER};">${Math.round(essentialCoverage)}%</span>
        </td>
      </tr>
      </table>
    </td></tr>
    </table>

    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_MID};line-height:1.7;">
      View your full breakdown — including the Missing Evidence Report, per-competency scores, and predicted interview questions.
    </p>

    ${button('View full analysis →', shortlistUrl)}
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATEMENT GENERATED — sent when Q1/Q2/Q3 are all complete
// ─────────────────────────────────────────────────────────────────────────────

export function statementGeneratedEmail(params: {
  name:          string
  jobTitle:      string
  employer:      string | null
  nation:        string
  wordCountQ1:   number
  wordCountQ2:   number
  wordCountQ3:   number
  statementUrl:  string
}): string {
  const { name, jobTitle, employer, nation, wordCountQ1, wordCountQ2, wordCountQ3, statementUrl } = params
  const isScotland = nation === 'scotland' || nation === 'unknown'

  return base('Your supporting statement is ready', `
    <p style="margin:0 0 4px;font-size:14px;color:${TEXT_MID};">Hi ${name || 'there'},</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_DARK};">Your statement is ready to submit 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${TEXT_MID};line-height:1.7;">
      Your NHS supporting statement for <strong>${jobTitle}</strong>${employer ? ` at <strong>${employer}</strong>` : ''} has been generated.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:10px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:16px 20px;background:${BODY_BG};border-bottom:1px solid ${BORDER};">
      <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT_DARK};text-transform:uppercase;letter-spacing:.05em;">Statement summary</p>
    </td></tr>
    <tr><td style="padding:20px;">
      ${[
        { label: 'Q1 — Why you are suitable', wc: wordCountQ1, color: '#3b82f6' },
        { label: 'Q2 — Why this employer', wc: wordCountQ2, color: '#6366f1' },
        { label: 'Q3 — Other information', wc: wordCountQ3, color: '#f59e0b' },
      ].map(({ label, wc, color }) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          <td style="font-size:13px;color:${TEXT_MID};">${label}</td>
          <td align="right" style="font-size:13px;font-weight:600;color:${color};">${wc} words</td>
        </tr>
        </table>
      `).join('')}
      ${isScotland ? `
        <p style="margin:16px 0 0;font-size:13px;color:${TEXT_MID};padding:12px;background:${BRAND_LIGHT};border-radius:8px;">
          📋 <strong>NHS Scotland / Jobtrain:</strong> Paste each question separately into the three boxes on your application form.
        </p>
      ` : `
        <p style="margin:16px 0 0;font-size:13px;color:${TEXT_MID};padding:12px;background:${BRAND_LIGHT};border-radius:8px;">
          📋 Copy the full combined statement and paste it into the supporting statement box.
        </p>
      `}
    </td></tr>
    </table>

    ${button('Open your statement →', statementUrl)}

    <p style="margin:0;font-size:13px;color:${TEXT_LIGHT};">
      Good luck with your application! Remember to proofread before submitting.
    </p>
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUBSCRIPTION CONFIRMED — sent on successful Stripe payment
// ─────────────────────────────────────────────────────────────────────────────

export function subscriptionConfirmedEmail(params: {
  name:        string
  plan:        string
  amount:      string
  renewalDate: string
  dashboardUrl:string
}): string {
  const { name, plan, amount, renewalDate, dashboardUrl } = params
  return base(`${plan} plan confirmed`, `
    <p style="margin:0 0 4px;font-size:14px;color:${TEXT_MID};">Hi ${name || 'there'},</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_DARK};">You are now on ${plan} 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${TEXT_MID};line-height:1.7;">
      Your ${plan} plan is now active. All ${plan} features are unlocked immediately.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:10px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:16px 20px;background:${BODY_BG};border-bottom:1px solid ${BORDER};">
      <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT_DARK};text-transform:uppercase;letter-spacing:.05em;">Billing details</p>
    </td></tr>
    <tr><td style="padding:20px;">
      ${[
        ['Plan', plan],
        ['Amount', `${amount}/month`],
        ['Next renewal', renewalDate],
        ['Platform', 'OmniJobReady AI&#8482; — Powered by Omni Buddy&#8482;'],
        ['Payment', 'Secured by Stripe — cancel anytime'],
      ].map(([label, value]) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${BORDER};">
        <tr>
          <td style="padding:10px 0;font-size:13px;color:${TEXT_MID};">${label}</td>
          <td align="right" style="padding:10px 0;font-size:13px;font-weight:600;color:${TEXT_DARK};">${value}</td>
        </tr>
        </table>
      `).join('')}
    </td></tr>
    </table>

    ${button('Go to dashboard →', dashboardUrl)}
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEADLINE REMINDER — sent 48h before application deadline
// ─────────────────────────────────────────────────────────────────────────────

export function deadlineReminderEmail(params: {
  name:         string
  jobTitle:     string
  employer:     string | null
  deadline:     string
  hoursLeft:    number
  completeness: number
  statementUrl: string
}): string {
  const { name, jobTitle, employer, deadline, hoursLeft, completeness, statementUrl } = params
  const urgent = hoursLeft <= 24
  return base('Application deadline reminder', `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${urgent ? '#fef2f2' : '#fefce8'};border:1px solid ${urgent ? '#fecaca' : '#fde68a'};border-radius:10px;padding:16px 20px;margin:0 0 24px;">
    <tr><td>
      <p style="margin:0;font-size:15px;font-weight:600;color:${urgent ? DANGER : AMBER};">
        ${urgent ? '⚠ Deadline in less than 24 hours!' : '⏰ Application deadline in 48 hours'}
      </p>
    </td></tr>
    </table>

    <p style="margin:0 0 4px;font-size:14px;color:${TEXT_MID};">Hi ${name || 'there'},</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:${TEXT_DARK};">Don't forget your application</h1>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:10px;overflow:hidden;margin:0 0 24px;">
    <tr><td style="padding:16px 20px;background:${BODY_BG};border-bottom:1px solid ${BORDER};">
      <p style="margin:0;font-size:16px;font-weight:600;color:${TEXT_DARK};">${jobTitle}</p>
      ${employer ? `<p style="margin:4px 0 0;font-size:13px;color:${TEXT_MID};">${employer}</p>` : ''}
    </td></tr>
    <tr><td style="padding:20px;">
      ${[
        ['Deadline', deadline],
        ['Time remaining', `${hoursLeft} hours`],
        ['Statement progress', `${completeness}%`],
      ].map(([label, value]) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${BORDER};">
        <tr>
          <td style="padding:10px 0;font-size:13px;color:${TEXT_MID};">${label}</td>
          <td align="right" style="padding:10px 0;font-size:13px;font-weight:600;color:${TEXT_DARK};">${value}</td>
        </tr>
        </table>
      `).join('')}
    </td></tr>
    </table>

    ${completeness < 100
      ? `<p style="margin:0 0 20px;font-size:14px;color:${TEXT_MID};">Your statement is ${completeness}% complete. Finish it now before the deadline closes.</p>`
      : `<p style="margin:0 0 20px;font-size:14px;color:${TEXT_MID};">Your statement is complete — make sure you submit it before the deadline.</p>`
    }

    ${button(completeness < 100 ? 'Finish your statement →' : 'Review and submit →', statementUrl, urgent ? DANGER : BRAND_BLUE)}
  `)
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MENTORSHIP REPLY — sent when admin replies to a mentorship message
// ─────────────────────────────────────────────────────────────────────────────

export function mentorshipReplyEmail(params: {
  name:          string
  replyPreview:  string
  threadUrl:     string
}): string {
  const { name, replyPreview, threadUrl } = params
  return base('New message from your mentor', `
    <p style="margin:0 0 4px;font-size:14px;color:${TEXT_MID};">Hi ${name || 'there'},</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:${TEXT_DARK};">Your mentor has replied</h1>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BODY_BG};border-left:4px solid ${BRAND_BLUE};padding:16px 20px;margin:0 0 24px;border-radius:0 8px 8px 0;">
    <tr><td>
      <p style="margin:0;font-size:14px;color:${TEXT_DARK};line-height:1.7;">${replyPreview}</p>
    </td></tr>
    </table>

    ${button('Read full message →', threadUrl)}
  `)
}