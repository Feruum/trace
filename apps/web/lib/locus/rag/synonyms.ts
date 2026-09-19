export const SYNONYM_GROUPS = {
  campus: ['campus', 'university grounds', 'main building', 'кампус', 'территория университета', 'главный корпус'],
  dormitory: ['dormitory', 'student residence', 'residence hall', 'housing', 'общежитие', 'студенческое общежитие'],
  classroom: ['classroom', 'lecture hall', 'auditorium', 'аудитория', 'лекционный зал'],
  library: ['library', 'библиотека'],
  city: ['city', 'landmark', 'street', 'город', 'ориентир', 'улица'],
  sport: ['sport', 'sports', 'athletics', 'stadium', 'спорт', 'спортивный', 'стадион'],
  laboratory: ['laboratory', 'lab', 'research lab', 'лаборатория', 'исследовательская лаборатория'],
  student_life: ['student life', 'students', 'campus event', 'студенческая жизнь', 'студенты', 'мероприятие кампуса'],
  admissions: ['admission', 'admissions', 'apply', 'application', 'requirement', 'requirements', 'minimum', 'score', 'exam', 'program', 'degree', 'intake', 'поступление', 'поступать', 'требование', 'требования', 'минимум', 'балл', 'экзамен', 'программа', 'степень', 'набор'],
  IELTS: ['ielts', 'айелтс'],
  TOEFL: ['toefl', 'тоефл'],
  SAT: ['sat'],
  ACT: ['act'],
  Duolingo: ['duolingo', 'duolingo english test'],
  GRE: ['gre'],
  GMAT: ['gmat'],
  GPA: ['gpa', 'средний балл'],
} as const

/** A bidirectional token/phrase map. Values are canonical group names. */
export const SYNONYM_DICTIONARY: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(SYNONYM_GROUPS).flatMap(([canonical, values]) => values.map((value) => [value, canonical]))),
)

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/ё/g, 'е').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Expand a question or text into canonical and bilingual synonym tokens. */
export function expandSynonyms(values: Iterable<string> | string): Set<string> {
  const source = typeof values === 'string' ? [values] : values
  const text = Array.from(source).map(normalized).join(' ')
  const result = new Set<string>(text.match(/[\p{L}\p{N}]+/gu) ?? [])
  for (const [phrase, canonical] of Object.entries(SYNONYM_DICTIONARY)) {
    if (text.includes(normalized(phrase))) {
      result.add(canonical.toLocaleLowerCase())
      for (const token of normalized(phrase).match(/[\p{L}\p{N}]+/gu) ?? []) result.add(token)
    }
  }
  return result
}

export function canonicalSynonym(value: string): string | null {
  return SYNONYM_DICTIONARY[normalized(value)] ?? null
}
