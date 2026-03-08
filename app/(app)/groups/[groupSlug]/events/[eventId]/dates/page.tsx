import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DatePoll } from '@/components/polls/date-poll'
import { ArrowLeft } from 'lucide-react'

export default async function DatesPage({
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
    .select('id, title, status, coordinator_id, group_id')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const { data: dates } = await supabase
    .from('event_dates')
    .select('id, date')
    .eq('event_id', eventId)
    .order('date', { ascending: true })

  const { data: votes } = await supabase
    .from('date_votes')
    .select('date_id, user_id, availability')
    .eq('event_id', eventId)

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profile:profiles(display_name)')
    .eq('group_id', event.group_id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href={`/groups/${groupSlug}/events/${eventId}`} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to event
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1">{event.title}</h1>
      <p className="text-muted-foreground mb-6">Date poll</p>

      <DatePoll
        eventId={eventId}
        dates={dates ?? []}
        votes={votes ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members={(members ?? []) as any}
        userId={user.id}
        isCoordinator={user.id === event.coordinator_id}
        eventStatus={event.status}
      />
    </div>
  )
}
