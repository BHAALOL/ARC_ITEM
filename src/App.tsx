import { useMemo, useState } from 'react'
import './App.css'
import { arcItems, categories, hasBaseData, rarities } from './data/items'
import type { ArcItem, GuideCategory, UserStatus } from './types'
import { normalizeText } from './utils/text'

const STORAGE_KEY = 'arcraiders:user-statuses'

type ItemWithStatus = ArcItem & { userStatus: UserStatus }

type Language = 'en' | 'fr'

type CopyDictionary = {
  searchPlaceholder: string
  categoryLabel: string
  rarityLabel: string
  statusLabel: string
  guideLabel: string
  clearFilters: string
  questQuick: string
  recycleQuick: string
  noResults: string
  missingData: string
  showUnclassified: string
  hideUnclassified: string
  sectionEmpty: string
  sellLabel: string
  recycleLabel: string
}

const translations: Record<Language, CopyDictionary> = {
  en: {
    searchPlaceholder: 'Search by English or French name…',
    categoryLabel: 'Category',
    rarityLabel: 'Rarity',
    statusLabel: 'Status',
    guideLabel: 'Guide category',
    clearFilters: 'Reset filters',
    questQuick: 'Quest focus',
    recycleQuick: 'Show recycling picks',
    noResults: 'No items match your filters',
    missingData:
      'No cached item data found. Run "npm run update:items" followed by "npm run update:guide" to download the latest list.',
    showUnclassified: 'Show unclassified items',
    hideUnclassified: 'Hide unclassified items',
    sectionEmpty: 'No cards to display with the current filters.',
    sellLabel: 'Sell price',
    recycleLabel: 'Recycles into',
  },
  fr: {
    searchPlaceholder: 'Rechercher (nom anglais ou français)…',
    categoryLabel: 'Catégorie',
    rarityLabel: 'Rareté',
    statusLabel: 'Statut',
    guideLabel: 'Guide',
    clearFilters: 'Réinitialiser les filtres',
    questQuick: 'Objets de quête',
    recycleQuick: 'Objets à recycler',
    noResults: 'Aucun objet ne correspond à vos filtres',
    missingData:
      'Aucune donnée en cache. Lancez « npm run update:items » puis « npm run update:guide » pour télécharger la liste.',
    showUnclassified: 'Afficher les objets non classés',
    hideUnclassified: 'Masquer les objets non classés',
    sectionEmpty: 'Rien à afficher avec ces filtres.',
    sellLabel: 'Valeur de vente',
    recycleLabel: 'Décompose en',
  },
}

const guideCategoryLabels: Record<GuideCategory, string> = {
  KEEP_FOR_QUESTS: 'Quest',
  KEEP_FOR_PROJECTS: 'Project',
  SAFE_TO_RECYCLE: 'Safe to recycle',
  WORKSHOP_UPGRADE: 'Workshop',
  NONE: 'Unclassified',
}

const QUEST_GUIDE_CATEGORIES: GuideCategory[] = ['KEEP_FOR_QUESTS', 'KEEP_FOR_PROJECTS']

const rarityPalette: Record<string, { bg: string; border: string }> = {
  common: { bg: 'linear-gradient(135deg, #132143, #1e3764)', border: '#3b82f6' },
  uncommon: { bg: 'linear-gradient(135deg, #143225, #1c5135)', border: '#22c55e' },
  rare: { bg: 'linear-gradient(135deg, #2b1548, #432875)', border: '#a78bfa' },
  epic: { bg: 'linear-gradient(135deg, #411828, #6d1f49)', border: '#f472b6' },
  legendary: { bg: 'linear-gradient(135deg, #4b1e11, #8b2e16)', border: '#f59e0b' },
}

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: 'KEEP', label: 'Keep' },
  { value: 'MAYBE', label: 'Maybe' },
  { value: 'RECYCLE', label: 'Recycle' },
  { value: 'UNSET', label: 'Unset' },
]

const guideFilterOptions: { value: 'ALL' | GuideCategory; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'KEEP_FOR_QUESTS', label: 'Keep for quests' },
  { value: 'KEEP_FOR_PROJECTS', label: 'Keep for projects' },
  { value: 'SAFE_TO_RECYCLE', label: 'Safe to recycle' },
  { value: 'WORKSHOP_UPGRADE', label: 'Workshop upgrades' },
  { value: 'NONE', label: 'Unclassified' },
]

const sortOptions = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'category', label: 'Category' },
]

const sectionLayout: Array<{
  key: GuideCategory
  title: string
  description: string
  accent: string
  collapsible?: boolean
}> = [
  {
    key: 'KEEP_FOR_QUESTS',
    title: 'Keep for Quests',
    description: 'Hold onto these until their questlines are cleared.',
    accent: '#fbbf24',
  },
  {
    key: 'KEEP_FOR_PROJECTS',
    title: 'Keep for Projects',
    description: 'Needed for projects or blueprints before selling.',
    accent: '#c084fc',
  },
  {
    key: 'WORKSHOP_UPGRADE',
    title: 'Workshop Upgrades',
    description: 'Save for Scrappy, Gunsmith, or other station upgrades.',
    accent: '#38bdf8',
  },
  {
    key: 'SAFE_TO_RECYCLE',
    title: 'Safe to Recycle (A–Z)',
    description: 'GameRant identifies these as safe sells/recycles.',
    accent: '#34d399',
  },
  {
    key: 'NONE',
    title: 'Unclassified',
    description: 'Items not listed by GameRant yet (still searchable).',
    accent: '#94a3b8',
    collapsible: true,
  },
]

function loadStatuses(): Record<string, UserStatus> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed
  } catch (error) {
    console.warn('Unable to parse saved statuses', error)
    return {}
  }
}

function deriveConflict(item: ItemWithStatus) {
  if (QUEST_GUIDE_CATEGORIES.includes(item.guideCategory) && item.userStatus === 'RECYCLE') {
    return 'quest-warning'
  }
  if (item.guideCategory === 'SAFE_TO_RECYCLE' && item.userStatus === 'KEEP') {
    return 'over-keep'
  }
  return null
}

function getRarityStyle(rarity: string) {
  const key = rarity.toLowerCase()
  return rarityPalette[key] ?? { bg: 'linear-gradient(135deg, #111827, #1f2937)', border: '#64748b' }
}

function formatPrice(value: number | null) {
  if (!value) return '—'
  return `${value.toLocaleString()} LC`
}

function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [rarityFilter, setRarityFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState<'ALL' | UserStatus>('ALL')
  const [guideFilter, setGuideFilter] = useState<'ALL' | GuideCategory>('ALL')
  const [quickPreset, setQuickPreset] = useState<'NONE' | 'QUESTS' | 'SAFE'>('NONE')
  const [sortValue, setSortValue] = useState('name-asc')
  const [statuses] = useState<Record<string, UserStatus>>(() => loadStatuses())
  const [showUnclassified, setShowUnclassified] = useState(false)

  const strings = translations[language]

  const itemsWithStatus: ItemWithStatus[] = useMemo(
    () =>
      arcItems.map((item) => ({
        ...item,
        userStatus: statuses[item.id] ?? 'UNSET',
      })),
    [statuses],
  )

  const normalizedSearch = normalizeText(searchTerm)

  const filteredItems = useMemo(() => {
    const matchesGuideFilter = (item: ItemWithStatus) => {
      if (quickPreset === 'QUESTS') {
        return QUEST_GUIDE_CATEGORIES.includes(item.guideCategory)
      }
      if (quickPreset === 'SAFE') {
        return item.guideCategory === 'SAFE_TO_RECYCLE'
      }
      if (guideFilter === 'ALL') {
        return true
      }
      return item.guideCategory === guideFilter
    }

    return itemsWithStatus
      .filter((item) =>
        normalizedSearch ? item.searchIndex.includes(normalizedSearch) : true,
      )
      .filter((item) => (categoryFilter === 'ALL' ? true : item.category === categoryFilter))
      .filter((item) => (rarityFilter === 'ALL' ? true : item.rarity === rarityFilter))
      .filter((item) => (userFilter === 'ALL' ? true : item.userStatus === userFilter))
      .filter((item) => matchesGuideFilter(item))
      .sort((a, b) => {
        switch (sortValue) {
          case 'name-desc':
            return a.name_en.localeCompare(b.name_en) * -1
          case 'rarity':
            return a.rarity.localeCompare(b.rarity)
          case 'category':
            return a.category.localeCompare(b.category)
          case 'name-asc':
          default:
            return a.name_en.localeCompare(b.name_en)
        }
      })
  }, [
    itemsWithStatus,
    normalizedSearch,
    categoryFilter,
    rarityFilter,
    userFilter,
    guideFilter,
    quickPreset,
    sortValue,
  ])

  const groupedByGuide = useMemo(() => {
    const buckets: Record<GuideCategory, ItemWithStatus[]> = {
      KEEP_FOR_QUESTS: [],
      KEEP_FOR_PROJECTS: [],
      SAFE_TO_RECYCLE: [],
      WORKSHOP_UPGRADE: [],
      NONE: [],
    }
    filteredItems.forEach((item) => {
      const bucket = buckets[item.guideCategory] ?? buckets.NONE
      bucket.push(item)
    })
    return buckets
  }, [filteredItems])

  const toggleQuickPreset = (preset: 'QUESTS' | 'SAFE') => {
    setQuickPreset((prev) => (prev === preset ? 'NONE' : preset))
    setGuideFilter('ALL')
  }

  const handleQuickQuest = () => {
    toggleQuickPreset('QUESTS')
  }

  const handleQuickRecycle = () => {
    toggleQuickPreset('SAFE')
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('ALL')
    setRarityFilter('ALL')
    setUserFilter('ALL')
    setGuideFilter('ALL')
    setSortValue('name-asc')
    setQuickPreset('NONE')
    setShowUnclassified(false)
  }

  if (!hasBaseData) {
    return (
      <div className="app missing-data">
        <p>{strings.missingData}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>ARC Raiders Loot Recycler</h1>
          <p>Filter what to keep or recycle.</p>
        </div>
        <div className="meta-info">
          <span>
            Item data by{' '}
            <a href="https://metaforge.app/arc-raiders" target="_blank" rel="noreferrer">
              MetaForge
            </a>
            {' | '}Guide based on GameRant&apos;s safe-to-sell list.
          </span>
          <div className="language-toggle">
            {(['en', 'fr'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                className={language === lang ? 'active' : ''}
                onClick={() => setLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="controls">
        <input
          type="search"
          placeholder={strings.searchPlaceholder}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <div className="selectors">
          <label>
            {strings.categoryLabel}
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="ALL">All</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            {strings.rarityLabel}
            <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
              <option value="ALL">All</option>
              {rarities.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity}
                </option>
              ))}
            </select>
          </label>
          <label>
            {strings.statusLabel}
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value as UserStatus | 'ALL')}>
              <option value="ALL">All</option>
              {statusOptions.slice(0, 3).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {strings.guideLabel}
            <select
              value={guideFilter}
              onChange={(e) => {
                setGuideFilter(e.target.value as typeof guideFilter)
                setQuickPreset('NONE')
              }}
            >
              {guideFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="quick-actions">
          <button
            type="button"
            className={quickPreset === 'SAFE' ? 'active' : undefined}
            onClick={handleQuickRecycle}
          >
            {strings.recycleQuick}
          </button>
          <button
            type="button"
            className={quickPreset === 'QUESTS' ? 'active' : undefined}
            onClick={handleQuickQuest}
          >
            {strings.questQuick}
          </button>
          <button type="button" className="ghost" onClick={clearFilters}>
            {strings.clearFilters}
          </button>
        </div>
      </section>

      <section className="items-section">
        <div className="results-info">
          Showing {filteredItems.length} of {arcItems.length} items
        </div>
        {filteredItems.length === 0 ? (
          <p className="empty-state">{strings.noResults}</p>
        ) : (
          sectionLayout.map((section) => {
            const items = groupedByGuide[section.key]
            if (
              (section.key === 'KEEP_FOR_QUESTS' ||
                section.key === 'KEEP_FOR_PROJECTS' ||
                section.key === 'WORKSHOP_UPGRADE') &&
              items.length === 0
            ) {
              return null
            }
            if (section.collapsible && !showUnclassified && items.length > 0) {
              return (
                <div key={section.key} className="cheat-section collapsed" style={{ borderColor: section.accent }}>
                  <div className="section-header">
                    <div>
                      <h2>{section.title}</h2>
                      <p>{section.description}</p>
                    </div>
                    <button type="button" onClick={() => setShowUnclassified(true)}>
                      {strings.showUnclassified} ({items.length})
                    </button>
                  </div>
                </div>
              )
            }

            if (items.length === 0) {
              return (
                <div key={section.key} className="cheat-section" style={{ borderColor: section.accent }}>
                  <div className="section-header">
                    <div>
                      <h2>{section.title}</h2>
                      <p>{section.description}</p>
                    </div>
                  </div>
                  <p className="section-empty">{strings.sectionEmpty}</p>
                </div>
              )
            }

            return (
              <div
                key={section.key}
                className="cheat-section"
                style={{ borderColor: section.accent }}
              >
                <div className="section-header">
                  <div>
                    <h2>
                      {section.title} <span>({items.length})</span>
                    </h2>
                    <p>{section.description}</p>
                  </div>
                  {section.collapsible ? (
                    <button type="button" onClick={() => setShowUnclassified(false)}>
                      {strings.hideUnclassified}
                    </button>
                  ) : null}
                </div>
                <div className="card-grid">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} strings={strings} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </section>

      <footer className="app-footer">
        Item data provided by{' '}
        <a href="https://metaforge.app/arc-raiders" target="_blank" rel="noreferrer">
          MetaForge
        </a>
        . Guide categories derived from{' '}
        <a
          href="https://gamerant.com/arc-raiders-which-item-safe-sell-should-you-recycle-guide-list/"
          target="_blank"
          rel="noreferrer"
        >
          GameRant&apos;s safe-to-sell article
        </a>
        .
      </footer>
    </div>
  )
}

function ItemCard({
  item,
  strings,
}: {
  item: ItemWithStatus
  strings: CopyDictionary
}) {
  const conflict = deriveConflict(item)
  const guideLabel = guideCategoryLabels[item.guideCategory]
  const rarityStyle = getRarityStyle(item.rarity)
  const price = formatPrice(item.sellPrice ?? item.baseValue ?? null)

  return (
    <article className={`item-card ${conflict ?? ''}`}>
      <div className="card-image" style={{ background: rarityStyle.bg, borderColor: rarityStyle.border }}>
        {item.icon ? (
          <img src={item.icon} alt={item.name_en} loading="lazy" />
        ) : (
          <div className="placeholder">No art</div>
        )}
        <span className="rarity-chip" style={{ borderColor: rarityStyle.border }}>
          {item.rarity}
        </span>
      </div>
      <div className="card-body">
        <div className="card-heading">
          <div>
            <h3>
              {item.name_fr ? (
                <>
                  {item.name_fr} <span>({item.name_en})</span>
                </>
              ) : (
                item.name_en
              )}
            </h3>
            <p className="meta">
              <span>{item.category}</span> • <span>{guideLabel}</span>
            </p>
          </div>
         <div className="price-tag">
            <span>{strings.sellLabel}</span>
            <strong>{price}</strong>
          </div>
        </div>
        {item.notes ? <p className="note-text">{item.notes}</p> : null}
        {item.recycles.length > 0 ? (
          <div className="recycle-info">
            <strong>{strings.recycleLabel}</strong>
            <ul>
              {item.recycles.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="badge-row">
          {item.quests.map((quest) => (
            <span key={quest} className="badge quest">
              Quest: {quest}
            </span>
          ))}
          {item.stations.map((station) => (
            <span key={station} className="badge station">
              {station}
            </span>
          ))}
        </div>
        {conflict === 'quest-warning' ? (
          <p className="conflict-text">Guide recommends keeping this item.</p>
        ) : null}
        {conflict === 'over-keep' ? (
          <p className="conflict-text subtle">Guide marks this as safe to recycle.</p>
        ) : null}
      </div>
    </article>
  )
}

export default App
