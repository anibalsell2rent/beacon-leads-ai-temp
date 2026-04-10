import nodemailer from "nodemailer";

export class AlertService {
    private static _transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.example.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER || "your_smtp_user",
            pass: process.env.SMTP_PASS || "your_smtp_password",
        },
    });
    public static get transporter() {
        return AlertService._transporter;
    }
    public static set transporter(value) {
        AlertService._transporter = value;
    }

    static async sendCrashAlertEmail(errorDescription: string) {
        const alertEmailOptions = {
            from: `"Beacon Leads AI Backend - ALERT!" <${process.env.ALERT_FROM_EMAIL || 'alerts@yourdomain.com'}>`,
            to: process.env.ALERT_TO_EMAILS || "dev-team@yourdomain.com, admin@yourdomain.com",
            subject: "CRITICAL: Server Crash Alert - Beacon Leads AI",
            text: `The Beacon Leads AI backend has experienced a critical failure.\n\nError Details:\n${errorDescription}\n\nPlease investigate immediately.`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4d4f; border-radius: 5px; background-color: #fff1f0;">
          <h2 style="color: #cf1322;">🚨 Critical Server Failure</h2>
          <p>The <strong>Beacon Leads AI</strong> backend has experienced an unexpected crash or failed to start.</p>
          <hr style="border-top: 1px solid #ffa39e;" />
          <h3>Error Details:</h3>
          <pre style="background: #2b2b2b; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto;"><code>${errorDescription}</code></pre>
          <br/>
          <p>Please investigate the server logs immediately.</p>
        </div>
      `,
        };

        try {
            const info = await this.transporter.sendMail(alertEmailOptions);
            console.log("🚨 Crash alert email sent successfully:", info.messageId);
        } catch (error) {
            console.error("❌ Failed to send crash alert email. The email service might be misconfigured:", error);
        }
    }
}

