import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MenuPlanner } from '@/components/events/menu-planner'
import { ArrowLeft } from 'lucide-react'

export default async function MenuPage({
  params,
}: {
  params: Promise<{ groupSlug: string; eventId: string }>
}) {
  const { groupSlug, eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, status')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const { data: items } = await supabase
    .from('menu_items')
    .select('id, user_id, title, description, category, profile:profiles(display_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href={`/groups/${groupSlug}/events/${eventId}`} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to event
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1">{event.title}</h1>
      <p className="text-muted-foreground mb-6">Menu planning</p>

      <MenuPlanner
        eventId={eventId}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items={(items ?? []) as any}
        userId={user.id}
        canEdit={event.status !== 'past'}
      />
    </div>
  )
}
