'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'error' | 'auth'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('auth')
      } else {
        setStatus('ready')
      }
    }
    checkAuth()
  }, [])

  async function joinGroup() {
    setStatus('joining')
    const res = await fetch(`/api/invites/${params.token}`, { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to join group')
      setStatus('error')
      return
    }

    router.push(`/groups/${data.slug}`)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>You&apos;re invited!</CardTitle>
          <CardDescription>Join a group on OnkelChat</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && <p className="text-sm text-muted-foreground">Checking invite…</p>}

          {status === 'auth' && (
            <>
              <p className="text-sm text-muted-foreground">You need to sign in before joining.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push(`/login?next=/invite/${params.token}`)}>
                  Sign in
                </Button>
                <Button variant="outline" onClick={() => router.push(`/signup?next=/invite/${params.token}`)}>
                  Create account
                </Button>
              </div>
            </>
          )}

          {status === 'ready' && (
            <>
              <p className="text-sm text-muted-foreground">Click below to join the group.</p>
              <Button onClick={joinGroup}>Join group</Button>
            </>
          )}

          {status === 'joining' && <p className="text-sm text-muted-foreground">Joining…</p>}

          {status === 'error' && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
