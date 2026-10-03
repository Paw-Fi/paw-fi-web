import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import {
  hashSenderVerificationToken,
  isValidSenderVerificationToken,
} from "../shared/email-sender-verification.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

// GET only hands off the fragment secret. Email link scanners cannot consume it.
function handoffPage() {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Verify sender | Moneko</title></head><body><main><h1>Verify your receipt sender</h1><p id="status">Opening Moneko to verify your sender...</p><p><a id="open">Open Moneko</a></p><button id="verify" type="button">Verify in this browser instead</button></main><script>
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
const status=document.getElementById('status');const button=document.getElementById('verify');
if(!/^[A-Za-z0-9_-]{43}$/.test(token)){status.textContent='This link is invalid. Request a new verification email in Moneko.';button.disabled=true;}
else{const app='moneko://verify-email-sender#'+token;document.getElementById('open').href=app;
button.onclick=async()=>{button.disabled=true;status.textContent='Verifying your sender...';try{const response=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const body=await response.json();status.textContent=body.success?'Your sender is verified. Your Moneko settings will update automatically.':body.error;button.disabled=body.success||response.status===400||response.status===410;}catch(_){status.textContent='We could not verify your sender. Please try again.';button.disabled=false;}};
location.replace(app);}
</script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      },
    },
  );
}

export async function handleSenderVerification(
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") return handoffPage();
  if (req.method !== "POST")
    return json(
      {
        success: false,
        code: "METHOD_NOT_ALLOWED",
        error: "Please open the verification link from your email.",
      },
      405,
    );
  let token: unknown;
  try {
    token = (await req.json())?.token;
  } catch {
    /* Invalid requests share the safe invalid-link response. */
  }
  if (!isValidSenderVerificationToken(token))
    return json(
      {
        success: false,
        code: "INVALID_VERIFICATION_LINK",
        error:
          "This verification link is invalid. Please request a new email in Moneko.",
      },
      400,
    );
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return json(
      {
        success: false,
        code: "SERVER_ERROR",
        error:
          "Sender verification is temporarily unavailable. Please try again later.",
      },
      503,
    );
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc(
      "confirm_email_import_sender_verification",
      { p_token_hash: await hashSenderVerificationToken(token) },
    );
    if (error) throw error;
    if (data?.status === "expired")
      return json(
        {
          success: false,
          code: "VERIFICATION_LINK_EXPIRED",
          error:
            "This verification link has expired. Please resend the verification email in Moneko.",
        },
        410,
      );
    if (data?.status !== "verified")
      return json(
        {
          success: false,
          code: "INVALID_VERIFICATION_LINK",
          error:
            "This verification link is no longer valid. Please request a new email in Moneko.",
        },
        400,
      );
    if (
      typeof data.userId !== "string" ||
      typeof data.sender?.id !== "string" ||
      data.sender.verified !== true
    ) {
      throw new Error("INVALID_VERIFICATION_RESULT");
    }
    return json({ success: true, data });
  } catch (_) {
    return json(
      {
        success: false,
        code: "SERVER_ERROR",
        error:
          "We couldn't verify your sender. Please try opening the link again.",
      },
      503,
    );
  }
}

if (import.meta.main) Deno.serve(handleSenderVerification);
