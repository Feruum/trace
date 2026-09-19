'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplicantContext, ApplicantExam, ApplicantExamName } from '@lib/locus/types'

const EXAM_NAMES: ApplicantExamName[] = ['IELTS', 'TOEFL', 'SAT', 'ACT', 'Duolingo', 'GRE', 'GMAT', 'GPA']

export default function ApplicantOnboarding({ value, onChange, titleKey = 'locus.applicant_title', descriptionKey = 'locus.applicant_description' }: { value: ApplicantContext; onChange: (_value: ApplicantContext) => void; titleKey?: string; descriptionKey?: string }) {
  const { t } = useTranslation()
  const [examName, setExamName] = useState<ApplicantExamName>('IELTS')
  const [examScore, setExamScore] = useState('')
  const [sectionScore, setSectionScore] = useState('')
  const set = (patch: Partial<ApplicantContext>) => onChange({ ...value, ...patch })
  const addExam = () => {
    const score = Number(examScore)
    if (!Number.isFinite(score) || score < 0) return
    const section = Number(sectionScore)
    const exam: ApplicantExam = { name: examName, score, ...(Number.isFinite(section) && section >= 0 ? { sections: { band: section } } : {}) }
    set({ exams: [...value.exams.filter((item) => item.name !== examName), exam] })
    setExamScore('')
    setSectionScore('')
  }
  const removeExam = (name: ApplicantExamName) => set({ exams: value.exams.filter((item) => item.name !== name) })
  return (
    <details className="mb-8 rounded-2xl border border-teal-900/20 bg-[#dcebe4] p-5" open={value.exams.length > 0 || Boolean(value.country || value.city || value.degree || value.field || value.interest || value.intake || value.budget)}>
      <summary className="cursor-pointer text-sm font-bold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">{t(titleKey)}</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input name="country" autoComplete="country-name" aria-label={t('locus.applicant_country')} value={value.country ?? ''} onChange={(event) => set({ country: event.target.value })} placeholder={t('locus.applicant_country')} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm" />
        <input name="city" autoComplete="address-level2" aria-label={t('locus.applicant_city')} value={value.city ?? ''} onChange={(event) => set({ city: event.target.value })} placeholder={t('locus.applicant_city')} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm" />
        <input name="field" autoComplete="off" aria-label={t('locus.applicant_field')} value={value.field ?? ''} onChange={(event) => set({ field: event.target.value })} placeholder={t('locus.applicant_field')} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm" />
        <input name="interest" autoComplete="off" aria-label={t('locus.applicant_interest')} value={value.interest ?? ''} onChange={(event) => set({ interest: event.target.value })} placeholder={t('locus.applicant_interest')} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm" />
        <select name="degree" autoComplete="off" aria-label={t('locus.applicant_degree')} value={value.degree ?? ''} onChange={(event) => set({ degree: (event.target.value || undefined) as ApplicantContext['degree'] })} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm">
          <option value="">{t('locus.applicant_degree')}</option><option value="bachelor">Bachelor</option><option value="master">Master</option><option value="phd">PhD</option>
        </select>
        <select name="budget" autoComplete="off" aria-label={t('locus.applicant_budget')} value={value.budget ?? ''} onChange={(event) => set({ budget: event.target.value || undefined })} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm">
          <option value="">{t('locus.applicant_budget')}</option><option value="under-15k">{t('locus.budget_under_15k')}</option><option value="15-30k">{t('locus.budget_15_30k')}</option><option value="30k-plus">{t('locus.budget_30k_plus')}</option><option value="flexible">{t('locus.budget_flexible')}</option>
        </select>
        <input name="intake" autoComplete="off" aria-label={t('locus.applicant_intake')} value={value.intake ?? ''} onChange={(event) => set({ intake: event.target.value })} placeholder={t('locus.applicant_intake')} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm" />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <select name="exam" autoComplete="off" aria-label={t('locus.applicant_exam')} value={examName} onChange={(event) => setExamName(event.target.value as ApplicantExamName)} className="min-h-11 rounded-xl border border-teal-900/20 bg-white px-3 text-sm">{EXAM_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        <input name="score" autoComplete="off" inputMode="decimal" aria-label={t('locus.applicant_score')} type="number" min="0" value={examScore} onChange={(event) => setExamScore(event.target.value)} placeholder={t('locus.applicant_score')} className="min-h-11 w-full rounded-xl border border-teal-900/20 bg-white px-3 text-sm sm:w-40" />
        {examName === 'IELTS' && <input name="section-score" autoComplete="off" inputMode="decimal" aria-label={t('locus.applicant_section_score')} type="number" min="0" value={sectionScore} onChange={(event) => setSectionScore(event.target.value)} placeholder={t('locus.applicant_section_score')} className="min-h-11 w-full rounded-xl border border-teal-900/20 bg-white px-3 text-sm sm:w-40" />}
        <button type="button" onClick={addExam} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-teal-800">{t('locus.applicant_add_exam')}</button>
      </div>
      {value.exams.length > 0 && <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-teal-950">{value.exams.map((exam) => <span key={exam.name} className="inline-flex items-center gap-2 rounded-full border border-teal-900/20 bg-white px-3 py-1.5">{exam.name}: {exam.score}{exam.sections?.band !== undefined ? ` · ${exam.sections.band}` : ''}<button type="button" onClick={() => removeExam(exam.name)} className="rounded-full px-1 text-slate-500 hover:bg-slate-100" aria-label={`${t('locus.applicant_remove_exam')} ${exam.name}`}>×</button></span>)}</div>}
      <p className="mt-3 text-xs leading-5 text-slate-600">{t('locus.applicant_disclaimer')}</p>
    </details>
  )
}
