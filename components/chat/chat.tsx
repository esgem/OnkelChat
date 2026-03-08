'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send } from 'lucide-react'
import type { Message } from '@/lib/types'

interface ChatProps {
  groupId: string
  eventId: string | null
}

interface MessageWithProfile {
  id: string
  group_id: string
  event_id: string | null
  user_id: string
  body: string
  created_at: string
  profile: { display_name: string; avatar_url: string | null } | null
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Chat({ groupId, eventId }: ChatProps) {
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [body, setBody] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadMessages() {
      let query = supabase
        .from('messages')
        .select('*, profile:profiles(display_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (eventId) {
        query = query.eq('event_id', eventId)
      } else {
        query = query.is('event_id', null)
      }

      const { data } = await query
      setMessages((data as MessageWithProfile[]) ?? [])
      setTimeout(scrollToBottom, 50)
    }

    loadMessages()

    const channel = supabase
      .channel(`messages:${groupId}:${eventId ?? 'general'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: eventId
            ? `event_id=eq.${eventId}`
            : `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, profile:profiles(display_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev
              return [...prev, data as MessageWithProfile]
            })
            setTimeout(scrollToBottom, 50)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setBody('')

    await supabase.from('messages').insert({
      group_id: groupId,
      event_id: eventId,
      body: trimmed,
    })

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  const grouped: { date: string; messages: MessageWithProfile[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) {
      last.messages.push(msg)
    } else {
      grouped.push({ date, messages: [msg] })
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground shrink-0">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-3">
              {dayMsgs.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.user_id === userId ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.profile?.display_name ?? '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${msg.user_id === userId ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`flex items-baseline gap-1 mb-0.5 ${msg.user_id === userId ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-medium">{msg.profile?.display_name}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                    </div>
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        msg.user_id === userId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say hello!
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button type="submit" size="icon" disabled={!body.trim() || loading}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
