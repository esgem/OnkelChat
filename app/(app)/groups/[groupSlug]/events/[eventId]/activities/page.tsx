import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ActivityList } from '@/components/events/activity-list'
import { ArrowLeft } from 'lucide-react'

export default async function ActivitiesPage({
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
    .select('id, title, status, coordinator_id')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const { data: suggestions } = await supabase
    .from('activity_suggestions')
    .select('id, user_id, title, description, url, created_at, profile:profiles(display_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  const { data: votes } = await supabase
    .from('activity_votes')
    .select('suggestion_id, user_id, vote')
    .in('suggestion_id', (suggestions ?? []).map((s) => s.id))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href={`/groups/${groupSlug}/events/${eventId}`} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to event
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1">{event.title}</h1>
      <p className="text-muted-foreground mb-6">Activity suggestions</p>

      <ActivityList
        eventId={eventId}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        suggestions={(suggestions ?? []) as any}
        votes={votes ?? []}
        userId={user.id}
        canEdit={event.status !== 'past'}
      />
    </div>
  )
}
