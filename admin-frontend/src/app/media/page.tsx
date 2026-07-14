import { MediaBrowser } from '@/components/media/MediaLibrary'

export default function MediaPage() {
  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Library</div>
          <div className="page-title">Media Library</div>
          <div className="page-desc">Browse images already stored across property, category, agent, and site content.</div>
        </div>
      </div>
      <MediaBrowser />
    </div>
  )
}
