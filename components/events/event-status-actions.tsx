'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { EventStatus } from '@/lib/types'

interface Props {
  eventId: string
  currentStatus: EventStatus
  groupSlug: string
}

const NEXT_STATUS: Partial<Record<EventStatus, { status: EventStatus; label: string }>> = {
  draft: { status: 'polling', label: 'Start polling' },
  polling: { status: 'confirmed', label: 'Confirm date' },
  confirmed: { status: 'past', label: 'Mark as past' },
}

export function EventStatusActions({ eventId, currentStatus, groupSlug }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const next = NEXT_STATUS[currentStatus]

  if (!next) return null

  async function advance() {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('events')
      .update({ status: next!.status })
      .eq('id', eventId)
    router.refresh()
    setLoading(false)
  }

  return (
    <Button size="sm" onClick={advance} disabled={loading}>
      {loading ? 'Saving…' : next.label}
    </Button>
  )
}
