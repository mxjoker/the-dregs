import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecordDoorKnockBody {
  match_id: string;
  tap_count: number;
}

Deno.serve(async (req: Request) => {
  console.log('record-door-knock called:', req.method, req.url);

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
    const body = await req.json() as RecordDoorKnockBody;
    const { match_id, tap_count } = body;

    if (!match_id) {
      return new Response(JSON.stringify({ error: 'match_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Number.isInteger(tap_count) || tap_count < 1 || tap_count > 200) {
      return new Response(JSON.stringify({ error: 'tap_count must be an integer between 1 and 200' }), {
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
      .select('id, status, user_a_id, user_b_id, door_status, door_knocked_by, door_knock_count, door_knock_target')
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

    // Reject if door already open
    if (match.door_status === 'open') {
      return new Response(JSON.stringify({ error: 'door already open' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify eligibility: match.status='expired' OR door_status='knocking'
    if (match.status !== 'expired' && match.door_status !== 'knocking') {
      return new Response(JSON.stringify({ error: 'match not eligible for knocking' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine new knock target and status for first knock
    let knockTarget: number = match.door_knock_target;
    let doorStatus: string = match.door_status;
    let doorKnockedBy: string = match.door_knocked_by;

    if (match.door_status === 'closed') {
      // First knock: set door_status='knocking', door_knocked_by=caller, pick target
      // 60% chance: uniform random in [300, 500]; else uniform random in [200, 800]
      if (Math.random() < 0.6) {
        knockTarget = Math.floor(Math.random() * (500 - 300 + 1)) + 300;
      } else {
        knockTarget = Math.floor(Math.random() * (800 - 200 + 1)) + 200;
      }
      doorStatus = 'knocking';
      doorKnockedBy = callerProfileId;
    }

    // New count after this batch of taps
    const newKnockCount = match.door_knock_count + tap_count;

    // Determine if door opens
    const doorOpens = newKnockCount >= knockTarget;

    // Build the match update
    const matchUpdate: Record<string, unknown> = {
      door_status: doorOpens ? 'open' : doorStatus,
      door_knocked_by: doorKnockedBy,
      door_knock_count: newKnockCount,
      door_knock_target: knockTarget,
    };

    if (doorOpens) {
      matchUpdate.door_opened_at = new Date().toISOString();
      matchUpdate.status = 'door_open';
    }

    const { error: updateError } = await supabase
      .from('matches')
      .update(matchUpdate)
      .eq('id', match_id);

    if (updateError) {
      console.error('Match update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update match', detail: updateError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert system message if door opened
    if (doorOpens) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          match_id,
          sender_id: callerProfileId,
          message_type: 'system',
          system_payload: { type: 'door_opened' },
        });
      if (msgError) console.error('System message insert error:', msgError);
    }

    // Award DP: reason 'door_knock', daily cap of 20 shared via knock_taps_today
    const today = new Date().toISOString().split('T')[0];

    const { data: dailyRow, error: dailyFetchError } = await supabase
      .from('desperation_points_daily_actions')
      .select('knock_taps_today')
      .eq('user_id', userRow.id)
      .eq('action_date', today)
      .maybeSingle();

    if (dailyFetchError) {
      console.error('Daily actions fetch error:', dailyFetchError);
    }

    const knockTapsToday = dailyRow?.knock_taps_today ?? 0;
    const dpAwarded = Math.max(0, Math.min(tap_count, 20 - knockTapsToday));

    // Upsert daily actions row, incrementing knock_taps_today by the award
    const { error: dailyUpsertError } = await supabase
      .from('desperation_points_daily_actions')
      .upsert(
        {
          user_id: userRow.id,
          action_date: today,
          knock_taps_today: knockTapsToday + dpAwarded,
        },
        { onConflict: 'user_id,action_date' }
      );

    if (dailyUpsertError) {
      console.error('Daily actions upsert error:', dailyUpsertError);
    }

    // Insert ledger entry only when award > 0 (DB trigger maintains balance)
    if (dpAwarded > 0) {
      const { error: ledgerError } = await supabase
        .from('desperation_points_ledger')
        .insert({
          user_id: userRow.id,
          delta: dpAwarded,
          reason: 'door_knock',
        });
      if (ledgerError) console.error('Ledger insert error:', ledgerError);
    }

    // TODO: push notifications — send "still knocking" push to other participant when door is knocking; send "door opened" push to both when door_opens

    const finalDoorStatus = doorOpens ? 'open' : doorStatus;

    return new Response(
      JSON.stringify({
        door_status: finalDoorStatus,
        knock_count: newKnockCount,
        knock_target: knockTarget,
        dp_awarded: dpAwarded,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
