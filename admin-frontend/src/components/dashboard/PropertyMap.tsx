'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Property } from './types'
import styles from './Dashboard.module.css'

type Coordinates = [number, number]
type MapStatus = 'idle' | 'loading' | 'ready' | 'error'

const ADDIS_CENTER: Coordinates = [9.0054, 38.7891]
const NEIGHBORHOOD_COORDINATES: ReadonlyArray<readonly [string, Coordinates]> = [
  ['Bole Atlas', [8.999, 38.785]],
  ['Bole Arabsa', [8.975, 38.845]],
  ['Old Airport', [8.984, 38.757]],
  ['Kazanchis', [9.018, 38.763]],
  ['Summit', [9.01, 38.83]],
  ['Kirkos', [9.01, 38.755]],
  ['Ayat', [9.0154, 38.8636]],
  ['CMC', [9.0269, 38.8072]],
  ['Bole', [8.9959, 38.7891]],
]

function seededJitter(id: number) {
  const value = Math.sin(id * 999) * 10000
  return value - Math.floor(value) - 0.5
}

function propertyCoordinates(property: Property): Coordinates {
  const location = property.property_location.toLocaleLowerCase()
  const match = NEIGHBORHOOD_COORDINATES.find(([name]) => location.includes(name.toLocaleLowerCase()))
  const base = match?.[1] ?? ADDIS_CENTER
  return [
    base[0] + seededJitter(property.id) * 0.012,
    base[1] + seededJitter(property.id + 500) * 0.012,
  ]
}

function appendText(parent: HTMLElement, className: string, value: string) {
  const element = document.createElement('div')
  element.className = className
  element.textContent = value
  parent.appendChild(element)
  return element
}

function popupContent(property: Property) {
  const root = document.createElement('div')
  root.className = styles.balloon

  if (property.main_image) {
    const image = document.createElement('img')
    image.src = property.main_image
    image.alt = property.property_title
    image.loading = 'lazy'
    root.appendChild(image)
  }

  const body = document.createElement('div')
  body.className = styles.balloonBody
  root.appendChild(body)

  appendText(body, styles.balloonTitle, property.property_title || 'Untitled property')
  appendText(body, styles.balloonLocation, property.property_location || 'Addis Ababa')
  appendText(body, styles.balloonPrice, property.price || 'Price on request')

  const meta = document.createElement('div')
  meta.className = styles.balloonMeta
  body.appendChild(meta)

  const status = document.createElement('span')
  status.className = `chip ${property.property_status === 'For Rent' ? 'chip-success' : 'chip-brass'}`
  status.textContent = property.property_status || 'For Sale'
  meta.appendChild(status)

  const category = document.createElement('span')
  category.textContent = property.category_name || 'Uncategorized'
  meta.appendChild(category)

  const rooms = [
    property.bedrooms ? `${property.bedrooms} bd` : '',
    property.bathrooms ? `${property.bathrooms} ba` : '',
  ].filter(Boolean).join(' · ')
  if (rooms) {
    const roomDetails = document.createElement('span')
    roomDetails.textContent = rooms
    meta.appendChild(roomDetails)
  }

  appendText(body, styles.balloonAgent, `Agent: ${property.agent_name || 'Unassigned'}`)

  const link = document.createElement('a')
  link.className = styles.balloonButton
  link.href = '/properties'
  link.textContent = 'View / Edit Listing'
  body.appendChild(link)

  return root
}

export default function PropertyMap({ properties }: { properties: Property[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<MapStatus>(properties.length ? 'loading' : 'idle')

  useEffect(() => {
    const container = containerRef.current
    if (!container || properties.length === 0) {
      setStatus('idle')
      return
    }

    let disposed = false
    let map: LeafletMap | null = null
    let resizeTimer: number | null = null
    setStatus('loading')

    async function initializeMap() {
      try {
        const L = await import('leaflet')
        if (disposed || !container) return

        map = L.map(container, {
          scrollWheelZoom: false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView(ADDIS_CENTER, 12)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        const bounds: Coordinates[] = []
        properties.forEach((property) => {
          const coordinates = propertyCoordinates(property)
          bounds.push(coordinates)
          const isRent = property.property_status === 'For Rent'
          const markerIcon = L.divIcon({
            html: `<div class="${styles.pin}"><div class="${styles.pinBody} ${isRent ? styles.rent : ''}"><div class="${styles.pinDot}"></div></div></div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 28],
            popupAnchor: [0, -26],
          })

          L.marker(coordinates, { icon: markerIcon })
            .addTo(map as LeafletMap)
            .bindPopup(popupContent(property), { maxWidth: 280 })
        })

        if (bounds.length > 0) {
          map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 14 })
        }
        map.whenReady(() => {
          if (!disposed) setStatus('ready')
        })
        resizeTimer = window.setTimeout(() => map?.invalidateSize(), 150)
      } catch {
        if (!disposed) setStatus('error')
      }
    }

    void initializeMap()
    return () => {
      disposed = true
      if (resizeTimer !== null) window.clearTimeout(resizeTimer)
      map?.stop()
      map?.remove()
    }
  }, [properties])

  if (properties.length === 0) {
    return (
      <div className={`map-wrap ${styles.map} ${styles.mapEmpty}`}>
        <span>No property locations to display yet.</span>
      </div>
    )
  }

  return (
    <div className={styles.mapFrame}>
      <div ref={containerRef} className={`map-wrap ${styles.map}`} aria-label="Map of property locations in Addis Ababa" />
      {status !== 'ready' && (
        <div className={styles.mapStatus} role="status">
          {status === 'error' ? 'The property map could not be loaded.' : 'Loading property map…'}
        </div>
      )}
    </div>
  )
}
