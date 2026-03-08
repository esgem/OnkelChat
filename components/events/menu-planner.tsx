'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import type { MenuCategory } from '@/lib/types'

interface MenuItem {
  id: string
  user_id: string
  title: string
  description: string | null
  category: MenuCategory
  profile: { display_name: string } | null
}

interface Props {
  eventId: string
  items: MenuItem[]
  userId: string
  canEdit: boolean
}

const CATEGORIES: MenuCategory[] = ['starter', 'main', 'dessert', 'drink']
const CATEGORY_LABEL: Record<MenuCategory, string> = {
  starter: 'Starters',
  main: 'Mains',
  dessert: 'Desserts',
  drink: 'Drinks',
}

export function MenuPlanner({ eventId, items: initial, userId, canEdit }: Props) {
  const [items, setItems] = useState(initial)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<MenuCategory>('main')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data } = await supabase
      .from('menu_items')
      .insert({ event_id: eventId, title, description: description || null, category })
      .select('id, user_id, title, description, category, profile:profiles(display_name)')
      .single()

    if (data) {
      setItems((prev) => [...prev, data as unknown as MenuItem])
      setTitle('')
      setDescription('')
      setShowForm(false)
    }
    setLoading(false)
  }

  async function deleteItem(id: string) {
    await supabase.from('menu_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-6">
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat)
        return (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{CATEGORY_LABEL[cat]}</CardTitle>
            </CardHeader>
            <CardContent>
              {catItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              ) : (
                <ul className="space-y-2">
                  {catItems.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          by {item.profile?.display_name ?? 'Unknown'}
                        </p>
                      </div>
                      {item.user_id === userId && canEdit && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )
      })}

      {canEdit && (
        <>
          {showForm ? (
            <Card>
              <CardContent className="pt-4">
                <form onSubmit={addItem} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="menu-cat">Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as MenuCategory)}>
                      <SelectTrigger id="menu-cat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="menu-title">Item</Label>
                    <Input
                      id="menu-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Potato salad"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="menu-desc">Note (optional)</Label>
                    <Textarea
                      id="menu-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Anything to mention…"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={loading}>
                      {loading ? 'Adding…' : 'Add item'}
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
              Add menu item
            </Button>
          )}
        </>
      )}
    </div>
  )
}
