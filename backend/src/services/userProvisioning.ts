import type { User } from '@supabase/supabase-js'

import { supabaseAdmin } from '../config/supabase.js'

type ProvisionedUser = {
  u_id: string
  u_email: string
  u_name: string | null
  u_created_at: string
}

/**
 * Ensures a user record exists in public.users for the given Supabase auth user.
 * This is idempotent - if the user already exists, it updates their email/name if needed.
 *
 * @param authUser - The Supabase auth user object
 * @returns The user record from public.users
 * @throws Error if provisioning fails
 */
export async function provisionUser(authUser: User): Promise<ProvisionedUser> {
  if (!supabaseAdmin) {
    const error = new Error('Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.')
    error.name = 'ConfigurationError'
    ;(error as { status?: number }).status = 500
    throw error
  }

  const userId = authUser.id
  const email = authUser.email
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    email ??
    null

  if (!email) {
    const error = new Error('User email is required for provisioning.')
    error.name = 'UserProvisioningError'
    ;(error as { status?: number }).status = 400
    throw error
  }

  // Check if user already exists
  const { data: existingUser, error: selectError } = await supabaseAdmin
    .from('users')
    .select('u_id, u_email, u_name, u_created_at')
    .eq('u_id', userId)
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') {
    const wrapped = new Error(`Failed to check existing user: ${selectError.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = selectError
    throw wrapped
  }

  if (existingUser) {
    // User exists - update email/name if they've changed
    const needsUpdate = existingUser.u_email !== email || existingUser.u_name !== name

    if (needsUpdate) {
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          u_email: email,
          u_name: name,
        })
        .eq('u_id', userId)
        .select('u_id, u_email, u_name, u_created_at')
        .single()

      if (updateError) {
        const wrapped = new Error(`Failed to update user: ${updateError.message}`)
        wrapped.name = 'SupabaseMutationError'
        ;(wrapped as { cause?: unknown }).cause = updateError
        throw wrapped
      }

      return updatedUser
    }

    return existingUser
  }

  // User doesn't exist - create new record
  const { data: newUser, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      u_id: userId,
      u_email: email,
      u_name: name,
    })
    .select('u_id, u_email, u_name, u_created_at')
    .single()

  if (insertError) {
    // Handle unique constraint violation (email already exists with different u_id)
    if (insertError.code === '23505') {
      const error = new Error(
        `User with email ${email} already exists with a different ID. This indicates a data inconsistency.`,
      )
      error.name = 'UserProvisioningError'
      ;(error as { status?: number }).status = 409
      ;(error as { details?: unknown }).details = { email, userId }
      throw error
    }

    const wrapped = new Error(`Failed to create user: ${insertError.message}`)
    wrapped.name = 'SupabaseMutationError'
    ;(wrapped as { cause?: unknown }).cause = insertError
    throw wrapped
  }

  return newUser
}

