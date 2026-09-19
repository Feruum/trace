'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, ExternalLink, LoaderCircle, Send, Sparkles, X } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import type { ApplicantContext } from '@lib/locus/types'

type AssistantCitation = {
  chunkId: string
  sourceUrl: string
  sourceLabel: string
  quote: string
}

type AssistantClaim = {
  text: string
  citations: AssistantCitation[]
}

type AssistantResult = {
  status: 'ready'
  answer: {
    status: 'answered' | 'insufficient_evidence'
    answer: string
    explanation?: string
    refusalReason?: string
    claims: AssistantClaim[]
    citations: AssistantCitation[]
    model: string
    retrievedCount: number
  }
}

export default function SourceAssistant({ profileToken, applicant }: { profileToken: string; applicant?: ApplicantContext }) {
  const { i18n, t } = useTranslation()
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AssistantResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = question.trim()
    if (!value || pending) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    startedRef.current = Date.now()
    setElapsed(0)
    setPending(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/trace/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileToken,
          question: value,
          locale: i18n.language.startsWith('ru') ? 'ru' : 'en',
          ...(applicant && (applicant.exams.length > 0 || applicant.country || applicant.city || applicant.degree || applicant.field || applicant.interest || applicant.intake || applicant.budget) ? { applicant } : {}),
        }),
        signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || t('locus.error_title'))
      setResult(data as AssistantResult)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : t('locus.error_title'))
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (!pending) return
    const timer = window.setInterval(() => setElapsed(Date.now() - startedRef.current), 100)
    return () => window.clearInterval(timer)
  }, [pending])

  const answer = result?.answer
  const trace = (name: string) => `locus.trace_ui.${name}`
  return (
    <section className="rounded-3xl border border-teal-900/20 bg-[#dcebe4] p-6 sm:p-8" aria-labelledby="assistant-title">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-800 text-white"><Bot size={19} /></span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-900">{t('locus.grounded_assistant_label')}</p>
          <h2 id="assistant-title" className="mt-1 text-2xl font-black text-slate-950">{t(trace('assistant_title'))}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{t(trace('assistant_description'))}</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={ask}>
            <label htmlFor="trace-assistant-question" className="sr-only">{t(trace('assistant_title'))}</label>
            <Input id="trace-assistant-question" name="question" autoComplete="off" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t(trace('assistant_placeholder'))} maxLength={500} className="h-12 min-w-0 flex-1" />
            <Button type="submit" disabled={pending || !question.trim()} size="lg">{pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}{t(trace('assistant_submit'))}</Button>
          </form>
          {pending && <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-teal-900" role="status" aria-live="polite"><span className="flex items-center gap-2"><Sparkles size={14} aria-hidden="true" />{t(trace('assistant_pending'))} · {(elapsed / 1000).toFixed(1)} s</span><Button type="button" variant="outline" size="sm" onClick={() => abortRef.current?.abort()}><X size={13} aria-hidden="true" />{t(trace('assistant_cancel'))}</Button></div>}
          {error && <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950" role="alert">{error}</p>}
          {answer && <div className="mt-6 rounded-2xl border border-teal-900/15 bg-white p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{answer.status === 'answered' ? t(trace('assistant_answer')) : t(trace('assistant_insufficient'))}</p><details className="text-xs text-slate-400"><summary className="cursor-pointer">{answer.retrievedCount} · {answer.model}</summary></details></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{answer.answer}</p>{answer.status === 'insufficient_evidence' && (answer.explanation || answer.refusalReason) && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">{answer.explanation || answer.refusalReason}</p>}{answer.status === 'answered' && answer.claims.length > 0 && <div className="mt-5 space-y-4 border-t border-slate-200 pt-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t(trace('assistant_claims'))}</p>{answer.claims.map((claim, index) => <article key={`${claim.text}-${index}`} className="rounded-xl border border-slate-200 p-4"><p className="text-sm leading-6 text-slate-800">{claim.text}</p><div className="mt-3 space-y-2">{claim.citations.map((citation) => <a key={`${citation.chunkId}-${citation.sourceUrl}`} href={citation.sourceUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-xs leading-5 text-teal-900 underline-offset-4 hover:underline"><ExternalLink size={13} className="mt-1 shrink-0" aria-hidden="true" /><span>{citation.sourceLabel}: “{citation.quote}”</span></a>)}</div></article>)}</div>}{answer.status === 'answered' && answer.citations.length > 0 && <div className="mt-5 border-t border-slate-200 pt-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t(trace('assistant_sources'))}</p><div className="mt-3 flex flex-wrap gap-2">{answer.citations.map((citation) => <a key={`${citation.chunkId}-${citation.sourceUrl}`} href={citation.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-slate-50"><ExternalLink size={12} aria-hidden="true" />{citation.sourceLabel}</a>)}</div></div>}</div>}
        </div>
      </div>
    </section>
  )
}
