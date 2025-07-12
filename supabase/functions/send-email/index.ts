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
    if (webhook.table === 'users' && webhook.type === 'INSERT') {
      if (webhook.record?.email) {
        console.log(`Sending welcome email to: ${webhook.record.email}`)
        
        // Send welcome email to new users
        const template = welcomeTemplate({
          name: webhook.record.full_name || '',
          email: webhook.record.email,
          dashboardUrl: 'https://moneko.io/dashboard'
        })
        
        return await sendUserEmail(webhook.record.email, webhook.record.full_name || '', template)
      }
    }

    // Handle early access claims table events
    if (webhook.table === 'early_access_claims' && webhook.type === 'INSERT') {
      if (webhook.record?.email) {
        console.log(`Sending early access welcome email to: ${webhook.record.email}`)
        
        const userName = webhook.record.first_name || 'Early Access Member'
        
        // Base template function for consistent email styling
        const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moneko</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 150px;
      margin-bottom: 20px;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 8px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #6d28d9, #4f46e5);
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    h1 { color: #333; }
    h2 { color: #333; }
    h3 { color: #333; }
    h4 { color: #333; }
    p { color: #333; }
    li { color: #333; }
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
    <p>This email was sent to you because you joined our early access program.</p>
  </div>
</body>
</html>
`
        
        // Send early access welcome email with promo code using consistent template
        const content = `
          <h1>🎉 Welcome to Moneko Early Access!</h1>
          <p>Hi ${userName},</p>
          <p>Congratulations! You've successfully claimed your spot in Moneko's exclusive early access program. You're now one of the first 100 users to experience the future of financial education.</p>
          
          <div style="background: #f3f4f6; border: 3px solid #6d28d9; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <h3 style="color: #6d28d9; margin: 0 0 15px; font-size: 20px; font-weight: bold;">🎁 Your Exclusive Free Trial Code</h3>
            <div style="background: transparent; border: 2px dashed #6d28d9; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <code style="color: #6d28d9; font-size: 28px; font-weight: bold; letter-spacing: 3px;">MONEKO25</code>
            </div>
            <p style="color: #333333; margin: 10px 0 0; font-size: 16px;">
              Use this code at checkout to get your <strong style="color: #6d28d9;">FREE premium trial</strong>
            </p>
          </div>
          
          <h3>What's Next?</h3>
          <ul>
            <li>Visit our <a href="https://moneko.io/pricing" style="color: #6d28d9; text-decoration: none; font-weight: bold;">pricing page</a> to start your free trial</li>
            <li>Enter code <strong>MONEKO25</strong> at checkout for instant free access</li>
            <li>Explore premium features before they're available to the public</li>
            <li>Share feedback to help shape Moneko's future</li>
          </ul>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #6d28d9; margin: 25px 0;">
            <h4 style="margin: 0 0 10px; color: #6d28d9;">💎 Premium Features Included:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>AI-powered personal financial coach</li>
              <li>Advanced analytics and insights</li>
              <li>Exclusive financial courses</li>
              <li>Priority customer support</li>
              <li>Early access to new features</li>
            </ul>
          </div>
          
          <p style="text-align: center;">
            <a href="https://moneko.io/pricing" style="display: inline-block; background: #6d28d9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; border: none;">Start Your Free Trial Now →</a>
          </p>
          
          <p>Questions? Reply to this email or reach out to us at <a href="mailto:hello@moneko.io" style="color: #6d28d9;">hello@moneko.io</a></p>
          
          <p><strong>Welcome to the future of financial education!</strong></p>
          <p>The Moneko Team</p>
        `

        const template = {
          subject: '🎉 Welcome to Moneko Early Access - Exclusive Free Trial Inside!',
          html: baseTemplate(content),
          text: `
🎉 Welcome to Moneko Early Access!

Hi ${userName}!

Congratulations! You've successfully claimed your spot in Moneko's exclusive early access program. You're now one of the first 100 users to experience the future of financial education.

🎁 Your Exclusive Free Trial Code: MONEKO25

Use this code at checkout to get your FREE premium trial.

What's Next?
• Visit our pricing page (https://moneko.io/pricing) to start your free trial
• Enter code MONEKO25 at checkout for instant free access
• Explore premium features before they're available to the public
• Share feedback to help shape Moneko's future

💎 Premium Features Included:
• AI-powered personal financial coach
• Advanced analytics and insights
• Exclusive financial courses
• Priority customer support
• Early access to new features

Start Your Free Trial: https://moneko.io/pricing

Questions? Reply to this email or reach out to us at hello@moneko.io

Welcome to the future of financial education!
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