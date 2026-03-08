'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewEventPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { groupSlug } = await params
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', groupSlug)
      .single()

    if (!group) {
      setError('Group not found')
      setLoading(false)
      return
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        group_id: group.id,
        title,
        description: description || null,
        coordinator_id: user.id,
        status: 'draft',
      })
      .select()
      .single()

    if (eventError) {
      setError(eventError.message)
      setLoading(false)
      return
    }

    router.push(`/groups/${groupSlug}/events/${event.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto pt-16 px-4">
      <Card>
        <CardHeader>
          <CardTitle>New event</CardTitle>
          <CardDescription>Create an event for your group to coordinate</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer BBQ"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any details about the event…"
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
