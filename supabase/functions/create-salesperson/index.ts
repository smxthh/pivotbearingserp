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
    const { email, password, tenantId, companyName, inviterEmail } = await req.json()

    if (!email || !password || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log(`Creating salesperson account for: ${email}`)

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase())

    let userId: string

    if (existingUser) {
      console.log(`User already exists with id: ${existingUser.id}`)
      userId = existingUser.id

      // Update the password for existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
      })

      if (updateError) {
        console.error('Error updating user password:', updateError)
        throw updateError
      }

      // Delete existing roles for this user to reassign
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    } else {
      // Create new user with the provided password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // Auto-confirm email
      })

      if (createError) {
        console.error('Error creating user:', createError)
        throw createError
      }

      if (!newUser.user) {
        throw new Error('User creation failed - no user returned')
      }

      userId = newUser.user.id
      console.log(`Created new user with id: ${userId}`)

      // Create profile entry
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, email: email.toLowerCase() }, { onConflict: 'id' })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    // Assign salesperson role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'salesperson',
        tenant_id: tenantId,
      })

    if (roleError) {
      console.error('Error assigning role:', roleError)
      throw roleError
    }

    console.log(`Assigned salesperson role to user: ${userId}`)

    // Delete any existing invitations for this email
    await supabaseAdmin
      .from('user_invitations')
      .delete()
      .eq('email', email.toLowerCase())

    // Create a record in user_invitations to track the invitation (marked as accepted)
    await supabaseAdmin
      .from('user_invitations')
      .insert({
        email: email.toLowerCase(),
        role: 'salesperson',
        inviter_id: tenantId, // Use tenant_id as inviter for simplicity
        tenant_id: tenantId,
        accepted_at: new Date().toISOString(),
      })

    console.log(`Salesperson ${email} created and role assigned successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        message: `Salesperson account created for ${email}. They can now log in with the provided password.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error in create-salesperson:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create salesperson'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
