import nodemailer from "nodemailer"

// Sends the app's emails through any SMTP server (Gmail app password,
// Mailtrap, SendGrid, ...). Settings come from backend/.env — see .env.example.
// Without SMTP_HOST, emails aren't sent: outside production the reset page
// shows a "Demo only" link instead (authController.js).

let transporter = null

export function emailEnabled() {
    return Boolean(process.env.SMTP_HOST)
}

function getTransporter() {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT) || 587
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        })
    }
    return transporter
}

// Links in emails point here. Always from .env, never from the request's Host
// header — otherwise anyone could request a reset that links to their own site.
export function appUrl(path) {
    const base = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "")
    return `${base}/${path}`
}

const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

// One simple layout for every email: greeting, paragraphs, optional button
function render({ name, paragraphs, button, footer }) {
    const hi = `Hi ${name},`
    const text = [hi, ...paragraphs, button && `${button.label}: ${button.url}`, footer, "— MonoByte"]
        .filter(Boolean)
        .join("\n\n")

    const p = (s) => `<p style="margin:0 0 16px">${escapeHtml(s)}</p>`
    const html = `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:#000;max-width:520px">
${p(hi)}
${paragraphs.map(p).join("\n")}
${
    button
        ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="background:#3083b0;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block">${escapeHtml(button.label)}</a></p>
<p style="margin:0 0 16px;font-size:14px;color:#5c5c5c">Or paste this link into your browser:<br>${escapeHtml(button.url)}</p>`
        : ""
}
${footer ? `<p style="margin:0 0 16px;font-size:14px;color:#5c5c5c">${escapeHtml(footer)}</p>` : ""}
<p style="margin:0">— MonoByte</p>
</div>`
    return { text, html }
}

async function send(to, subject, body) {
    await getTransporter().sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        ...body,
    })
}

export function sendPasswordResetEmail(user, token, minutes) {
    return send(
        user.email,
        "Reset your MonoByte password",
        render({
            name: user.name,
            paragraphs: [
                "We got a request to reset the password for your MonoByte account.",
                `The link below works once and expires in ${minutes} minutes.`,
            ],
            button: { label: "Reset password", url: appUrl(`#/reset-password?token=${token}`) },
            footer: "If you didn't ask for this, you can ignore this email. Your password won't change.",
        })
    )
}

export function sendPasswordChangedEmail(user) {
    return send(
        user.email,
        "Your MonoByte password was changed",
        render({
            name: user.name,
            paragraphs: [
                "The password for your MonoByte account was just reset, and every device was logged out.",
                "If this was you, there's nothing else to do.",
            ],
            button: { label: "Reset it again", url: appUrl("#/forgot-password") },
            footer: "If this wasn't you, reset your password now with the link above, so whoever did it can't log in.",
        })
    )
}
