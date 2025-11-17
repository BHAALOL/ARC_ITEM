export type UserStatus = 'KEEP' | 'MAYBE' | 'RECYCLE' | 'UNSET'

export type GuideCategory =
  | 'KEEP_FOR_QUESTS'
  | 'KEEP_FOR_PROJECTS'
  | 'SAFE_TO_RECYCLE'
  | 'WORKSHOP_UPGRADE'
  | 'NONE'

export interface GuideEntry {
  guideCategory: GuideCategory
  stations?: string[]
  notes?: string
  source?: string
  recycles?: string[]
  sellPrice?: number | null
  quests?: string[]
}

export interface AliasEntry {
  name_fr?: string
  aliases?: string[]
}

export interface MetaForgeItem {
  id: string
  name: string
  description?: string | null
  item_type?: string | null
  rarity?: string | null
  flavor_text?: string | null
  workbench?: string | null
  icon?: string | null
  value?: number | null
}

export interface ArcItem {
  id: string
  slug: string
  name_en: string
  name_fr: string | null
  category: string
  rarity: string
  description: string
  vendor: string | null
  icon: string | null
  baseValue: number | null
  sellPrice: number | null
  tags: string[]
  guideCategory: GuideCategory
  guideSource: string | null
  stations: string[]
  recycles: string[]
  notes: string | null
  quests: string[]
  aliases: string[]
  searchIndex: string
}
