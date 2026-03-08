import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, slug')
    .order('created_at', { ascending: true })

  return (
    <div className="flex h-screen bg-background">
      <Sidebar groups={groups ?? []} userId={user.id} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
