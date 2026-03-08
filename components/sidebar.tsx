'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { LogOut, Plus, Users, MessageSquare, Settings } from 'lucide-react'

interface SidebarProps {
  groups: { id: string; name: string; slug: string }[]
  userId: string
}

export function Sidebar({ groups }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 flex flex-col border-r bg-muted/40 shrink-0">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <MessageSquare className="size-5" />
          OnkelChat
        </Link>
      </div>
      <Separator />

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Groups
        </div>
        {groups.map((group) => (
          <div key={group.id} className="group/item flex items-center">
            <Link
              href={`/groups/${group.slug}`}
              className={cn(
                'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors',
                pathname.startsWith(`/groups/${group.slug}`) && 'bg-muted font-medium'
              )}
            >
              <Users className="size-4 shrink-0" />
              <span className="truncate">{group.name}</span>
            </Link>
            <Link
              href={`/groups/${group.slug}/settings`}
              className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
            >
              <Settings className="size-3.5 text-muted-foreground" />
            </Link>
          </div>
        ))}
        <Link
          href="/groups/new"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="size-4 shrink-0" />
          New group
        </Link>
      </div>

      <Separator />
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
