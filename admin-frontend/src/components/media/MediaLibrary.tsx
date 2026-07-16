'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, FolderOpen, Images, LoaderCircle, Search } from 'lucide-react'
import api from '@/lib/api'
import {
  type MediaAsset,
  type MediaAssetCollection,
} from '@/lib/admin-queries'
import Modal from '@/components/ui/Modal'
import styles from './MediaLibrary.module.css'

export type { MediaAsset } from '@/lib/admin-queries'

export type MediaKind = 'image' | 'video'

function inferImageType(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'svg') return 'image/svg+xml'
  return extension ? `image/${extension}` : 'application/octet-stream'
}

function inferVideoType(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'mp4') return 'video/mp4'
  if (extension === 'webm') return 'video/webm'
  if (extension === 'ogg' || extension === 'ogv') return 'video/ogg'
  if (extension === 'mov') return 'video/quicktime'
  return extension ? `video/${extension}` : 'application/octet-stream'
}

export async function mediaAssetToFile(asset: MediaAsset, signal?: AbortSignal) {
  const response = await api.get<Blob>('/media-assets/download/', {
    params: { path: asset.path },
    responseType: 'blob',
    signal,
    timeout: 20_000,
  })
  const blob = response.data
  const modifiedAt = Date.parse(asset.modified_at)
  const inferredType = asset.kind === 'video'
    ? inferVideoType(asset.name)
    : inferImageType(asset.name)
  return new File([blob], asset.name, {
    type: blob.type || inferredType,
    lastModified: Number.isNaN(modifiedAt) ? Date.now() : modifiedAt,
  })
}

interface MediaBrowserProps {
  selectedPath?: string | null
  onSelect?: (asset: MediaAsset) => void
  disabled?: boolean
  mediaKind?: MediaKind
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function folderName(path: string) {
  const folder = path.split('/')[0]
  return folder && folder !== path ? folder : 'Root'
}

export function MediaBrowser({ selectedPath, onSelect, disabled = false, mediaKind = 'image' }: MediaBrowserProps) {
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState('All folders')
  const assetsQuery = useQuery({
    queryKey: mediaKind === 'video' ? ['media-assets', 'video'] : ['media-assets'],
    queryFn: async ({ signal }) => {
      const params = mediaKind === 'video' ? { kind: 'video' } : undefined
      const response = await api.get<MediaAssetCollection>('/media-assets/', { params, signal })
      return response.data
    },
    staleTime: 60_000,
  })

  const assets = useMemo(() => assetsQuery.data?.results ?? [], [assetsQuery.data])
  const folders = useMemo(() => (
    Array.from(new Set(assets.map(asset => folderName(asset.path)))).sort((left, right) => left.localeCompare(right))
  ), [assets])
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return assets.filter(asset => {
      if (folder !== 'All folders' && folderName(asset.path) !== folder) return false
      return !query || `${asset.name}\n${asset.path}`.toLocaleLowerCase().includes(query)
    })
  }, [assets, folder, search])

  if (assetsQuery.isLoading) {
    return (
      <div className={styles.state} role="status">
        <LoaderCircle aria-hidden="true" className="animate-spin" size={20} /> Loading {mediaKind === 'video' ? 'videos' : 'media library'}...
      </div>
    )
  }

  if (assetsQuery.isError) {
    return (
      <div className={styles.state} role="alert">
        <span>{mediaKind === 'video' ? 'Videos' : 'Media'} could not be loaded.</span>
        <button type="button" onClick={() => assetsQuery.refetch()}>Retry</button>
      </div>
    )
  }

  return (
    <div className={styles.browser}>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search aria-hidden="true" size={15} />
          <span className="sr-only">Search existing {mediaKind === 'video' ? 'videos' : 'images'}</span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={`Search ${mediaKind === 'video' ? 'videos' : 'images'}...`}
          />
        </label>
        <label className={styles.folderFilter}>
          <FolderOpen aria-hidden="true" size={14} />
          <span className="sr-only">Filter by folder</span>
          <select value={folder} onChange={event => setFolder(event.target.value)}>
            <option>All folders</option>
            {folders.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <span className={styles.count}>{filtered.length} {mediaKind === 'video' ? 'video' : 'image'}{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map(asset => {
            const selected = asset.path === selectedPath
            const content = (
              <>
                <span className={styles.thumbnail}>
                  {mediaKind === 'video' || asset.kind === 'video' ? (
                    <video src={asset.url} preload="metadata" muted playsInline />
                  ) : (
                    <Image src={asset.url} alt="" fill sizes="150px" unoptimized />
                  )}
                  {selected ? <span className={styles.selectedMark}><Check aria-hidden="true" size={14} /></span> : null}
                </span>
                <span className={styles.assetCopy}>
                  <strong title={asset.name}>{asset.name}</strong>
                  <span>{folderName(asset.path)} · {formatFileSize(asset.size)}</span>
                </span>
              </>
            )
            return onSelect ? (
              <button
                type="button"
                key={asset.path}
                className={styles.asset}
                data-selected={selected}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onSelect(asset)}
              >
                {content}
              </button>
            ) : (
              <article key={asset.path} className={styles.asset}>{content}</article>
            )
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <Images aria-hidden="true" size={28} />
          <strong>No matching {mediaKind === 'video' ? 'videos' : 'images'}</strong>
          <span>Try another search or folder.</span>
        </div>
      )}
    </div>
  )
}

interface MediaPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (file: File, asset: MediaAsset) => void | Promise<void>
  title?: string
  mediaKind?: MediaKind
}

export default function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  title = 'Choose Existing Image',
  mediaKind = 'image',
}: MediaPickerDialogProps) {
  const [selected, setSelected] = useState<MediaAsset | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const downloadControllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => downloadControllerRef.current?.abort(), [])

  const closePicker = () => {
    downloadControllerRef.current?.abort()
    downloadControllerRef.current = null
    setDownloading(false)
    setSelected(null)
    setError('')
    onClose()
  }

  const confirmSelection = async () => {
    if (!selected || downloading) return
    const selectedAsset = selected
    const controller = new AbortController()
    downloadControllerRef.current = controller
    setDownloading(true)
    setError('')
    try {
      const file = await mediaAssetToFile(selectedAsset, controller.signal)
      if (controller.signal.aborted) return
      await onSelect(file, selectedAsset)
      if (controller.signal.aborted) return
      setSelected(null)
      onClose()
    } catch {
      if (!controller.signal.aborted) {
        setError(`The selected ${mediaKind === 'video' ? 'video' : 'image'} could not be prepared. Try another ${mediaKind === 'video' ? 'video' : 'image'}.`)
      }
    } finally {
      if (downloadControllerRef.current === controller) {
        downloadControllerRef.current = null
        setDownloading(false)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={closePicker}
      title={title}
      description={`Select a ${mediaKind === 'video' ? 'video' : 'image'} already stored in the media library.`}
      size="lg"
      layer="nested"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={closePicker} disabled={downloading}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void confirmSelection()} disabled={!selected || downloading}>
            {downloading
              ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
              : <Check aria-hidden="true" size={15} />}
            {downloading ? 'Preparing...' : mediaKind === 'video' ? 'Use Video' : 'Use Image'}
          </button>
        </>
      )}
    >
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      <MediaBrowser selectedPath={selected?.path} onSelect={setSelected} disabled={downloading} mediaKind={mediaKind} />
    </Modal>
  )
}
