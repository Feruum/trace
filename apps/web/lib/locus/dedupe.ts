import { lookup } from 'node:dns/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import type { LocusFetch } from './http'
import { isSafeRemoteMediaUrl, isSafeResolvedAddress, normalizeHttpUrl } from './provenance'
import type { PhotoAsset, SourceKind } from './types'
const HASH_SIZE = 16
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const HASH_TIMEOUT_MS = 5_000
const MAX_HAMMING_DISTANCE = 12
const HASH_CONCURRENCY = 6

export interface DedupeResult {
  assets: PhotoAsset[]
  duplicatesRemoved: number
  warnings: string[]
}

export interface DedupeOptions {
  fetchImpl?: LocusFetch
  deadline?: number
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    parsed.hostname = parsed.hostname.toLocaleLowerCase()
    return parsed.toString()
  } catch {
    return url.trim()
  }
}

function area(asset: PhotoAsset): number {
  return (asset.width ?? 0) * (asset.height ?? 0)
}

function sourceTieBreak(source: SourceKind): number {
  return source === 'wikimedia_commons' ? 1 : 0
}

function prefer(left: PhotoAsset, right: PhotoAsset): PhotoAsset {
  if (left.confidence.score !== right.confidence.score) return left.confidence.score > right.confidence.score ? left : right
  if (area(left) !== area(right)) return area(left) > area(right) ? left : right
  return sourceTieBreak(left.source) >= sourceTieBreak(right.source) ? left : right
}

function hammingDistance(left: Uint8Array, right: Uint8Array): number {
  let distance = 0
  for (let index = 0; index < left.length; index += 1) {
    let value = (left[index] ?? 0) ^ (right[index] ?? 0)
    while (value !== 0) {
      distance += value & 1
      value >>>= 1
    }
  }
  return distance
}

async function downloadHash(
  asset: PhotoAsset,
  fetchImpl: LocusFetch,
  deadline?: number,
  production = false,
): Promise<{ exact: string; perceptual: Uint8Array } | null> {
  const remaining = deadline === undefined ? HASH_TIMEOUT_MS : Math.min(HASH_TIMEOUT_MS, deadline - Date.now())
  if (remaining <= 0) return null
  const initialUrl = normalizeHttpUrl(asset.thumbnailUrl)
  if (!initialUrl || !isSafeRemoteMediaUrl(initialUrl)) return null
  if (production) {
    try {
      const hostname = new URL(initialUrl).hostname
      const addresses = await lookup(hostname, { all: true, verbatim: true })
      if (!addresses.length || addresses.some((entry) => !isSafeResolvedAddress(entry.address))) return null
    } catch {
      return null
    }
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), remaining)
  try {
    const response = await fetchImpl(initialUrl, { cache: 'no-store', redirect: 'manual', signal: controller.signal })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      const redirectUrl = location ? normalizeHttpUrl(new URL(location, initialUrl).toString()) : null
      if (!redirectUrl || !isSafeRemoteMediaUrl(redirectUrl)) return null
      if (production) {
        try {
          const addresses = await lookup(new URL(redirectUrl).hostname, { all: true, verbatim: true })
          if (!addresses.length || addresses.some((entry) => !isSafeResolvedAddress(entry.address))) return null
        } catch {
          return null
        }
      }
      return null
    }
    if (!response.ok) return null
    const contentLength = Number(response.headers.get('content-length') ?? '0')
    if (contentLength > MAX_IMAGE_BYTES) return null
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null
    const bytes = new Uint8Array(buffer)
    const grayscale = await sharp(bytes).resize(HASH_SIZE, HASH_SIZE, { fit: 'fill' }).grayscale().raw().toBuffer()
    const average = grayscale.reduce((sum, value) => sum + value, 0) / grayscale.length
    const perceptual = new Uint8Array(Math.ceil(grayscale.length / 8))
    for (let index = 0; index < grayscale.length; index += 1) {
      if ((grayscale[index] ?? 0) >= average) perceptual[Math.floor(index / 8)] |= 1 << (index % 8)
    }
    return { exact: createHash('sha256').update(bytes).digest('hex'), perceptual }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function dedupeAssets(input: PhotoAsset[], options: DedupeOptions = {}): Promise<DedupeResult> {
  const production = options.fetchImpl === undefined
  const fetchImpl = options.fetchImpl ?? fetch
  const exactUrlSeen = new Set<string>()
  const uniqueByUrl: PhotoAsset[] = []
  for (const asset of input) {
    const url = normalizeUrl(asset.imageUrl)
    if (exactUrlSeen.has(url)) continue
    exactUrlSeen.add(url)
    uniqueByUrl.push(asset)
  }
  const hashedByIndex: Array<{ asset: PhotoAsset; exact: string; perceptual: Uint8Array } | null> = Array(uniqueByUrl.length).fill(null)
  const unavailableByIndex: Array<PhotoAsset | null> = Array(uniqueByUrl.length).fill(null)
  let cursor = 0
  const worker = async () => {
    while (true) {
      const index = cursor
      cursor += 1
      const asset = uniqueByUrl[index]
      if (!asset) return
      const hash = isSafeRemoteMediaUrl(asset.thumbnailUrl) ? await downloadHash(asset, fetchImpl, options.deadline, production) : null
      if (!hash) unavailableByIndex[index] = { ...asset, visualDeduplication: 'unavailable' }
      else hashedByIndex[index] = { asset: { ...asset, visualDeduplication: 'checked' }, ...hash }
    }
  }
  await Promise.all(Array.from({ length: Math.min(HASH_CONCURRENCY, uniqueByUrl.length) }, () => worker()))

  const hashed = hashedByIndex.filter((item): item is { asset: PhotoAsset; exact: string; perceptual: Uint8Array } => item !== null)
  const unavailable = unavailableByIndex.filter((item): item is PhotoAsset => item !== null)
  const warnings = unavailable.map((asset) => `Не удалось визуально проверить изображение «${asset.title}».`)
  const kept: Array<{ asset: PhotoAsset; exact: string; perceptual: Uint8Array }> = []
  let duplicatesRemoved = input.length - uniqueByUrl.length
  for (const item of hashed) {
    const exactDuplicate = kept.find((existing) => existing.exact === item.exact)
    if (exactDuplicate) {
      const winner = prefer(exactDuplicate.asset, item.asset)
      if (winner === item.asset) kept[kept.indexOf(exactDuplicate)] = item
      duplicatesRemoved += 1
      continue
    }
    const visualDuplicate = kept.find((existing) => hammingDistance(existing.perceptual, item.perceptual) <= MAX_HAMMING_DISTANCE)
    if (visualDuplicate) {
      const winner = prefer(visualDuplicate.asset, item.asset)
      if (winner === item.asset) kept[kept.indexOf(visualDuplicate)] = item
      duplicatesRemoved += 1
      continue
    }
    kept.push(item)
  }

  const categoryOrder: Record<string, number> = { campus: 0, dormitory: 1, classroom: 2, library: 3, city: 4, sport: 5, laboratory: 6, student_life: 7 }
  const compareAssets = (left: PhotoAsset, right: PhotoAsset): number => {
    const category = (categoryOrder[left.primaryCategory] ?? 99) - (categoryOrder[right.primaryCategory] ?? 99)
    if (category !== 0) return category
    if (right.confidence.score !== left.confidence.score) return right.confidence.score - left.confidence.score
    const source = sourceTieBreak(right.source) - sourceTieBreak(left.source)
    if (source !== 0) return source
    const url = normalizeUrl(left.landingUrl).localeCompare(normalizeUrl(right.landingUrl))
    return url !== 0 ? url : left.id.localeCompare(right.id)
  }
  const sortedAssets = [...kept.map((item) => item.asset), ...unavailable].sort(compareAssets)
  const sortedWarnings = [...new Set(sortedAssets.filter((asset) => asset.visualDeduplication === 'unavailable').map((asset) => `Не удалось визуально проверить изображение «${asset.title}».`))]
  return { assets: sortedAssets, duplicatesRemoved, warnings: sortedWarnings }
}
