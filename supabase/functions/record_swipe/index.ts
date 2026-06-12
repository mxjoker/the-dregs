import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecordSwipeBody {
  swiped_id: string;
  action: 'like' | 'pass' | 'ick';
  targeted_flag_id?: string | null;
  but_why_tag?: string | null;
}

Deno.serve(async (req: Request) => {
  console.log('record_swipe called:', req.method, req.url);

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
    const body = await req.json() as RecordSwipeBody;
    const { swiped_id, action, targeted_flag_id = null, but_why_tag = null } = body;

    if (!swiped_id || !action) {
      return new Response(JSON.stringify({ error: 'swiped_id and action are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['like', 'pass', 'ick'].includes(action)) {
      return new Response(JSON.stringify({ error: 'action must be like, pass, or ick' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve swiper: auth_id → users.id → profiles.id
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

    const { data: swiperProfile, error: swiperProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userRow.id)
      .single();

    if (swiperProfileError || !swiperProfile) {
      return new Response(JSON.stringify({ error: 'Swiper profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const swiperId = swiperProfile.id;

    // Validate swiped profile
    const { data: swipedProfile, error: swipedError } = await supabase
      .from('profiles')
      .select('id, is_visible, vibe_check_passed')
      .eq('id', swiped_id)
      .single();

    if (swipedError || !swipedProfile) {
      return new Response(JSON.stringify({ error: 'Swiped profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!swipedProfile.is_visible || !swipedProfile.vibe_check_passed) {
      return new Response(JSON.stringify({ error: 'Profile is not available' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Daily swipe limit (free tier: 20/day), skippable via env var
    const disableSwipeLimit = Deno.env.get('DISABLE_SWIPE_LIMIT') === 'true';
    if (!disableSwipeLimit) {
      const today = new Date().toISOString().split('T')[0];
      const { count, error: countError } = await supabase
        .from('swipes')
        .select('id', { count: 'exact', head: true })
        .eq('swiper_id', swiperId)
        .gte('swiped_at', `${today}T00:00:00.000Z`);

      if (countError) {
        console.error('Swipe count error:', countError);
      } else if ((count ?? 0) >= 20) {
        return new Response(JSON.stringify({ swipe_limit_reached: true }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Upsert swipe row
    const { error: swipeError } = await supabase
      .from('swipes')
      .upsert(
        { swiper_id: swiperId, swiped_id, action, targeted_flag_id, but_why_tag },
        { onConflict: 'swiper_id,swiped_id' }
      );

    if (swipeError) {
      console.error('Swipe upsert error:', swipeError);
      return new Response(JSON.stringify({ error: 'Failed to record swipe', detail: swipeError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Side effects
    if (action === 'ick' && targeted_flag_id) {
      const { error: ickError } = await supabase.rpc('increment_ick_count', {
        p_profile_id: swiped_id,
        p_flag_id: targeted_flag_id,
      });
      if (ickError) console.error('increment_ick_count error:', ickError);
    }

    if (action === 'like' && but_why_tag) {
      const { error: butWhyError } = await supabase.rpc('increment_but_why', {
        p_profile_id: swiped_id,
        p_tag_slug: but_why_tag,
      });
      if (butWhyError) console.error('increment_but_why error:', butWhyError);
    }

    // Check for mutual like → create match
    if (action === 'like') {
      const { data: reciprocal, error: reciprocalError } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', swiped_id)
        .eq('swiped_id', swiperId)
        .eq('action', 'like')
        .maybeSingle();

      if (reciprocalError) {
        console.error('Reciprocal check error:', reciprocalError);
      }

      if (reciprocal) {
        // Insert match with user_a < user_b constraint
        const userA = swiperId < swiped_id ? swiperId : swiped_id;
        const userB = swiperId < swiped_id ? swiped_id : swiperId;

        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .upsert(
            { user_a_id: userA, user_b_id: userB },
            { onConflict: 'user_a_id,user_b_id', ignoreDuplicates: true }
          )
          .select('id')
          .single();

        if (matchError) {
          console.error('Match insert error:', matchError);
          // Still return recorded: true even if match insert fails
          return new Response(JSON.stringify({ recorded: true, matched: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let matchId: string | null = matchData?.id ?? null;
        if (!matchId) {
          // Duplicate — fetch the existing match ID
          const { data: existing } = await supabase
            .from('matches')
            .select('id')
            .eq('user_a_id', userA)
            .eq('user_b_id', userB)
            .single();
          matchId = existing?.id ?? null;
        }

        if (!matchId) {
          return new Response(JSON.stringify({ error: 'Failed to resolve match id' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Compute shared flags
        const { data: flagsA } = await supabase
          .from('profile_red_flags')
          .select('red_flag_id, red_flags(id, label)')
          .eq('profile_id', swiperId);

        const { data: flagsB } = await supabase
          .from('profile_red_flags')
          .select('red_flag_id, red_flags(id, label)')
          .eq('profile_id', swiped_id);

        const flagIdsA = new Set((flagsA ?? []).map((r: any) => r.red_flag_id));
        const sharedFlags = (flagsB ?? [])
          .filter((r: any) => flagIdsA.has(r.red_flag_id))
          .map((r: any) => ({ id: r.red_flags.id, label: r.red_flags.label }));

        return new Response(
          JSON.stringify({
            recorded: true,
            matched: true,
            match_id: matchId,
            shared_flags: sharedFlags,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    return new Response(
      JSON.stringify({ recorded: true, matched: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
