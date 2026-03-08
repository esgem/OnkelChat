import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GroupSettings } from '@/components/groups/group-settings'

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>
}) {
  const { groupSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, slug, owner_id')
    .eq('slug', groupSlug)
    .single()

  if (!group) notFound()

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profile:profiles(display_name, avatar_url)')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: true })

  const myRole = members?.find((m) => m.user_id === user.id)?.role

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Group settings</h1>
      <GroupSettings
        group={group}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members={(members ?? []) as any}
        userId={user.id}
        isAdmin={myRole === 'admin'}
      />
    </div>
  )
}
