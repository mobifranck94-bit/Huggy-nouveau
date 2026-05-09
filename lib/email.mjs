import { Resend } from 'resend';
import SibApiV3Sdk from 'sib-api-v3-sdk';

// ─── Email Configuration ────────────────────────────────────────────────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const brevoClient = process.env.BREVO_API_KEY ? 
  SibApiV3Sdk.ApiClient.instance : null;

if (brevoClient) {
  brevoClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
}

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Huggy <noreply@huggy.app>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─── Email Templates ────────────────────────────────────────────────────────
const templates = {
  welcome: (data) => ({
    subject: 'Welcome to Huggy! 🚀',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Huggy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 40px 0; }
    .logo { width: 80px; height: 80px; }
    h1 { color: #1488fc; font-size: 28px; margin-bottom: 10px; }
    .subtitle { color: #666; font-size: 16px; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 30px 0; }
    .feature { display: flex; align-items: start; margin: 20px 0; }
    .feature-icon { width: 40px; height: 40px; background: #1488fc15; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; }
    .cta { text-align: center; margin: 40px 0; }
    .cta a { display: inline-block; background: #1488fc; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 14px; padding-top: 30px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${APP_URL}/assets/huggy-logo.png" alt="Huggy" class="logo">
    <h1>Welcome to Huggy!</h1>
    <p class="subtitle">Your AI-powered app builder</p>
  </div>
  
  <div class="content">
    <p>Hi ${data.name || 'there'},</p>
    <p>Welcome to Huggy! We're excited to help you build amazing applications with the power of AI.</p>
    
    <div class="feature">
      <div class="feature-icon">🤖</div>
      <div>
        <strong>8 AI Agents</strong>
        <p>Our multi-agent pipeline handles everything from research to deployment.</p>
      </div>
    </div>
    
    <div class="feature">
      <div class="feature-icon">⚡</div>
      <div>
        <strong>Instant Preview</strong>
        <p>See your app come to life in real-time as our agents build it.</p>
      </div>
    </div>
    
    <div class="feature">
      <div class="feature-icon">🚀</div>
      <div>
        <strong>One-Click Deploy</strong>
        <p>Deploy to Vercel or Netlify with a single click.</p>
      </div>
    </div>
  </div>
  
  <div class="cta">
    <a href="${APP_URL}/builder">Start Building Now</a>
  </div>
  
  <div class="footer">
    <p>Huggy - Build any SaaS instantly</p>
    <p style="font-size: 12px;">You're receiving this because you signed up for Huggy.</p>
  </div>
</body>
</html>`
  }),
  
  passwordReset: (data) => ({
    subject: 'Reset Your Huggy Password',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 40px 0; }
    h1 { color: #1488fc; font-size: 24px; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 30px 0; }
    .cta { text-align: center; margin: 40px 0; }
    .cta a { display: inline-block; background: #1488fc; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .expiry { color: #666; font-size: 14px; text-align: center; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 14px; padding-top: 30px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Password Reset</h1>
  </div>
  
  <div class="content">
    <p>Hi ${data.name || 'there'},</p>
    <p>We received a request to reset your Huggy password. Click the button below to set a new password:</p>
    
    <div class="cta">
      <a href="${data.resetUrl}">Reset Password</a>
    </div>
    
    <p class="expiry">This link will expire in 24 hours.</p>
    <p style="margin-top: 30px; font-size: 14px; color: #666;">
      If you didn't request this reset, you can safely ignore this email.
    </p>
  </div>
  
  <div class="footer">
    <p>Huggy - Build any SaaS instantly</p>
  </div>
</body>
</html>`
  }),
  
  buildComplete: (data) => ({
    subject: `Your "${data.projectName}" build is complete! 🎉`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Build Complete</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 40px 0; background: linear-gradient(135deg, #1488fc20, #3b82f620); border-radius: 12px; margin-bottom: 30px; }
    h1 { color: #1488fc; font-size: 24px; }
    .stats { display: flex; justify-content: space-around; margin: 30px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #1488fc; }
    .stat-label { color: #666; font-size: 14px; }
    .cta { text-align: center; margin: 40px 0; }
    .cta a { display: inline-block; background: #1488fc; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 0 10px; }
    .footer { text-align: center; color: #999; font-size: 14px; padding-top: 30px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Build Complete!</h1>
    <p>Your project "${data.projectName}" is ready</p>
  </div>
  
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${data.filesGenerated}</div>
      <div class="stat-label">Files Generated</div>
    </div>
    <div class="stat">
      <div class="stat-value">${data.securityScore}</div>
      <div class="stat-label">Security Score</div>
    </div>
    <div class="stat">
      <div class="stat-value">${data.qaScore}</div>
      <div class="stat-label">QA Score</div>
    </div>
  </div>
  
  <div class="cta">
    <a href="${APP_URL}/builder?project=${data.projectId}">View Project</a>
    ${data.deployUrl ? `<a href="${data.deployUrl}">Live Demo</a>` : ''}
  </div>
  
  <div class="footer">
    <p>Huggy - Build any SaaS instantly</p>
  </div>
</body>
</html>`
  }),
  
  lowCredits: (data) => ({
    subject: '⚠️ Low Credits Alert',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Low Credits</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 40px 0; }
    h1 { color: #f59e0b; font-size: 24px; }
    .content { background: #fef3c7; padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #f59e0b; }
    .credits { font-size: 48px; font-weight: bold; text-align: center; color: #f59e0b; margin: 20px 0; }
    .cta { text-align: center; margin: 40px 0; }
    .cta a { display: inline-block; background: #1488fc; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 14px; padding-top: 30px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚠️ Low Credits Alert</h1>
  </div>
  
  <div class="content">
    <p>Hi ${data.name || 'there'},</p>
    <p>You're running low on Huggy credits:</p>
    <div class="credits">${data.creditsRemaining}</div>
    <p style="text-align: center;">Upgrade your plan to continue building amazing apps!</p>
  </div>
  
  <div class="cta">
    <a href="${APP_URL}/dashboard/billing">Upgrade Now</a>
  </div>
  
  <div class="footer">
    <p>Huggy - Build any SaaS instantly</p>
  </div>
</body>
</html>`
  }),
  
  notification: (data) => ({
    subject: data.subject,
    html: data.html
  })
};

// ─── Send Email Function ────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html, type = 'welcome', data = {} }) {
  // Use template if type is specified
  let emailContent = { subject, html };
  
  if (templates[type]) {
    emailContent = templates[type](data);
  }
  
  // Try Resend first, fallback to Brevo
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject: emailContent.subject,
        html: emailContent.html,
      });
      
      console.log(`[Email] Sent via Resend to ${to}`);
      return { success: true, provider: 'resend', messageId: result.id };
    } catch (err) {
      console.warn('[Email] Resend failed:', err.message);
    }
  }
  
  if (brevoClient) {
    try {
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.subject = emailContent.subject;
      sendSmtpEmail.htmlContent = emailContent.html;
      sendSmtpEmail.sender = { email: DEFAULT_FROM.match(/<(.+)>/)?.[1] || DEFAULT_FROM, name: 'Huggy' };
      sendSmtpEmail.to = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];
      
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log(`[Email] Sent via Brevo to ${to}`);
      return { success: true, provider: 'brevo', messageId: result.messageId };
    } catch (err) {
      console.error('[Email] Brevo failed:', err.message);
      throw err;
    }
  }
  
  // No email provider configured
  console.warn('[Email] No email provider configured. Email would have been sent:');
  console.warn(`  To: ${to}`);
  console.warn(`  Subject: ${emailContent.subject}`);
  
  return { success: false, error: 'No email provider configured' };
}

// ─── Queue Email for Background Sending ─────────────────────────────────────
const emailQueue = [];

export function queueEmail(emailData) {
  emailQueue.push({
    ...emailData,
    attempts: 0,
    maxAttempts: 3,
    createdAt: Date.now()
  });
  
  // Process queue immediately
  processEmailQueue();
}

async function processEmailQueue() {
  while (emailQueue.length > 0) {
    const email = emailQueue[0];
    
    try {
      await sendEmail(email);
      emailQueue.shift(); // Remove from queue on success
    } catch (err) {
      email.attempts++;
      
      if (email.attempts >= email.maxAttempts) {
        console.error(`[Email] Failed after ${email.maxAttempts} attempts:`, err);
        emailQueue.shift(); // Remove after max retries
      } else {
        // Wait before retry
        await new Promise(r => setTimeout(r, 5000 * email.attempts));
      }
    }
  }
}

export { templates };
