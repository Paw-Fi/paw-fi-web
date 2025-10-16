import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { corsHeaders } from '../shared/cors.ts'
import { sendEmail, sendUserEmail, EmailOptions } from '../shared/email-service.ts'
import { 
  welcomeTemplate, 
  notificationTemplate 
} from '../shared/email-templates.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Supabase webhook payload structure
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: any
  old_record?: any
  schema: string
}

interface SendEmailRequest {
  type: 'direct' | 'template'
  // For direct emails
  to?: string
  subject?: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: any[]
  // For template emails
  email?: string
  name?: string
  template?: {
    html: string
    text: string
    subject: string
  }
}

interface SendEmailResponse {
  success: boolean
  id?: string
  error?: string
  test?: boolean
}

serve(async (req) => {
  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed. Use POST.' 
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    let requestData: SendEmailRequest | WebhookPayload
    try {
      requestData = await req.json()
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result: { success: boolean; id?: string; error?: string; test?: boolean }

    // Check if this is a webhook payload (has table and type fields)
    if ('table' in requestData && 'type' in requestData) {
      // Handle webhook
      result = await handleWebhookEmail(requestData as WebhookPayload)
    } else {
      // Handle direct/template emails
      const emailRequest = requestData as SendEmailRequest
      
      // Validate required fields based on email type
      if (!emailRequest.type) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Email type is required (direct or template)' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      result = await handleDirectEmail(emailRequest)
    }

    // Return response
    const responseData: SendEmailResponse = {
      success: result.success,
      id: result.id,
      error: result.error,
      test: result.test,
    }

    const statusCode = result.success ? 200 : 500

    return new Response(JSON.stringify(responseData), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unexpected error in send-email function:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Server error: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Handle direct/template emails
async function handleDirectEmail(data: SendEmailRequest): Promise<{ success: boolean; id?: string; error?: string; test?: boolean }> {
  if (data.type === 'direct') {
    // Validate required fields for direct email
    if (!data.to || !data.subject || !data.html) {
      return { success: false, error: 'Missing required fields: to, subject, html' }
    }

    // Send direct email
    const emailOptions: EmailOptions = {
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      from: data.from,
      replyTo: data.replyTo,
      cc: data.cc,
      bcc: data.bcc,
      attachments: data.attachments,
    }

    return await sendEmail(emailOptions)

  } else if (data.type === 'template') {
    // Validate required fields for template email
    if (!data.email || !data.name || !data.template) {
      return { success: false, error: 'Missing required fields: email, name, template' }
    }

    if (!data.template.html || !data.template.text || !data.template.subject) {
      return { success: false, error: 'Template must include html, text, and subject' }
    }

    // Send template email
    return await sendUserEmail(data.email, data.name, data.template)
  }

  return { success: false, error: 'Invalid email type' }
}

// Handle webhook-triggered emails from Supabase
async function handleWebhookEmail(webhook: WebhookPayload): Promise<{ success: boolean; id?: string; error?: string; test?: boolean }> {
  try {
    console.log(`Webhook received: ${webhook.type} on ${webhook.table}`)

    // Handle users table events
    if (webhook.table === 'users') {
      if (webhook.type === 'INSERT') {
        // Skip welcome email on user creation, wait for first login after verification
        if (webhook.record?.email) {
          console.log(`User record created for: ${webhook.record.email}, skipping welcome email until verified`)
          return { success: true, id: 'user-created-no-email' }
        }
      }
      
      if (webhook.type === 'UPDATE' && webhook.record?.email && webhook.old_record) {
        // Detect first login after verification (when last_login changes from null to a timestamp)
        const wasFirstLogin = webhook.old_record.last_login === null && webhook.record.last_login !== null
        
        if (wasFirstLogin) {
          console.log(`First login detected for verified user: ${webhook.record.email}`)
          
          // Verify user is actually confirmed by checking auth.users
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(webhook.record.id)
          
          if (authError) {
            console.error('Error fetching auth user:', authError)
            return { success: false, error: 'Could not verify user status' }
          }
          
          if (!authUser?.user?.email_confirmed_at) {
            console.log(`User ${webhook.record.email} still not verified, skipping welcome email`)
            return { success: true, id: 'user-not-verified-yet' }
          }
          
          console.log(`Sending welcome email to newly verified user: ${webhook.record.email}`)
          
          // Send welcome email to newly verified users
          const template = welcomeTemplate({
            name: webhook.record.full_name || '',
            email: webhook.record.email,
            dashboardUrl: 'https://moneko.io/dashboard'
          })
          
          return await sendUserEmail(webhook.record.email, webhook.record.full_name || '', template)
        }
      }
    }

    // Handle early access claims table events
    if (webhook.table === 'early_access_claims' && webhook.type === 'INSERT') {
      if (webhook.record?.email) {
        console.log(`Sending early access welcome email to: ${webhook.record.email}`)
        
        const userName = webhook.record.first_name || 'Early Access Member'
        
        // Apple-inspired email template following Moneko design system
        const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moneko</title>
  <style>
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      max-width: 600px;
      margin: 0 auto;
      padding: 32px 24px;
      background-color: #F9FAFB;
    }
    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    .logo {
      max-width: 120px;
      margin-bottom: 32px;
    }
    .content {
      background-color: #FFFFFF;
      padding: 48px 32px;
      border-radius: 24px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    .highlight-card {
      background-color: #F9FAFB;
      padding: 32px;
      border-radius: 16px;
      text-align: center;
      margin: 32px 0;
    }
    .feature-list {
      background-color: #F9FAFB;
      padding: 24px 32px;
      border-radius: 16px;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: #7458FF;
      color: #FFFFFF !important;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 500;
      margin: 32px 0;
      transition: all 200ms ease;
    }
    .button:hover {
      background: #836DFF;
      transform: translateY(-1px);
    }
    .footer {
      margin-top: 48px;
      text-align: center;
      font-size: 14px;
      color: #6B7280;
    }
    h1 { 
      color: #1F2937; 
      font-size: 28px; 
      font-weight: 600; 
      margin-bottom: 24px;
      text-align: center;
    }
    h2 { 
      color: #1F2937; 
      font-size: 24px; 
      font-weight: 500;
      margin: 32px 0 16px 0;
    }
    h3 { 
      color: #7458FF; 
      font-size: 20px; 
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    h4 { 
      color: #7458FF; 
      font-size: 18px; 
      font-weight: 500;
      margin: 0 0 16px 0;
    }
    p { 
      color: #1F2937; 
      margin: 16px 0;
      line-height: 1.7;
    }
    .muted { 
      color: #6B7280; 
    }
    ul {
      padding-left: 0;
      margin: 24px 0;
    }
    li { 
      color: #1F2937;
      margin: 12px 0;
      padding-left: 0;
      list-style: none;
      position: relative;
    }
    li:before {
      content: "•";
      color: #7458FF;
      font-size: 20px;
      position: absolute;
      left: -20px;
    }
    strong {
      color: #1F2937;
      font-weight: 600;
    }
    .expectation-item {
      display: block;
      margin: 8px 0;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://moneko.io/logo192.png" alt="Moneko Logo" class="logo" />
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>Moneko Inc., 123 Financial St., San Francisco, CA 94103</p>
    <p class="muted">This email was sent to you because you joined our mobile app waitlist.</p>
  </div>
</body>
</html>
`
        
        // Send mobile app waitlist welcome email using design system
        const content = `
          <h1>Welcome to the Moneko Mobile Public Beta!</h1>
          <p>Hi ${userName},</p>
          <p>Thanks for helping us test the Moneko mobile experience. You're officially part of our public beta, and we can't wait for you to explore the latest build.</p>

          <div class="highlight-card">
            <h3>You're Ready to Install</h3>
            <span class="expectation-item">Download the TestFlight build and start budgeting on mobile</span>
            <span class="expectation-item">Share feedback directly with the team to shape upcoming releases</span>
            <span class="expectation-item">Expect frequent updates as we add more capabilities</span>
          </div>

          <h2>What You Can Explore Right Now</h2>
          <ul>
            <li><strong>Chat-based expense logging</strong> - Log expenses or income with natural language and quick taps.</li>
            <li><strong>Smart spending insights</strong> - Let AI categorize your spending and surface top categories.</li>
            <li><strong>Bill & paycheck reminders</strong> - Stay notified about upcoming income and obligations.</li>
            <li><strong>Goal tracking with celebrations</strong> - Set goals, track growth, and celebrate milestones.</li>
          </ul>

          <div class="feature-list">
            <h4>Need a desktop companion?</h4>
            <ul>
              <li>Use the live web dashboard for advanced budgeting and analytics.</li>
              <li>Keep your goals and insights synced across devices.</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="https://testflight.apple.com/join/Q9rNbkN5" class="button">Download on TestFlight →</a>
          </div>

          <p>Need help or have feedback about the beta? Reply to this email or contact us at <a href="mailto:hello@moneko.io" style="color: #7458FF; text-decoration: none;">hello@moneko.io</a></p>

          <p><strong>Thanks for building Moneko with us!</strong></p>
          <p class="muted">The Moneko Team</p>
        `

        const template = {
          subject: 'Welcome to the Moneko Mobile Public Beta!',
          html: baseTemplate(content),
          text: `
Welcome to the Moneko Mobile Public Beta!

Hi ${userName}!

Thanks for helping us test the Moneko mobile experience. You're officially part of our public beta, and we can't wait for you to explore the latest build.

You're Ready to Install:
Download the TestFlight build and start budgeting on mobile
Share feedback directly with the team to shape upcoming releases
Expect frequent updates as we add more capabilities

What You Can Explore Right Now:
• Chat-based expense logging — Log expenses or income with natural language and quick taps.
• Smart spending insights — Let AI categorize your spending and surface top categories.
• Bill & paycheck reminders — Stay notified about upcoming income and obligations.
• Goal tracking with celebrations — Set goals, track growth, and celebrate milestones.

Need a desktop companion?
• Use the live web dashboard for advanced budgeting and analytics.
• Keep your goals and insights synced across devices.

Download on TestFlight: https://testflight.apple.com/join/Q9rNbkN5

Need help or have feedback about the beta? Reply to this email or contact us at hello@moneko.io

Thanks for building Moneko with us!
The Moneko Team
          `
        }
        
        return await sendUserEmail(webhook.record.email, userName, template)
      }
    }

    // Handle subscriptions table events
    if (webhook.table === 'subscriptions') {
      if (webhook.type === 'INSERT') {
        console.log(`New subscription created: ${webhook.record.id}`)
        
        // Get user details from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', webhook.record.user_id)
          .single()
        
        if (userError || !userData) {
          console.error('Error fetching user for subscription:', userError)
          return { success: false, error: 'User not found' }
        }
        
        console.log(`Sending subscription welcome email to: ${userData.email}`)
        
        // Send welcome email for new subscriptions
        const template = notificationTemplate({
          name: userData.full_name || '',
          title: 'Subscription Activated!',
          message: `Welcome to your new ${webhook.record.plan || 'Premium'} subscription! Your subscription is now active and ready to use.`,
          actionUrl: 'https://moneko.io/dashboard/membership',
          actionText: 'View Membership',
          priority: 'high'
        })

        return await sendUserEmail(userData.email, userData.full_name || '', template)
        
      } else if (webhook.type === 'UPDATE' && webhook.old_record) {
        console.log(`Subscription updated: ${webhook.record.id}`)
        
        // Get user details from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', webhook.record.user_id)
          .single()
        
        if (userError || !userData) {
          console.error('Error fetching user for subscription update:', userError)
          return { success: false, error: 'User not found' }
        }
        
        console.log(`Sending subscription update email to: ${userData.email}`)
        
        // Determine what changed and create appropriate message
        let title = 'Subscription Updated'
        let message = 'Your subscription has been updated.'
        let priority: 'low' | 'medium' | 'high' = 'medium'
        
        if (webhook.record.status !== webhook.old_record.status) {
          title = 'Subscription Status Update'
          message = `Your subscription status has been updated from ${webhook.old_record.status} to ${webhook.record.status}.`
          priority = webhook.record.status === 'active' ? 'high' : 'medium'
        } else if (webhook.record.plan !== webhook.old_record.plan) {
          title = 'Subscription Plan Updated'
          message = `Your subscription plan has been updated from ${webhook.old_record.plan} to ${webhook.record.plan}.`
          priority = 'high'
        } else if (webhook.record.current_period_end !== webhook.old_record.current_period_end) {
          title = 'Subscription Renewed'
          message = `Your subscription has been renewed and will continue until ${new Date(webhook.record.current_period_end).toLocaleDateString()}.`
          priority = 'medium'
        } else {
          // Generic update message
          title = 'Subscription Updated'
          message = 'Your subscription details have been updated. Please check your membership dashboard for the latest information.'
          priority = 'low'
        }
        
        // Send notification for subscription update
        const template = notificationTemplate({
          name: userData.full_name || '',
          title,
          message,
          actionUrl: 'https://moneko.io/dashboard/membership',
          actionText: 'View Membership',
          priority
        })

        return await sendUserEmail(userData.email, userData.full_name || '', template)
      }
    }

    // Default case - no email sent
    console.log(`No email handler for ${webhook.type} on ${webhook.table}`)
    return { success: true, id: 'no-email-sent' }

  } catch (error) {
    console.error('Error in handleWebhookEmail:', error)
    return { success: false, error: error.message }
  }
}