'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import {
  aboutClosing,
  aboutHero,
  aboutParagraphs,
  aboutWhyChooseUs,
  coreValues,
  footerLine,
  processSteps,
  services,
  servicesHero,
  servicesParagraphs,
  servicesWhyChooseUs,
  visionMission,
  type ReasonItem,
} from './data'
import './about-services.css'

type TabId = 'about' | 'services'

const TABS: { id: TabId; label: string }[] = [
  { id: 'about', label: 'About Us' },
  { id: 'services', label: 'Services' },
]

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getHashTab(): TabId {
  return window.location.hash === '#services' ? 'services' : 'about'
}

function getServerHashTab(): TabId {
  return 'about'
}

function setHash(tab: TabId) {
  window.location.hash = tab
}

function BoldSegments({ text }: { text: string }) {
  const parts = text.split('**')
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  )
}

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="as-img-ph as-ratio-4-3">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span className="as-img-ph-label">{label}</span>
    </div>
  )
}

function Hero({ eyebrow, title, lead, placeholder }: { eyebrow: string; title: string; lead: string; placeholder: string }) {
  return (
    <div className="as-hero">
      <div>
        <span className="as-hero-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="as-lead">{lead}</p>
      </div>
      <ImagePlaceholder label={placeholder} />
    </div>
  )
}

function BlockHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="as-block-head">
      <span className="as-block-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {sub ? <p className="as-block-sub">{sub}</p> : null}
    </div>
  )
}

function ReasonCards({ items, cols }: { items: ReasonItem[]; cols: 2 | 3 }) {
  return (
    <div className={`as-grid ${cols === 2 ? 'as-cols-2' : 'as-cols-3'}`}>
      {items.map(item => (
        <div key={item.title} className="as-card">
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </div>
      ))}
    </div>
  )
}

function Chevron() {
  return (
    <svg className="as-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function AboutPanel() {
  return (
    <>
      <Hero {...aboutHero} />

      <section className="as-block">
        <div className="as-prose">
          {aboutParagraphs.map((paragraph, i) => (
            <p key={i}>
              <BoldSegments text={paragraph} />
            </p>
          ))}
        </div>
      </section>

      <section className="as-block">
        <div className="as-vm-grid">
          <div className="as-vm-card">
            <h3>Our Vision</h3>
            <p>{visionMission.vision}</p>
          </div>
          <div className="as-vm-card as-alt">
            <h3>Our Mission</h3>
            <p>{visionMission.mission}</p>
          </div>
        </div>
      </section>

      <section className="as-block">
        <BlockHead eyebrow="What we stand for" title="Our Core Values" />
        <div className="as-grid as-cols-4">
          {coreValues.map(value => (
            <div key={value.tag} className="as-value-card">
              <span className="as-value-tag">{value.tag}</span>
              <p>{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="as-block">
        <BlockHead eyebrow="Why choose us" title="Why Choose Signature Property Solutions?" />
        <ReasonCards items={aboutWhyChooseUs} cols={2} />
      </section>

      <section className="as-block">
        <div className="as-closing">
          <div className="as-promise">{aboutClosing.promise}</div>
          {aboutClosing.paragraphs.map((paragraph, i) => (
            <p key={i}>
              <BoldSegments text={paragraph} />
            </p>
          ))}
        </div>
      </section>
    </>
  )
}

function ServicesPanel({
  openServices,
  onToggleService,
}: {
  openServices: Set<string>
  onToggleService: (id: string) => void
}) {
  return (
    <>
      <Hero {...servicesHero} />

      <section className="as-block">
        <div className="as-prose">
          {servicesParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="as-block">
        <BlockHead eyebrow="What we offer" title="Services We Provide" sub="Select a service to see what's included." />

        <div className="as-service-list">
          {services.map(service => {
            const isOpen = openServices.has(service.id)
            return (
              <div key={service.id} className={`as-service-item${isOpen ? ' as-open' : ''}`}>
                <button
                  type="button"
                  className="as-service-trigger"
                  aria-expanded={isOpen}
                  aria-controls={`service-panel-${service.id}`}
                  onClick={() => onToggleService(service.id)}
                >
                  <span className="as-service-left">
                    <span className="as-service-tag">{service.tag}</span>
                    <span className="as-service-titles">
                      <h3>{service.title}</h3>
                      <div className="as-tagline">{service.tagline}</div>
                    </span>
                  </span>
                  <Chevron />
                </button>
                <div className="as-service-panel" id={`service-panel-${service.id}`}>
                  <div className="as-service-panel-inner">
                    <div className="as-service-copy">
                      {service.copy.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                    <div>
                      {service.tagGroups.map(group => (
                        <div key={group.title}>
                          <div className="as-taglist-title">{group.title}</div>
                          <ul className="as-taglist">
                            {group.items.map(item => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="as-block">
        <BlockHead eyebrow="Why choose us" title="Why Choose Signature Property Solutions?" />
        <ReasonCards items={servicesWhyChooseUs} cols={3} />
      </section>

      <section className="as-block">
        <BlockHead eyebrow="How it works" title="Our Process" />
        <div className="as-process-rail">
          {processSteps.map((step, i) => (
            <div key={step.title} className="as-process-step">
              <div className="as-num">{i + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export default function AboutServicesPage({ fontsClassName }: { fontsClassName: string }) {
  const active = useSyncExternalStore(subscribeToHash, getHashTab, getServerHashTab)
  const [openServices, setOpenServices] = useState<Set<string>>(() => new Set([services[0].id]))
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const activate = (tab: TabId) => {
    setHash(tab)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = (index + 1) % TABS.length
    tabRefs.current[next]?.focus()
    activate(TABS[next].id)
  }

  const toggleService = (id: string) => {
    setOpenServices(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={`as-page ${fontsClassName}`}>
      <header className="as-header">
        <div className="as-header-inner">
          <div className="as-brandmark">
            <Image
              src="/headerlogo.png"
              alt="Signature Property Solutions"
              width={160}
              height={36}
              className="as-brand-logo"
              priority
            />
          </div>
          <div className="as-tablist" role="tablist" aria-label="Page sections" data-active={active}>
            <span className="as-tab-indicator" aria-hidden="true" />
            {TABS.map((tab, i) => (
              <button
                key={tab.id}
                ref={el => {
                  tabRefs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                className="as-tab"
                aria-selected={active === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => activate(tab.id)}
                onKeyDown={event => onTabKeyDown(event, i)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="as-wrap">
        <section
          key={active}
          className="as-panel as-active as-panel-enter"
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
        >
          {active === 'about' ? <AboutPanel /> : <ServicesPanel openServices={openServices} onToggleService={toggleService} />}
        </section>
      </main>

      <footer className="as-footer">{footerLine}</footer>
    </div>
  )
}
