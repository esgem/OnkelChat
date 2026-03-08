import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invite } = await supabase
    .from('invite_tokens')
    .select('group_id, expires_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite link has expired' }, { status: 410 })
  }

  // Check already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', invite.group_id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('group_members').insert({
      group_id: invite.group_id,
      user_id: user.id,
      role: 'member',
    })

    await supabase
      .from('invite_tokens')
      .update({ used_count: supabase.rpc('increment', { x: 1 }) })
      .eq('token', token)
  }

  const { data: group } = await supabase
    .from('groups')
    .select('slug')
    .eq('id', invite.group_id)
    .single()

  return NextResponse.json({ slug: group?.slug })
}
