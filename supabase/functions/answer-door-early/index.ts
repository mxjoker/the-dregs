import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOCKED_REASONS = [
  "I was in my flop era",
  "I needed time to spiral privately",
  "I forgot this app existed (not a metaphor)",
  "I was collecting myself. still working on it",
  "ghost mode. no reason. classic me",
  "I was going to text first. I wasn't",
  "phone died. emotionally",
  "I thought you'd come back. you did",
  "life admin. all of it fake",
  "I was fine. I wasn't",
] as const;

interface AnswerDoorEarlyBody {
  match_id: string;
  reason: string;
}

Deno.serve(async (req: Request) => {
  console.log('answer-door-early called:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Verify JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    const body = await req.json() as AnswerDoorEarlyBody;
    const { match_id, reason } = body;

    if (!match_id) {
      return new Response(JSON.stringify({ error: 'match_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!reason) {
      return new Response(JSON.stringify({ error: 'reason is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate reason against the 10 locked strings (exact match)
    if (!(LOCKED_REASONS as readonly string[]).includes(reason)) {
      return new Response(JSON.stringify({ error: 'invalid reason' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve caller: auth_id → users.id → profiles.id
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRow) {
      return new Response(JSON.stringify({ error: 'User record not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userRow.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerProfileId = callerProfile.id;

    // Fetch the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, status, user_a_id, user_b_id, door_status, door_knocked_by')
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is a participant
    if (match.user_a_id !== callerProfileId && match.user_b_id !== callerProfileId) {
      return new Response(JSON.stringify({ error: 'User not in match' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Caller must NOT be door_knocked_by (cannot answer your own door)
    if (match.door_knocked_by === callerProfileId) {
      return new Response(JSON.stringify({ error: 'you cannot answer your own door' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // door_status must be 'knocking'
    if (match.door_status !== 'knocking') {
      return new Response(JSON.stringify({ error: 'door is not being knocked' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Open the door
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        door_status: 'open',
        door_opened_at: new Date().toISOString(),
        door_early_answer_reason: reason,
        status: 'door_open',
      })
      .eq('id', match_id);

    if (updateError) {
      console.error('Match update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update match', detail: updateError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert system message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        match_id,
        sender_id: callerProfileId,
        message_type: 'system',
        system_payload: { type: 'door_answered', reason },
      });

    if (msgError) {
      console.error('System message insert error:', msgError);
    }

    // TODO: push notifications — send push to knocker: "[Name] answered the door. apparently they were [reason]."

    return new Response(
      JSON.stringify({ door_open: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
