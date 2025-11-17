import basePayload from '../../data/items-base.json'
import aliasPayload from '../../data/item-aliases.json'
import guidePayload from '../../data/guide-cheatsheet.json'
import dictionaryPayload from '../../data/french-dictionary.json'
import type {
  AliasEntry,
  ArcItem,
  GuideCategory,
  GuideEntry,
  MetaForgeItem,
} from '../types'
import { normalizeText } from '../utils/text'

interface MetaForgeResponse {
  data?: MetaForgeItem[]
}

const aliasMap = aliasPayload as Record<string, AliasEntry>
const guideMap = guidePayload as Record<string, GuideEntry>
const frenchDictionary = dictionaryPayload as Record<string, string[]>

const payload = basePayload as MetaForgeResponse
const rawItems: MetaForgeItem[] = Array.isArray(payload?.data) ? payload.data : []

function normalizeGuideCategory(value?: string): GuideCategory {
  switch (value) {
    case 'KEEP_FOR_QUESTS':
    case 'KEEP_FOR_PROJECTS':
    case 'SAFE_TO_RECYCLE':
    case 'WORKSHOP_UPGRADE':
      return value
    default:
      return 'NONE'
  }
}

function buildSearchIndex(tokens: string[]): string {
  const normalizedTokens = tokens
    .map((token) => normalizeText(token))
    .filter((token) => token.length > 0)
  if (normalizedTokens.length === 0) {
    return ''
  }
  return normalizedTokens.join(' ')
}

function generateDictionaryTokens(name: string): string[] {
  const normalizedName = name.toLowerCase()
  const results = new Set<string>()

  const phraseMatches = frenchDictionary[normalizedName]
  if (Array.isArray(phraseMatches)) {
    phraseMatches.forEach((value) => {
      if (value) results.add(value)
    })
  }

  const tokens = normalizedName
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean)

  if (tokens.length === 0) {
    return Array.from(results)
  }

  const translatedForPhrase: string[] = []

  tokens.forEach((token) => {
    const entry = frenchDictionary[token]
    if (Array.isArray(entry)) {
      entry.forEach((value) => results.add(value))
      translatedForPhrase.push(entry[0] ?? token)
    } else {
      translatedForPhrase.push(token)
    }
  })

  if (translatedForPhrase.some((word, idx) => word !== tokens[idx])) {
    results.add(translatedForPhrase.join(' '))
  }

  return Array.from(results)
}

export const arcItems: ArcItem[] = rawItems.map((item) => {
  const aliasEntry = aliasMap[item.id] ?? {}
  const guideEntry = guideMap[item.id]
  const nameEn = item.name ?? item.id
  const nameFr = aliasEntry.name_fr ?? null
  const aliases = Array.isArray(aliasEntry.aliases) ? aliasEntry.aliases : []
  const generatedFrenchTokens = generateDictionaryTokens(nameEn)
  const searchPool = [nameEn, nameFr ?? '', ...aliases, ...generatedFrenchTokens]
  const guideCategory = normalizeGuideCategory(guideEntry?.guideCategory)
  const rawStations = guideEntry?.stations
  const stations = Array.isArray(rawStations) ? rawStations.filter(Boolean) : []
  const recycles = Array.isArray(guideEntry?.recycles) ? guideEntry.recycles : []
  const quests = Array.isArray(guideEntry?.quests) ? guideEntry.quests : []
  const searchIndex =
    buildSearchIndex(searchPool) || normalizeText(nameEn) || normalizeText(item.id)
  const guideSource = guideEntry?.source ?? (guideEntry ? 'RecyclingCheatSheetV2' : null)
  const sellPrice =
    typeof guideEntry?.sellPrice === 'number' ? guideEntry.sellPrice : null
  const notes = guideEntry?.notes ?? null

  return {
    id: item.id,
    slug: item.id,
    name_en: nameEn,
    name_fr: nameFr,
    category: item.item_type ?? 'Misc',
    rarity: item.rarity ?? 'Unknown',
    description: item.description ?? item.flavor_text ?? '',
    vendor: item.workbench ?? null,
    icon: item.icon ?? null,
    baseValue: typeof item.value === 'number' ? item.value : null,
    sellPrice,
    tags: [],
    guideCategory,
    guideSource,
    stations,
    recycles,
    notes,
    quests,
    aliases,
    searchIndex,
  }
})

export const hasBaseData = arcItems.length > 0

export const categories = Array.from(
  new Set(arcItems.map((item) => item.category).filter(Boolean)),
).sort()

export const rarities = Array.from(
  new Set(arcItems.map((item) => item.rarity).filter(Boolean)),
).sort()
