import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

interface RequestBody {
  messageId: string;
  userId: string;
  helpful: boolean;
  rating?: number;
  comment?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { messageId, userId, helpful, rating, comment }: RequestBody = await req.json()

    if (!messageId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: messageId and userId' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    // Store feedback
    const { error } = await supabaseClient
      .from('conversation_feedback')
      .insert({
        message_id: messageId,
        user_id: userId,
        helpful,
        rating: rating || (helpful ? 5 : 1),
        comment,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    console.log(`Stored conversation feedback for message ${messageId}: ${helpful ? 'helpful' : 'not helpful'}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback recorded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Conversation feedback error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred while recording feedback',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
