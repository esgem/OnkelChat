'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, Minus, X, Plus, Trash2 } from 'lucide-react'
import type { Availability } from '@/lib/types'

interface DateRow {
  id: string
  date: string
}

interface VoteRow {
  date_id: string
  user_id: string
  availability: Availability
}

interface MemberRow {
  user_id: string
  profile: { display_name: string } | null
}

interface Props {
  eventId: string
  dates: DateRow[]
  votes: VoteRow[]
  members: MemberRow[]
  userId: string
  isCoordinator: boolean
  eventStatus: string
}

const AVAIL_ICON: Record<Availability, React.ReactNode> = {
  yes: <Check className="size-4 text-green-600" />,
  maybe: <Minus className="size-4 text-yellow-600" />,
  no: <X className="size-4 text-red-500" />,
}

const AVAIL_CYCLE: Record<Availability, Availability> = {
  yes: 'maybe',
  maybe: 'no',
  no: 'yes',
}

function voteCount(votes: VoteRow[], dateId: string, avail: Availability) {
  return votes.filter((v) => v.date_id === dateId && v.availability === avail).length
}

export function DatePoll({ eventId, dates: initialDates, votes: initialVotes, members, userId, isCoordinator, eventStatus }: Props) {
  const router = useRouter()
  const [dates, setDates] = useState(initialDates)
  const [votes, setVotes] = useState(initialVotes)
  const [newDate, setNewDate] = useState('')
  const [savingVote, setSavingVote] = useState<string | null>(null)
  const [addingDate, setAddingDate] = useState(false)
  const canEdit = eventStatus === 'polling' || (isCoordinator && eventStatus === 'draft')
  const supabase = createClient()

  async function addDate(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return
    setAddingDate(true)

    const { data } = await supabase
      .from('event_dates')
      .insert({ event_id: eventId, date: newDate })
      .select()
      .single()

    if (data) {
      setDates((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
      setNewDate('')
    }
    setAddingDate(false)
  }

  async function removeDate(dateId: string) {
    await supabase.from('event_dates').delete().eq('id', dateId)
    setDates((prev) => prev.filter((d) => d.id !== dateId))
    setVotes((prev) => prev.filter((v) => v.date_id !== dateId))
  }

  async function castVote(dateId: string) {
    const existing = votes.find((v) => v.date_id === dateId && v.user_id === userId)
    const nextAvail: Availability = existing ? AVAIL_CYCLE[existing.availability] : 'yes'

    setSavingVote(dateId)

    await supabase.from('date_votes').upsert({
      event_id: eventId,
      date_id: dateId,
      user_id: userId,
      availability: nextAvail,
    })

    setVotes((prev) => {
      const filtered = prev.filter((v) => !(v.date_id === dateId && v.user_id === userId))
      return [...filtered, { date_id: dateId, user_id: userId, availability: nextAvail, event_id: eventId } as VoteRow]
    })

    setSavingVote(null)
  }

  async function confirmDate(dateId: string) {
    const date = dates.find((d) => d.id === dateId)?.date
    if (!date) return
    await supabase
      .from('events')
      .update({ confirmed_date: date, status: 'confirmed' })
      .eq('id', eventId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Add date (coordinator only) */}
      {isCoordinator && eventStatus !== 'past' && (
        <form onSubmit={addDate} className="flex gap-2">
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-48"
            required
          />
          <Button type="submit" size="sm" disabled={addingDate}>
            <Plus className="size-4 mr-1" />
            Add date
          </Button>
        </form>
      )}

      {dates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No dates suggested yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                {members.map((m) => (
                  <th key={m.user_id} className="py-2 px-3 font-medium text-center min-w-[80px]">
                    {m.profile?.display_name ?? 'Unknown'}
                  </th>
                ))}
                <th className="py-2 px-3 font-medium text-center">Yes</th>
                <th className="py-2 px-3 font-medium text-center">Maybe</th>
                {isCoordinator && eventStatus === 'polling' && (
                  <th className="py-2 px-3" />
                )}
                {isCoordinator && <th className="py-2 px-3" />}
              </tr>
            </thead>
            <tbody>
              {dates.map((dateRow) => {
                const myVote = votes.find((v) => v.date_id === dateRow.id && v.user_id === userId)
                const yes = voteCount(votes, dateRow.id, 'yes')
                const maybe = voteCount(votes, dateRow.id, 'maybe')

                return (
                  <tr key={dateRow.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">
                      {new Date(dateRow.date + 'T00:00:00').toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    {members.map((m) => {
                      const vote = votes.find((v) => v.date_id === dateRow.id && v.user_id === m.user_id)
                      return (
                        <td key={m.user_id} className="py-2 px-3 text-center">
                          {vote ? AVAIL_ICON[vote.availability] : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      )
                    })}
                    <td className="py-2 px-3 text-center">
                      <Badge variant="outline" className="text-green-700 border-green-300">{yes}</Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300">{maybe}</Badge>
                    </td>
                    {canEdit && (
                      <td className="py-2 px-3">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => castVote(dateRow.id)}
                          disabled={savingVote === dateRow.id}
                          className="gap-1"
                        >
                          {myVote ? AVAIL_ICON[myVote.availability] : <Plus className="size-3.5" />}
                          {myVote?.availability ?? 'Vote'}
                        </Button>
                      </td>
                    )}
                    {isCoordinator && eventStatus === 'polling' && (
                      <td className="py-2 px-3">
                        <Button size="xs" variant="outline" onClick={() => confirmDate(dateRow.id)}>
                          Confirm
                        </Button>
                      </td>
                    )}
                    {isCoordinator && eventStatus !== 'past' && (
                      <td className="py-2 px-3">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => removeDate(dateRow.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex gap-4">
        <span className="flex items-center gap-1">{AVAIL_ICON.yes} Yes</span>
        <span className="flex items-center gap-1">{AVAIL_ICON.maybe} Maybe</span>
        <span className="flex items-center gap-1">{AVAIL_ICON.no} No</span>
      </div>
    </div>
  )
}
