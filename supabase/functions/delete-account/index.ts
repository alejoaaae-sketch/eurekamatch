import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create client with user's token to get user ID
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // Use service role client for deletion operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Delete blocked_users where user participates
    await adminClient
      .from('blocked_users')
      .delete()
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

    // 2. Delete matches_safe where user participates
    await adminClient
      .from('matches_safe')
      .delete()
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    // 3. Delete matches where user participates
    await adminClient
      .from('matches')
      .delete()
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    // 4. Delete picks where user is picker or picked
    await adminClient
      .from('picks')
      .delete()
      .eq('picker_id', userId)

    // Also nullify picked_user_id references
    await adminClient
      .from('picks')
      .update({ picked_user_id: null })
      .eq('picked_user_id', userId)

    // 5. Delete user_usage
    await adminClient
      .from('user_usage')
      .delete()
      .eq('user_id', userId)

    // 6. Delete user_roles
    await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    // 7. Delete email_verifications
    await adminClient
      .from('email_verifications')
      .delete()
      .eq('user_id', userId)

    // 8. Delete profile
    await adminClient
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    // 9. Delete auth user
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
      return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
