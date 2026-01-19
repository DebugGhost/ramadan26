import { Resend } from 'resend'

interface PromotionEmailParams {
    to: string
    userName: string
    date: string
    cancelUrl: string
}

export async function sendPromotionEmail({ to, userName, date, cancelUrl }: PromotionEmailParams) {
    // Initialize Resend inside the function to avoid build-time errors
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Format the date nicely
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
    })

    const { data, error } = await resend.emails.send({
        from: 'UAlberta MSA <noreply@msauofa.ca>',
        to: [to],
        subject: `Great News! Your Iftar Spot is Confirmed for ${formattedDate}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <img src="${process.env.NEXT_PUBLIC_SITE_URL}/MSAUofAlogo.webp" alt="UAlberta MSA Logo" width="80" height="80" style="display: block; margin: 0 auto 16px; width: 80px; height: 80px; object-fit: contain;" />
                            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">UAlberta MSA</h1>
                            <p style="color: #a78bfa; font-size: 14px; margin: 4px 0 0;">Iftar Portal</p>
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 24px; padding: 40px;">
                            <!-- Celebration -->
                            <div style="text-align: center; margin-bottom: 30px;">
                                <!-- Empty spacer or removed confetti -->
                            </div>
                            
                            <!-- Greeting -->
                            <h2 style="color: #ffffff; font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 16px;">
                                Great News, ${userName}!
                            </h2>
                            
                            <!-- Message -->
                            <p style="color: #c4b5fd; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 30px;">
                                A spot has opened up and you've been moved from the waitlist to <strong style="color: #a78bfa;">confirmed</strong> for Iftar!
                            </p>
                            
                            <!-- Date Card -->
                            <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 30px;">
                                <p style="color: #a78bfa; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Your Confirmed Iftar Date</p>
                                <p style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0;">${formattedDate}</p>
                            </div>
                            
                            <!-- Confirmation Badge -->
                            <div style="text-align: center; margin-bottom: 30px;">
                                <span style="display: inline-block; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); color: #c4b5fd; padding: 12px 24px; border-radius: 12px; font-weight: 600;">
                                    Confirmed Reservation
                                </span>
                            </div>
                            
                            <!-- Cancellation Notice -->
                            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                                <p style="color: #fca5a5; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                                    If you can no longer attend, please cancel your reservation so someone else can take your spot.
                                </p>
                            </div>
                            
                            <!-- Cancel Button -->
                            <div style="text-align: center;">
                                <a href="${cancelUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                                    Cancel Reservation
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 30px; text-align: center;">
                            <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
                                This email was sent by UAlberta MSA Iftar Portal.<br>
                                If you have any questions, please contact us.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
        text: `
Great News, ${userName}!

A spot has opened up and you've been moved from the waitlist to CONFIRMED for Iftar!

Your Confirmed Iftar Date: ${formattedDate}

Confirmed Reservation

If you can no longer attend, please cancel your reservation so someone else can take your spot.

Cancel your reservation here: ${cancelUrl}

---
This email was sent by UAlberta MSA Iftar Portal.
        `.trim()
    })

    if (error) {
        console.error('Failed to send promotion email:', error)
        throw new Error(`Failed to send email: ${error.message}`)
    }

    return data
}
