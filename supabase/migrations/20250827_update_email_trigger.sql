-- Add UPDATE trigger for users table to handle welcome emails on first login after verification
-- This supplements the existing INSERT trigger by listening for when users first log in

-- Update the existing email trigger function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION send_email_notification()
RETURNS TRIGGER AS $$
DECLARE
  email_payload JSONB;
  response_id BIGINT;
BEGIN
  -- Handle users table INSERT (no longer sends welcome email immediately)
  IF TG_TABLE_NAME = 'users' AND TG_OP = 'INSERT' AND NEW.email IS NOT NULL THEN
    -- Log user creation but don't send welcome email yet
    RAISE LOG 'User created: %, skipping welcome email until verified', NEW.email;
    RETURN NEW;
  END IF;

  -- Handle users table UPDATE (send welcome email on first login after verification)
  IF TG_TABLE_NAME = 'users' AND TG_OP = 'UPDATE' AND NEW.email IS NOT NULL THEN
    -- Check if this is the first login (last_login changed from NULL to a timestamp)
    IF OLD.last_login IS NULL AND NEW.last_login IS NOT NULL THEN
      RAISE LOG 'First login detected for user: %, triggering welcome email check', NEW.email;
      
      -- Prepare payload for edge function to handle verification check and email sending
      email_payload := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'users',
        'record', row_to_json(NEW)::jsonb,
        'old_record', row_to_json(OLD)::jsonb,
        'schema', TG_TABLE_SCHEMA
      );

      -- Send to edge function for processing
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

  -- Handle subscription updates (existing functionality)
  IF TG_TABLE_NAME = 'subscriptions' AND TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Get user email
    SELECT email, full_name INTO email_payload
    FROM users 
    WHERE id = NEW.user_id;
    
    IF FOUND THEN
      email_payload := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'subscriptions',
        'record', row_to_json(NEW)::jsonb,
        'old_record', row_to_json(OLD)::jsonb,
        'schema', TG_TABLE_SCHEMA
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS users_email_update_trigger ON users;

-- Create UPDATE trigger for users table
CREATE TRIGGER users_email_update_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_email_notification();

-- Note: The INSERT trigger should already exist from the previous migration
-- But let's ensure it exists with the updated function
DROP TRIGGER IF EXISTS users_email_trigger ON users;
CREATE TRIGGER users_email_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_email_notification();