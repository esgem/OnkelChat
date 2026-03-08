import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Chat } from '@/components/chat/chat'
import { Plus, Calendar } from 'lucide-react'
import type { EventStatus } from '@/lib/types'

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft',
  polling: 'Polling',
  confirmed: 'Confirmed',
  past: 'Past',
}

const STATUS_VARIANT: Record<EventStatus, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  polling: 'default',
  confirmed: 'default',
  past: 'outline',
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>
}) {
  const { groupSlug } = await params
  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, slug')
    .eq('slug', groupSlug)
    .single()

  if (!group) notFound()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, status, confirmed_date, created_at')
    .eq('group_id', group.id)
    .order('created_at', { ascending: false })

  const activeEvents = events?.filter((e) => e.status !== 'past') ?? []
  const pastEvents = events?.filter((e) => e.status === 'past') ?? []

  return (
    <div className="flex h-full">
      {/* Events panel */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="p-4 flex items-center justify-between">
          <h2 className="font-semibold">{group.name}</h2>
          <Link href={`/groups/${groupSlug}/events/new`}>
            <Button size="icon-sm" variant="ghost">
              <Plus className="size-4" />
            </Button>
          </Link>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeEvents.length === 0 && (
            <p className="text-sm text-muted-foreground px-2 py-4 text-center">
              No events yet.{' '}
              <Link href={`/groups/${groupSlug}/events/new`} className="underline">
                Create one
              </Link>
            </p>
          )}
          {activeEvents.map((event) => (
            <Link
              key={event.id}
              href={`/groups/${groupSlug}/events/${event.id}`}
              className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{event.title}</span>
              </div>
              <Badge variant={STATUS_VARIANT[event.status as EventStatus]} className="shrink-0 text-xs">
                {STATUS_LABEL[event.status as EventStatus]}
              </Badge>
            </Link>
          ))}

          {pastEvents.length > 0 && (
            <>
              <div className="px-2 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Past
              </div>
              {pastEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/groups/${groupSlug}/events/${event.id}`}
                  className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted transition-colors opacity-60"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{event.title}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">Past</Badge>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {/* General chat */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-medium">General chat</h3>
        </div>
        <Chat groupId={group.id} eventId={null} />
      </div>
    </div>
  )
}
