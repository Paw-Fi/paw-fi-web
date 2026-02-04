# Quick Start Guide - Bulk Email Sender

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This will install the `resend` package and other dependencies.

### Step 2: Configure Environment Variables

Add the following to your `.env` file:

```env
# Resend Email API
RESEND_API_KEY=re_your_actual_key_here
FROM_EMAIL=noreply@pawfi.app
FROM_NAME=Paw-Fi Team

# Supabase (should already be set)
VITE_SUPABASE_URL=https://qbuynyxyemigtnvdujts.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Get your Resend API key:** https://resend.com/api-keys

**Verify your domain:** https://resend.com/domains

## ✅ Test Your Setup

Send a test email to yourself:

```bash
npm run email:test your-email@example.com
```

Or with the full command:

```bash
node scripts/send-bulk-emails.js --test your-email@example.com
```

You should see:
```
🚀 Bulk Email Sender Script
============================================================

📧 TEST MODE ENABLED
Test email will be sent to: your-email@example.com

Sending test email...
✅ Test email sent successfully! Email ID: abc123...
```

## 📧 Send Production Emails

### Option 1: Use Default Settings

Send to all users with no subscription or cancelled free plan:

```bash
npm run email:send
```

### Option 2: Custom Query and Template

```bash
node scripts/send-bulk-emails.js \
  --query-file ./scripts/queries/inactive-users.sql \
  --template ./scripts/email-templates/default-template.html
```

### What Happens:

1. Script fetches users from database
2. Shows you a preview of who will receive emails
3. Asks for confirmation: `Are you sure you want to send emails to X user(s)? (yes/no):`
4. Type `yes` to proceed
5. Sends emails with rate limiting
6. Shows summary report

## 📝 Create Custom Templates

### 1. Copy the default template:

```bash
cp scripts/email-templates/default-template.html \
   scripts/email-templates/my-campaign.html
```

### 2. Edit your template:

Available variables:
- `{{first_name}}` - User's first name
- `{{full_name}}` - User's full name
- `{{email}}` - User's email
- `{{unsubscribe_url}}` - Unsubscribe link

### 3. Test your template:

```bash
node scripts/send-bulk-emails.js \
  --test your-email@example.com \
  --template ./scripts/email-templates/my-campaign.html
```

## 🎯 Create Custom Queries

### 1. Create a new query file:

```bash
nano scripts/queries/my-custom-query.sql
```

### 2. Write your SQL query:

```sql
SELECT DISTINCT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.created_at
FROM auth.users u
WHERE 
  u.email IS NOT NULL
  AND u.email_confirmed_at IS NOT NULL
  -- Add your custom conditions here
ORDER BY u.created_at DESC;
```

### 3. Use your query:

```bash
node scripts/send-bulk-emails.js \
  --query-file ./scripts/queries/my-custom-query.sql
```

## 🔍 Pre-made Queries

### Free Plan Users (Default)
```bash
node scripts/send-bulk-emails.js \
  --query-file ./scripts/queries/free-plan-users.sql
```

### Inactive Users (30+ days)
```bash
node scripts/send-bulk-emails.js \
  --query-file ./scripts/queries/inactive-users.sql
```

## ⚠️ Important Notes

### Rate Limits

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month

The script has built-in rate limiting (10 emails/second) to avoid API throttling.

### Best Practices

1. **Always test first**: Use `--test` mode before production
2. **Start small**: Test with a subset of users first
3. **Include unsubscribe**: Template includes unsubscribe link
4. **Monitor results**: Check the summary report after sending
5. **Respect regulations**: Comply with CAN-SPAM, GDPR, etc.

### Safety Features

✅ Test mode for verification
✅ Confirmation prompt before sending
✅ Preview of target users
✅ Rate limiting to avoid throttling
✅ Error logging and reporting
✅ Summary statistics

## 🐛 Troubleshooting

### "RESEND_API_KEY environment variable not set"
→ Add to your `.env` file:
```env
RESEND_API_KEY=re_your_actual_key_here
```

### "SUPABASE_SERVICE_ROLE_KEY not set"
→ Add to your `.env` file:
```env
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

### "Query file not found"
→ Check the file path is correct:
```bash
ls -la scripts/queries/
```

### "Failed to send email"
→ Verify:
1. API key is valid
2. Sender email is verified in Resend
3. You haven't exceeded rate limits

## 📚 Full Documentation

For detailed documentation, see: `scripts/README-bulk-emails.md`

## 🎉 Example Workflow

```bash
# 1. Create your campaign template
cp scripts/email-templates/default-template.html \
   scripts/email-templates/spring-sale.html

# 2. Edit the template
nano scripts/email-templates/spring-sale.html

# 3. Test it
npm run email:test your-email@example.com -- \
  --template ./scripts/email-templates/spring-sale.html

# 4. Check your inbox and verify it looks good

# 5. Send to production
node scripts/send-bulk-emails.js \
  --template ./scripts/email-templates/spring-sale.html

# 6. Confirm when prompted
# Type: yes

# 7. Monitor the progress and check the summary
```

## 💡 Pro Tips

1. **Use UTM parameters** in your links for tracking:
   ```html
   <a href="https://pawfi.app/pricing?utm_source=email&utm_campaign=spring_sale">
   ```

2. **Segment your audience** with custom SQL queries

3. **A/B test** by creating multiple templates and sending to different segments

4. **Track results** in your analytics platform using UTM parameters

5. **Follow up** with non-openers after a few days

## 🆘 Need Help?

- Resend Documentation: https://resend.com/docs
- Supabase Documentation: https://supabase.com/docs
- Check error logs in the script output
- Review `scripts/README-bulk-emails.md` for detailed info

---

**Happy emailing! 📧✨**
