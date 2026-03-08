import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: groups } = await supabase
    .from('groups')
    .select('slug')
    .order('created_at', { ascending: true })
    .limit(1)

  if (groups && groups.length > 0) {
    redirect(`/groups/${groups[0].slug}`)
  }

  redirect('/groups/new')
}
