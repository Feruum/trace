import type { Metadata } from 'next'
import TraceMarketingLanding from '@components/TraceLanding/TraceMarketingLanding'

export const metadata: Metadata = {
  title: 'TRACE — Университеты с доказательствами',
  description: 'Проверяйте открытые источники о кампусе и студенческой жизни, сравнивайте покрытие и видьте ограничения данных.',
}

export default function HomePage() {
  return <TraceMarketingLanding />
}
