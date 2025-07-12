-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send email via edge function
CREATE OR REPLACE FUNCTION send_email_notification()
RETURNS TRIGGER AS $$
DECLARE
  email_payload JSONB;
  response_id BIGINT;
BEGIN
  -- Example: Send welcome email when user is created
  IF TG_TABLE_NAME = 'users' AND TG_OP = 'INSERT' AND NEW.email IS NOT NULL THEN
    email_payload := jsonb_build_object(
      'type', 'template',
      'email', NEW.email,
      'name', COALESCE(NEW.full_name, 'New User'),
      'template', jsonb_build_object(
        'subject', 'Welcome to Moneko!',
        'html', '<h1>Welcome to Moneko!</h1><p>Hi ' || COALESCE(NEW.full_name, '') || ',</p><p>Welcome to Moneko! We''re excited to help you take control of your financial future.</p>',
        'text', 'Welcome to Moneko! Hi ' || COALESCE(NEW.full_name, '') || ', Welcome to Moneko! We''re excited to help you take control of your financial future.'
      )
    );

    -- Make HTTP request to send-email edge function
    SELECT INTO response_id net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := email_payload
    );
  END IF;

  -- Example: Send notification when subscription is updated
  IF TG_TABLE_NAME = 'subscriptions' AND TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Get user email
    SELECT email, full_name INTO email_payload
    FROM users 
    WHERE id = NEW.user_id;
    
    IF FOUND THEN
      email_payload := jsonb_build_object(
        'type', 'template',
        'email', (email_payload->>'email'),
        'name', COALESCE((email_payload->>'full_name'), ''),
        'template', jsonb_build_object(
          'subject', 'Subscription Status Update',
          'html', '<h1>Subscription Update</h1><p>Hi ' || COALESCE((email_payload->>'full_name'), '') || ',</p><p>Your subscription status has been updated to: ' || NEW.status || '</p>',
          'text', 'Hi ' || COALESCE((email_payload->>'full_name'), '') || ', Your subscription status has been updated to: ' || NEW.status
        )
      );

      SELECT INTO response_id net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := email_payload
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for different tables
CREATE TRIGGER users_email_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_email_notification();

CREATE TRIGGER subscriptions_email_trigger
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION send_email_notification();

-- Set required settings (you'll need to update these with your actual values)
-- These should be set in your Supabase dashboard under Settings > Database > Extensions
-- Or via SQL in the SQL editor:
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';