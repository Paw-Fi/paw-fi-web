# Bulk Email Sender Script

A reusable Node.js script for sending personalized bulk emails to Supabase users via Resend API.

## Features

- ✅ **Test Mode**: Send test emails to verify template and configuration
- ✅ **Custom SQL Queries**: Use migration scripts to define target user lists
- ✅ **HTML Templates**: Separate template files with variable substitution
- ✅ **Rate Limiting**: Built-in delays to avoid API throttling
- ✅ **Confirmation Prompt**: Double-check before sending to all users
- ✅ **Error Handling**: Detailed logging and error reporting
- ✅ **Personalization**: Automatically extracts user names from Supabase auth

## Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js resend
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Resend Email API
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@pawfi.app
FROM_NAME=Paw-Fi Team

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get your Resend API key from: https://resend.com/api-keys
Verify your sender domain at: https://resend.com/domains

## Usage

### Test Mode (Recommended First)

Send a test email to verify everything works:

```bash
node scripts/send-bulk-emails.js --test your-email@example.com
```

This will:
- Use the default template
- Send to your test email
- Show you exactly what recipients will receive

### Production Mode with Default Query

Send to users with no subscription or cancelled free plan:

```bash
node scripts/send-bulk-emails.js
```

### Custom Query and Template

Use your own SQL query and HTML template:

```bash
node scripts/send-bulk-emails.js \
  --query-file ./scripts/queries/inactive-users.sql \
  --template ./scripts/email-templates/custom-template.html
```

## File Structure

```
scripts/
├── send-bulk-emails.js           # Main script
├── README-bulk-emails.md         # This file
├── email-templates/
│   ├── default-template.html     # Default email template
│   └── custom-template.html      # Your custom templates
└── queries/
    ├── free-plan-users.sql       # Users with no/cancelled subscription
    ├── inactive-users.sql        # Users inactive for 30+ days
    └── custom-query.sql          # Your custom queries
```

## Creating Custom Templates

Templates support variable substitution using `{{variable_name}}` syntax.

### Available Variables

- `{{first_name}}` - User's first name (extracted from full_name)
- `{{full_name}}` - User's complete name
- `{{email}}` - User's email address
- `{{unsubscribe_url}}` - Unsubscribe link

### Example Template

```html
<!DOCTYPE html>
<html>
<head>
    <title>Email Title</title>
</head>
<body>
    <h1>Hi {{first_name}}!</h1>
    <p>Your email is: {{email}}</p>
    <a href="{{unsubscribe_url}}">Unsubscribe</a>
</body>
</html>
```

## Creating Custom Queries

SQL queries should return these columns:

- `id` - User ID (UUID)
- `email` - User email address (required)
- `full_name` - User's full name (optional)
- `created_at` - Account creation date (optional)

### Example Query

```sql
SELECT DISTINCT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.created_at
FROM auth.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
WHERE 
  u.email IS NOT NULL
  AND u.email_confirmed_at IS NOT NULL
  AND s.plan_id = 'free'
ORDER BY u.created_at DESC;
```

## Rate Limiting

The script includes built-in rate limiting (100ms delay between emails = 10 emails/second).

To adjust, edit `RATE_LIMIT_DELAY` in the script:

```javascript
const RATE_LIMIT_DELAY = 200; // 200ms = 5 emails per second
```

## Safety Features

1. **Test Mode**: Always test first before production
2. **Confirmation Prompt**: Script asks for confirmation before sending
3. **User Preview**: Shows sample users before sending
4. **Error Logging**: Tracks failed emails with error messages
5. **Summary Report**: Displays success/failure statistics

## Example Workflow

### 1. Create Your Template

```bash
cp scripts/email-templates/default-template.html scripts/email-templates/my-campaign.html
# Edit my-campaign.html with your content
```

### 2. Create Your Query (Optional)

```bash
# Create a new query file
nano scripts/queries/my-target-users.sql
```

### 3. Test Your Email

```bash
node scripts/send-bulk-emails.js \
  --test your-email@example.com \
  --template ./scripts/email-templates/my-campaign.html
```

### 4. Review Test Email

Check your inbox and verify:
- ✅ Template renders correctly
- ✅ Variables are replaced properly
- ✅ Links work correctly
- ✅ Unsubscribe link is present

### 5. Send to Production

```bash
node scripts/send-bulk-emails.js \
  --query-file ./scripts/queries/my-target-users.sql \
  --template ./scripts/email-templates/my-campaign.html
```

### 6. Confirm When Prompted

```
Found 150 user(s)

Sample users:
  1. user1@example.com (John Doe)
  2. user2@example.com (Jane Smith)
  ... and 148 more

⚠️  Are you sure you want to send emails to 150 user(s)? (yes/no):
```

Type `yes` to proceed.

## Troubleshooting

### "Query file not found"

Ensure the path to your query file is correct:

```bash
# Use absolute path
node scripts/send-bulk-emails.js --query-file /full/path/to/query.sql

# Or relative path from project root
node scripts/send-bulk-emails.js --query-file ./scripts/queries/my-query.sql
```

### "Template file not found"

Check your template path:

```bash
ls -la scripts/email-templates/
```

### "Database query error"

Verify your `SUPABASE_SERVICE_ROLE_KEY` is set:

```bash
echo $SUPABASE_SERVICE_ROLE_KEY
```

### "Failed to send email"

Check your Resend API key and sender email:
1. Verify API key is valid at https://resend.com/api-keys
2. Ensure sender email is verified in Resend dashboard
3. Check Resend API limits and quotas

## Best Practices

1. **Always Test First**: Use `--test` mode before production
2. **Start Small**: Test with a small subset of users first
3. **Monitor Results**: Check the summary report after sending
4. **Respect Users**: Include clear unsubscribe links
5. **Follow Regulations**: Comply with CAN-SPAM, GDPR, etc.
6. **Track Campaigns**: Use UTM parameters in links for analytics
7. **Avoid Spam**: Don't send too frequently or to unengaged users

## Resend API Limits

Free tier limits (as of 2025):
- 100 emails/day
- 3,000 emails/month

For larger campaigns, upgrade your Resend plan.

## Support

For issues or questions:
- Check Resend docs: https://resend.com/docs
- Check Supabase docs: https://supabase.com/docs
- Review error logs in the script output

## License

This script is part of the Paw-Fi project and follows the same license.
