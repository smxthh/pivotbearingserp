import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { userId } = await req.json()

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get the authorization header to verify the caller
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Authorization header is required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create admin client with service role key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        // Create regular client to verify caller is superadmin
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // Get the current user
        const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !caller) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized - Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify caller is superadmin
        const { data: callerRole, error: roleError } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', caller.id)
            .single()

        if (roleError || callerRole?.role !== 'superadmin') {
            return new Response(
                JSON.stringify({ error: 'Only superadmin can permanently delete users' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Prevent self-deletion
        if (userId === caller.id) {
            return new Response(
                JSON.stringify({ error: 'Cannot delete your own account' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Superadmin ${caller.email} deleting user: ${userId}`)

        // Step 1: Delete user_roles
        const { error: rolesDeleteError } = await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', userId)

        if (rolesDeleteError) {
            console.error('Error deleting user roles:', rolesDeleteError)
        }

        // Step 2: Delete user_invitations (if any)
        await supabaseAdmin
            .from('user_invitations')
            .delete()
            .eq('email', (await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.email || '')

        // Step 3: Delete profile
        const { error: profileDeleteError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId)

        if (profileDeleteError) {
            console.error('Error deleting profile:', profileDeleteError)
        }

        // Step 4: Permanently delete from auth.users - THIS IS THE KEY STEP
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authDeleteError) {
            console.error('Error deleting auth user:', authDeleteError)
            return new Response(
                JSON.stringify({ error: `Failed to delete user from auth: ${authDeleteError.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`User ${userId} permanently deleted from auth.users`)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'User permanently deleted. They cannot log in again with the same credentials.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: unknown) {
        console.error('Error in delete-user:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
