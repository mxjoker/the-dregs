import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Scoring types ────────────────────────────────────────────────────────────

interface Candidate {
  profile_id: string;
  chaos_score: number;
  shared_flag_count: number;
  days_since_update: number;
  desperation_boost_eligible: boolean;
  desperation_boost_activated_at: string | null;
}

function scoreCandidate(candidate: Candidate, seenThisSession: Set<string>): number {
  const chaos_affinity    = Math.min(30, Math.floor(candidate.chaos_score * 0.30));
  const shared_flags      = Math.min(10, candidate.shared_flag_count * 2);
  const freshness         = Math.max(0, 10 - Math.floor(candidate.days_since_update / 7));
  const seen_penalty      = seenThisSession.has(candidate.profile_id) ? -15 : 0;
  const desperation_boost = (
    candidate.desperation_boost_eligible &&
    candidate.desperation_boost_activated_at !== null
  ) ? 25 : 0;
  const jitter = Math.floor(Math.random() * 20);

  return chaos_affinity + shared_flags + freshness + seen_penalty + desperation_boost + jitter;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Verify JWT and resolve user_id
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    const body = await req.json();
    const {
      viewer_id,
      max_distance_km   = 50,
      min_age           = 18,
      max_age           = 99,
      relationship_structure = null,
      already_served_ids = [],
    } = body as {
      viewer_id: string;
      max_distance_km?: number;
      min_age?: number;
      max_age?: number;
      relationship_structure?: string | null;
      already_served_ids?: string[];
    };

    if (!viewer_id) {
      return new Response(JSON.stringify({ error: 'viewer_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify viewer profile exists and passed vibe check
    const { data: viewerProfile, error: viewerError } = await supabase
      .from('profiles')
      .select('id, vibe_check_passed, onboarding_step, location')
      .eq('id', viewer_id)
      .single();

    if (viewerError || !viewerProfile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!viewerProfile.vibe_check_passed) {
      return new Response(JSON.stringify({ error: 'Vibe check not passed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (viewerProfile.onboarding_step !== 'complete') {
      return new Response(JSON.stringify({ error: 'Onboarding incomplete' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute date bounds for age filter
    const now = new Date();
    const minDob = new Date(now.getFullYear() - max_age, now.getMonth(), now.getDate())
      .toISOString().split('T')[0];
    const maxDob = new Date(now.getFullYear() - min_age, now.getMonth(), now.getDate())
      .toISOString().split('T')[0];

    const maxDistM = max_distance_km * 1000;

    // Run eligibility query
    // Uses service role so bypasses RLS — block check is explicit in SQL.
    // PostGIS ST_Distance used only if viewer has a location set.
    const { data: candidates, error: queryError } = await supabase.rpc(
      'get_discover_candidates',
      {
        p_viewer_id:              viewer_id,
        p_max_dist_m:             maxDistM,
        p_min_dob:                minDob,
        p_max_dob:                maxDob,
        p_rel_filter:             relationship_structure,
        p_already_served_ids:     already_served_ids,
        p_page_size:              200,
      }
    );

    if (queryError) {
      console.error('Eligibility query error:', queryError);
      return new Response(JSON.stringify({ error: 'Query failed', detail: queryError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ profile_ids: [], total_eligible: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Score and rank
    const seenThisSession = new Set<string>(already_served_ids);
    const scored = (candidates as Candidate[])
      .map(c => ({ ...c, score: scoreCandidate(c, seenThisSession) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return new Response(
      JSON.stringify({
        profile_ids:    scored.map(c => c.profile_id),
        total_eligible: candidates.length,
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
