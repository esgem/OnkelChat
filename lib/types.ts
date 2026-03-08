export type UserRole = 'admin' | 'member'
export type EventStatus = 'draft' | 'polling' | 'confirmed' | 'past'
export type Availability = 'yes' | 'maybe' | 'no'
export type MenuCategory = 'starter' | 'main' | 'dessert' | 'drink'
export type ActivityVote = 'up' | 'down'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
}

export interface Group {
  id: string
  name: string
  slug: string
  created_at: string
  owner_id: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: Profile
}

export interface GroupWithMembers extends Group {
  group_members: GroupMember[]
}

export interface Event {
  id: string
  group_id: string
  title: string
  description: string | null
  coordinator_id: string
  status: EventStatus
  confirmed_date: string | null
  created_at: string
}

export interface EventDate {
  id: string
  event_id: string
  date: string
}

export interface DateVote {
  event_id: string
  date_id: string
  user_id: string
  availability: Availability
}

export interface ActivitySuggestion {
  id: string
  event_id: string
  user_id: string
  title: string
  description: string | null
  url: string | null
  profile?: Profile
  votes?: ActivityVoteRecord[]
}

export interface ActivityVoteRecord {
  suggestion_id: string
  user_id: string
  vote: ActivityVote
}

export interface MenuItem {
  id: string
  event_id: string
  user_id: string
  title: string
  description: string | null
  category: MenuCategory
  profile?: Profile
}

export interface Message {
  id: string
  group_id: string
  event_id: string | null
  user_id: string
  body: string
  created_at: string
  profile?: Profile
}
