'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Link, UserMinus } from 'lucide-react'

interface Member {
  user_id: string
  role: string
  joined_at: string
  profile: { display_name: string; avatar_url: string | null } | null
}

interface Group {
  id: string
  name: string
  slug: string
  owner_id: string
}

interface Props {
  group: Group
  members: Member[]
  userId: string
  isAdmin: boolean
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function GroupSettings({ group, members, userId, isAdmin }: Props) {
  const router = useRouter()
  const [name, setName] = useState(group.name)
  const [saving, setSaving] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  async function saveGroupName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('groups').update({ name }).eq('id', group.id)
    setSaving(false)
    router.refresh()
  }

  async function generateInviteLink() {
    setGeneratingLink(true)
    const { data } = await supabase
      .from('invite_tokens')
      .insert({ group_id: group.id, created_by: userId })
      .select('token')
      .single()

    if (data) {
      const url = `${window.location.origin}/invite/${data.token}`
      setInviteLink(url)
    }
    setGeneratingLink(false)
  }

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function removeMember(memberId: string) {
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', memberId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Group name */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group name</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveGroupName} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-xs"
                required
              />
              <Button type="submit" size="sm" disabled={saving || name === group.name}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invite link */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite link</CardTitle>
            <CardDescription>Share this link so others can join the group. Valid for 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inviteLink ? (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={copyLink}>
                  <Copy className="size-4 mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={generateInviteLink} disabled={generatingLink}>
                <Link className="size-4 mr-1" />
                {generatingLink ? 'Generating…' : 'Generate invite link'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.profile?.display_name ?? '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium">
                      {member.profile?.display_name ?? 'Unknown'}
                      {member.user_id === userId && (
                        <span className="text-muted-foreground font-normal"> (you)</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  {isAdmin && member.user_id !== userId && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember(member.user_id)}
                    >
                      <UserMinus className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
