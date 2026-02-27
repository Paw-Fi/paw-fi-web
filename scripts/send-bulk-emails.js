#!/usr/bin/env node

/**
 * Last sent: 04/02/2026 @ 11:57
 * Bulk Email Sender Script
 * 
 * This script fetches users from Supabase based on a custom SQL query
 * and sends personalized emails using Resend API.
 * 
 * Features:
 * - Test mode with single email testing
 * - Confirmation prompt before sending to all users
 * - Customizable SQL query via migration script
 * - HTML email template support with variable substitution
 * - Rate limiting to avoid API throttling
 * 
 * Usage:
 *   Test mode:     node scripts/send-bulk-emails.js --test test@example.com
 *   Production:    node scripts/send-bulk-emails.js --query-file ./path/to/query.sql --template ./path/to/template.html
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.production
const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env.production') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qbuynyxyemigtnvdujts.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pawfi.app'; // Update with your verified sender email
const FROM_NAME = process.env.FROM_NAME || 'Paw-Fi Team';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yifan.lim@moneko.io'; // Admin email for summary reports

// Rate limiting: delay between emails (in milliseconds)
const RATE_LIMIT_DELAY = 510; // 510ms = 2 emails per second (Resend's limit)

// ============================================================================
// INITIALIZE CLIENTS
// ============================================================================

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    testMode: false,
    testEmail: null,
    queryFile: null,
    templateFile: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--test' && args[i + 1]) {
      config.testMode = true;
      config.testEmail = args[i + 1];
      i++;
    } else if (args[i] === '--query-file' && args[i + 1]) {
      config.queryFile = args[i + 1];
      i++;
    } else if (args[i] === '--template' && args[i + 1]) {
      config.templateFile = args[i + 1];
      i++;
    }
  }

  return config;
}

/**
 * Load SQL query from file
 */
function loadQuery(queryFile) {
  if (!queryFile) {
    // Default query: users with no subscription or cancelled free plan
    return `
SELECT u.email
FROM public.users AS u
WHERE u.email = 'yflim7020@gmail.com'
ORDER BY u.created_at;
    `;
  }

  const queryPath = path.resolve(queryFile);
  if (!fs.existsSync(queryPath)) {
    throw new Error(`Query file not found: ${queryPath}`);
  }

  return fs.readFileSync(queryPath, 'utf-8');
}

/**
 * Load HTML email template from file
 */
function loadTemplate(templateFile) {
  if (!templateFile) {
    // Default template path
    templateFile = path.join(__dirname, 'email-templates', 'default-template.html');
  }

  const templatePath = path.resolve(templateFile);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Replace variables in template
 */
function replaceVariables(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

/**
 * Extract first name from full name
 */
function getFirstName(fullName) {
  if (!fullName) return 'there';
  const parts = fullName.trim().split(' ');
  return parts[0] || 'there';
}

/**
 * Prompt user for confirmation
 */
function promptConfirmation(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate HTML summary report
 */
function generateSummaryReport(results, campaignDetails) {
  const { total, success, failed, errors } = results;
  const { subject, startTime, endTime } = campaignDetails;
  const duration = Math.round((endTime - startTime) / 1000);
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Campaign Summary Report</title>
</head>
<body style="margin:0; padding:40px 20px; background:#f7f7fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px; margin:0 auto;">
    <tr>
      <td style="text-align:center; padding:24px 0;">
        <h1 style="margin:0; font-weight:600; font-size:28px; color:#111827;">📊 Campaign Summary Report</h1>
        <p style="margin:12px 0 0; font-size:15px; color:#6b7280;">Email campaign completed successfully</p>
      </td>
    </tr>

    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; border-radius:16px; box-shadow:0 4px 12px rgba(17,24,39,0.08); padding:32px; margin-bottom:24px;">
          <tr>
            <td>
              <h2 style="margin:0 0 20px; font-size:18px; color:#111827; border-bottom:2px solid #f3f4f6; padding-bottom:12px;">Campaign Details</h2>
              
              <table style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:14px;">Subject Line:</td>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#111827; font-weight:600; font-size:14px; text-align:right;">${subject}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:14px;">Total Recipients:</td>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#111827; font-weight:600; font-size:14px; text-align:right;">${total}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:14px;">Successfully Sent:</td>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#10b981; font-weight:600; font-size:14px; text-align:right;">✅ ${success}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:14px;">Failed:</td>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#ef4444; font-weight:600; font-size:14px; text-align:right;">❌ ${failed}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:14px;">Success Rate:</td>
                  <td style="padding:12px 0; border-bottom:1px solid #f3f4f6; color:#111827; font-weight:600; font-size:14px; text-align:right;">${successRate}%</td>
                </tr>
                <tr>
                  <td style="padding:12px 0; color:#6b7280; font-size:14px;">Duration:</td>
                  <td style="padding:12px 0; color:#111827; font-weight:600; font-size:14px; text-align:right;">${duration}s</td>
                </tr>
              </table>

              ${failed > 0 ? `
              <div style="margin-top:24px; padding:16px; background:#fef2f2; border-left:4px solid #ef4444; border-radius:8px;">
                <h3 style="margin:0 0 12px; font-size:14px; color:#991b1b; font-weight:600;">Failed Emails (${failed}):</h3>
                <ul style="margin:0; padding-left:20px; font-size:13px; color:#7f1d1d; line-height:1.8;">
                  ${errors.map(err => `<li>${err.email}: ${err.error}</li>`).join('')}
                </ul>
              </div>
              ` : ''}

              <div style="margin-top:24px; padding:16px; background:#f0fdf4; border-left:4px solid #10b981; border-radius:8px;">
                <p style="margin:0; font-size:13px; color:#065f46;">
                  <strong>✅ Campaign completed!</strong> All emails have been sent. You can track engagement in your Resend dashboard.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="text-align:center; padding:12px 0;">
        <p style="margin:0; font-size:12px; color:#9ca3af;">
          Generated by Moneko Bulk Email Script<br/>
          ${new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send email via Resend
 */
async function sendEmail(to, subject, html, previewText = '') {
  try {
    // Add preview text to HTML if provided
    let emailHtml = html;
    if (previewText) {
      // Insert preview text at the beginning of the body
      emailHtml = html.replace(
        /<body([^>]*)>/i,
        `<body$1><div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</div>`
      );
    }

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    if (error) {
      throw error;
    }

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('\n🚀 Bulk Email Sender Script\n');
  console.log('='.repeat(60));

  // Parse arguments
  const config = parseArgs();

  // Validate configuration
  if (!RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY environment variable not set');
    console.error('   Add to your .env file: RESEND_API_KEY=re_your_key_here');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    process.exit(1);
  }

  // Load query and template
  let query, template;
  
  try {
    query = loadQuery(config.queryFile);
    template = loadTemplate(config.templateFile);
  } catch (error) {
    console.error(`❌ Error loading files: ${error.message}`);
    process.exit(1);
  }

  // Test mode
  if (config.testMode) {
    console.log('\n📧 TEST MODE ENABLED');
    console.log(`Test email will be sent to: ${config.testEmail}\n`);

    const testVariables = {
      first_name: 'Test User',
      email: config.testEmail,
      unsubscribe_url: `https://moneko.io/unsubscribe?email=${encodeURIComponent(
        config.testEmail,
      )}`,
    };

    const testHtml = replaceVariables(template, testVariables);
    const testSubject = 'Quick update from Yifan (Co-founder of Moneko)';
    const testPreviewText = 'We\'ve launched something special for our early members. Unlock lifetime access for you and a friend today.';

    console.log('Sending test email...');
    const result = await sendEmail(config.testEmail, testSubject, testHtml, testPreviewText);

    if (result.success) {
      console.log(`✅ Test email sent successfully! Email ID: ${result.id}`);
    } else {
      console.error(`❌ Failed to send test email: ${result.error}`);
    }

    process.exit(0);
  }

  // Production mode: load users from JSON file
  console.log('\n📊 Loading users from JSON file...\n');

  const usersJsonPath = path.join(__dirname, 'audiences.json');
  
  if (!fs.existsSync(usersJsonPath)) {
    console.error(`❌ Error: audiences.json file not found at ${usersJsonPath}`);
    console.error('   Please create scripts/audiences.json with your user list');
    console.error('   Expected format: [{"id": "...", "email": "...", "full_name": "..."}]');
    process.exit(1);
  }

  let userList;
  try {
    const usersJsonContent = fs.readFileSync(usersJsonPath, 'utf-8');
    userList = JSON.parse(usersJsonContent);
  } catch (error) {
    console.error(`❌ Error reading audiences.json: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(userList) || userList.length === 0) {
    console.log('⚠️  No users found in audiences.json');
    process.exit(0);
  }

  console.log(`Found ${userList.length} user(s)\n`);
  console.log('Sample users:');
  userList.slice(0, 5).forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.email} (${user.full_name || 'No name'})`);
  });

  if (userList.length > 5) {
    console.log(`  ... and ${userList.length - 5} more\n`);
  }

  // Confirmation prompt
  const confirmed = await promptConfirmation(
    `\n⚠️  Are you sure you want to send emails to ${userList.length} user(s)?`
  );

  if (!confirmed) {
    console.log('\n❌ Operation cancelled by user');
    process.exit(0);
  }

  // Send emails
  console.log('\n📤 Sending emails...\n');

  const campaignStartTime = Date.now();
  const campaignSubject = 'Quick update from Yifan (Co-founder of Moneko)';
  const campaignPreviewText = 'We\'ve launched something special for our early members. Unlock lifetime access for you and a friend today.';

  const results = {
    total: userList.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < userList.length; i++) {
    const user = userList[i];
    const firstName = getFirstName(user.full_name);

    const variables = {
      first_name: firstName,
      full_name: user.full_name || firstName,
      email: user.email,
      unsubscribe_url: `https://moneko.io/unsubscribe?email=${encodeURIComponent(user.email)}`,
    };

    const html = replaceVariables(template, variables);

    console.log(`[${i + 1}/${userList.length}] Sending to ${user.email}...`);

    const result = await sendEmail(user.email, campaignSubject, html, campaignPreviewText);

    if (result.success) {
      results.success++;
      console.log(`  ✅ Sent (ID: ${result.id})`);
    } else {
      results.failed++;
      results.errors.push({ email: user.email, error: result.error });
      console.log(`  ❌ Failed: ${result.error}`);
    }

    // Rate limiting
    if (i < userList.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total users:     ${results.total}`);
  console.log(`✅ Successful:   ${results.success}`);
  console.log(`❌ Failed:       ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nFailed emails:');
    results.errors.forEach((err) => {
      console.log(`  - ${err.email}: ${err.error}`);
    });
  }

  // Send summary report to admin
  console.log('\n📧 Sending summary report to admin...');
  
  const campaignEndTime = Date.now();
  const summaryHtml = generateSummaryReport(results, {
    subject: campaignSubject,
    startTime: campaignStartTime,
    endTime: campaignEndTime,
  });

  // Also send a copy of the actual campaign email to admin
  const adminVariables = {
    first_name: 'Yifan',
    full_name: 'Yifan Lim',
    email: ADMIN_EMAIL,
    unsubscribe_url: `https://moneko.io/unsubscribe?email=${encodeURIComponent(
      ADMIN_EMAIL,
    )}`,
  };
  const adminCampaignEmail = replaceVariables(template, adminVariables);

  // Wait before sending summary report to avoid rate limit
  await sleep(RATE_LIMIT_DELAY);
  
  // Send summary report
  const summaryResult = await sendEmail(
    ADMIN_EMAIL,
    `📊 Campaign Report: ${campaignSubject}`,
    summaryHtml
  );

  if (summaryResult.success) {
    console.log(`✅ Summary report sent to ${ADMIN_EMAIL}`);
  } else {
    console.log(`⚠️  Failed to send summary report: ${summaryResult.error}`);
  }

  // Send copy of campaign email
  await sleep(RATE_LIMIT_DELAY);
  const campaignCopyResult = await sendEmail(
    ADMIN_EMAIL,
    `[COPY] ${campaignSubject}`,
    adminCampaignEmail,
    campaignPreviewText
  );

  if (campaignCopyResult.success) {
    console.log(`✅ Campaign copy sent to ${ADMIN_EMAIL}`);
  } else {
    console.log(`⚠️  Failed to send campaign copy: ${campaignCopyResult.error}`);
  }

  console.log('\n✨ Done!\n');
}

// ============================================================================
// RUN SCRIPT
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
