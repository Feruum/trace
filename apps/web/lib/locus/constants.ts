import type { LocusCategory } from './types'

export const CATEGORY_SEARCH_TERMS: Record<LocusCategory, string[]> = {
  campus: ['campus', 'university grounds', 'main building'],
  dormitory: ['dormitory', 'student residence', 'residence hall'],
  classroom: ['classroom', 'lecture hall', 'auditorium'],
  library: ['library'],
  city: ['landmark', 'street', 'city'],
  sport: ['sports', 'stadium', 'athletics'],
  laboratory: ['laboratory', 'research lab'],
  student_life: ['students', 'student life', 'campus event'],
}

export const CATEGORY_LABELS: Record<LocusCategory, { ru: string; en: string }> = {
  campus: { ru: 'Кампус', en: 'Campus' },
  dormitory: { ru: 'Общежитие', en: 'Dormitory' },
  classroom: { ru: 'Аудитории', en: 'Classrooms' },
  library: { ru: 'Библиотека', en: 'Library' },
  city: { ru: 'Город', en: 'City' },
  sport: { ru: 'Спорт', en: 'Sport' },
  laboratory: { ru: 'Лаборатории', en: 'Laboratories' },
  student_life: { ru: 'Студенческая жизнь', en: 'Student life' },
}

export const CORE_CATEGORIES: LocusCategory[] = ['campus', 'dormitory', 'classroom', 'library', 'city']
export const FILTER_CATEGORIES: LocusCategory[] = ['dormitory', 'sport', 'laboratory', 'student_life']
export const MAX_PROVIDER_RESULTS_PER_QUERY = 10
export const CATEGORY_QUOTA = 5
export const PROVIDER_CONCURRENCY = 4
export const PROVIDER_RESPONSE_TTL_MS = 30_000
export const MAX_CANDIDATES_BEFORE_HASHING = 40
export const MAX_ASSETS = 24
export const MAX_ASSETS_PER_CATEGORY = 4
export const MIN_CONFIDENCE_SCORE = 55
export const HIGH_CONFIDENCE_SCORE = 70
export const PIPELINE_DEADLINE_MS = 24_000
