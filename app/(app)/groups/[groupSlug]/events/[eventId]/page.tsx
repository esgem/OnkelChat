import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Chat } from '@/components/chat/chat'
import { EventStatusActions } from '@/components/events/event-status-actions'
import { Calendar, ListChecks, UtensilsCrossed, MessageSquare, ArrowLeft } from 'lucide-react'
import type { EventStatus } from '@/lib/types'

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft',
  polling: 'Polling',
  confirmed: 'Confirmed',
  past: 'Past',
}

const STATUS_COLOR: Record<EventStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  polling: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  past: 'bg-muted text-muted-foreground',
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ groupSlug: string; eventId: string }>
}) {
  const { groupSlug, eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const status = event.status as EventStatus
  const isCoordinator = user?.id === event.coordinator_id

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href={`/groups/${groupSlug}`} className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{event.title}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
            )}
            {event.confirmed_date && (
              <p className="text-sm font-medium mt-1">
                Confirmed: {new Date(event.confirmed_date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
          {isCoordinator && (
            <EventStatusActions
              eventId={event.id}
              currentStatus={status}
              groupSlug={groupSlug}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: feature tabs */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-3">
            <Link href={`/groups/${groupSlug}/events/${eventId}/dates`}>
              <Button variant="outline" className="gap-2">
                <Calendar className="size-4" />
                Date poll
              </Button>
            </Link>
            <Link href={`/groups/${groupSlug}/events/${eventId}/activities`}>
              <Button variant="outline" className="gap-2">
                <ListChecks className="size-4" />
                Activities
              </Button>
            </Link>
            <Link href={`/groups/${groupSlug}/events/${eventId}/menu`}>
              <Button variant="outline" className="gap-2">
                <UtensilsCrossed className="size-4" />
                Menu
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: event chat */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-4 border-b flex items-center gap-2">
            <MessageSquare className="size-4" />
            <span className="font-medium text-sm">Event chat</span>
          </div>
          <Chat groupId={event.group_id} eventId={event.id} />
        </div>
      </div>
    </div>
  )
}
