'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ThumbsUp, ThumbsDown, Plus, Trash2, ExternalLink } from 'lucide-react'
import type { ActivityVote } from '@/lib/types'

interface Suggestion {
  id: string
  user_id: string
  title: string
  description: string | null
  url: string | null
  profile: { display_name: string } | null
}

interface VoteRow {
  suggestion_id: string
  user_id: string
  vote: ActivityVote
}

interface Props {
  eventId: string
  suggestions: Suggestion[]
  votes: VoteRow[]
  userId: string
  canEdit: boolean
}

export function ActivityList({ eventId, suggestions: initial, votes: initialVotes, userId, canEdit }: Props) {
  const [suggestions, setSuggestions] = useState(initial)
  const [votes, setVotes] = useState(initialVotes)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function addSuggestion(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data } = await supabase
      .from('activity_suggestions')
      .insert({
        event_id: eventId,
        title,
        description: description || null,
        url: url || null,
      })
      .select('id, user_id, title, description, url, profile:profiles(display_name)')
      .single()

    if (data) {
      setSuggestions((prev) => [...prev, data as unknown as Suggestion])
      setTitle('')
      setDescription('')
      setUrl('')
      setShowForm(false)
    }
    setLoading(false)
  }

  async function deleteSuggestion(id: string) {
    await supabase.from('activity_suggestions').delete().eq('id', id)
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    setVotes((prev) => prev.filter((v) => v.suggestion_id !== id))
  }

  async function castVote(suggestionId: string, vote: ActivityVote) {
    const existing = votes.find((v) => v.suggestion_id === suggestionId && v.user_id === userId)

    if (existing?.vote === vote) {
      // Remove vote
      await supabase.from('activity_votes').delete()
        .eq('suggestion_id', suggestionId)
        .eq('user_id', userId)
      setVotes((prev) => prev.filter((v) => !(v.suggestion_id === suggestionId && v.user_id === userId)))
    } else {
      await supabase.from('activity_votes').upsert({
        suggestion_id: suggestionId,
        user_id: userId,
        vote,
      })
      setVotes((prev) => {
        const filtered = prev.filter((v) => !(v.suggestion_id === suggestionId && v.user_id === userId))
        return [...filtered, { suggestion_id: suggestionId, user_id: userId, vote }]
      })
    }
  }

  function getVotes(suggestionId: string, vote: ActivityVote) {
    return votes.filter((v) => v.suggestion_id === suggestionId && v.vote === vote).length
  }

  function getMyVote(suggestionId: string): ActivityVote | null {
    return votes.find((v) => v.suggestion_id === suggestionId && v.user_id === userId)?.vote ?? null
  }

  const sorted = [...suggestions].sort((a, b) => {
    const aScore = getVotes(a.id, 'up') - getVotes(a.id, 'down')
    const bScore = getVotes(b.id, 'up') - getVotes(b.id, 'down')
    return bScore - aScore
  })

  return (
    <div className="space-y-4">
      {sorted.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No suggestions yet. Add the first one!</p>
      )}

      {sorted.map((s) => {
        const up = getVotes(s.id, 'up')
        const down = getVotes(s.id, 'down')
        const myVote = getMyVote(s.id)

        return (
          <Card key={s.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.title}</span>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    by {s.profile?.display_name ?? 'Unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <>
                      <Button
                        size="icon-xs"
                        variant={myVote === 'up' ? 'default' : 'ghost'}
                        onClick={() => castVote(s.id, 'up')}
                      >
                        <ThumbsUp className="size-3.5" />
                      </Button>
                      <span className="text-sm font-medium w-5 text-center">{up}</span>
                      <Button
                        size="icon-xs"
                        variant={myVote === 'down' ? 'destructive' : 'ghost'}
                        onClick={() => castVote(s.id, 'down')}
                      >
                        <ThumbsDown className="size-3.5" />
                      </Button>
                      <span className="text-sm font-medium w-5 text-center">{down}</span>
                    </>
                  )}
                  {!canEdit && (
                    <Badge variant="outline">{up} up / {down} down</Badge>
                  )}
                  {s.user_id === userId && canEdit && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteSuggestion(s.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {canEdit && (
        <>
          {showForm ? (
            <Card>
              <CardContent className="pt-4">
                <form onSubmit={addSuggestion} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="act-title">Title</Label>
                    <Input
                      id="act-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Escape room"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="act-desc">Description (optional)</Label>
                    <Textarea
                      id="act-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Any details…"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="act-url">Link (optional)</Label>
                    <Input
                      id="act-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={loading}>
                      {loading ? 'Adding…' : 'Add suggestion'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="size-4" />
              Add suggestion
            </Button>
          )}
        </>
      )}
    </div>
  )
}
