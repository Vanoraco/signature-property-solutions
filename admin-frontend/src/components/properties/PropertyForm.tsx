'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, Search } from 'lucide-react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import PropertyMediaFields from './PropertyMediaFields'
import {
  PROPERTY_FIELD_TABS,
  existingPropertyMedia,
  propertyFormSchema,
  propertyToFormValues,
  slugifyPropertyTitle,
  type NormalizedApiErrors,
  type PropertyFieldName,
  type PropertyFormValues,
} from './property-form'
import {
  PROPERTY_MEDIA_FIELDS,
  type AgentOption,
  type CategoryOption,
  type FacilityOption,
  type PropertyMediaField,
  type PropertyRecord,
} from './types'
import styles from './PropertyForm.module.css'

type TabId = 'basic' | 'location' | 'amenities' | 'media'

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'location', label: 'Location & Pricing' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'media', label: 'Media' },
]
const propertyFieldOrder = Object.keys(PROPERTY_FIELD_TABS) as PropertyFieldName[]

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  spanTwo?: boolean
  children: ReactNode
}

function Field({ label, htmlFor, error, hint, required, spanTwo, children }: FieldProps) {
  return (
    <div className={`${styles.field} ${spanTwo ? styles.spanTwo : ''}`}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}{required ? <span className={styles.required} aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className={styles.hint}>{hint}</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  )
}

interface PropertyFormProps {
  formId?: string
  initialProperty: PropertyRecord | null
  categories: CategoryOption[]
  agents: AgentOption[]
  facilities: FacilityOption[]
  lookupsLoading: boolean
  lookupError: boolean
  apiErrors: NormalizedApiErrors | null
  onRetryLookups: () => void
  onSubmit: (values: PropertyFormValues) => void | Promise<void>
}

export default function PropertyForm({
  formId = 'property-editor-form',
  initialProperty,
  categories,
  agents,
  facilities,
  lookupsLoading,
  lookupError,
  apiErrors,
  onRetryLookups,
  onSubmit,
}: PropertyFormProps) {
  const [tabSelection, setTabSelection] = useState<{ tab: TabId; apiErrors: NormalizedApiErrors | null }>(
    () => ({ tab: 'basic', apiErrors }),
  )
  const [slugLocked, setSlugLocked] = useState(Boolean(initialProperty))
  const [facilitySearch, setFacilitySearch] = useState('')
  const [pendingFocus, setPendingFocus] = useState<PropertyFieldName | null>(null)
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: propertyToFormValues(initialProperty),
    mode: 'onBlur',
    shouldFocusError: false,
  })

  const title = useWatch({ control, name: 'property_title' })
  const selectedFacilities = useWatch({ control, name: 'facilitie' })
  const watchedMedia = useWatch({ control, name: PROPERTY_MEDIA_FIELDS })
  const slugRegistration = register('slug')
  const mediaFiles = Object.fromEntries(
    PROPERTY_MEDIA_FIELDS.map((field, index) => [field, watchedMedia[index]]),
  ) as Partial<Record<PropertyMediaField, File | null>>
  const firstApiErrorField = Object.keys(apiErrors?.fields ?? {})[0] as PropertyFieldName | undefined
  const activeTab = tabSelection.apiErrors === apiErrors
    ? tabSelection.tab
    : firstApiErrorField
      ? PROPERTY_FIELD_TABS[firstApiErrorField]
      : tabSelection.tab
  const selectTab = (tab: TabId) => setTabSelection({ tab, apiErrors })

  useEffect(() => {
    if (!pendingFocus || PROPERTY_FIELD_TABS[pendingFocus] !== activeTab) return
    document.getElementById(`property-${pendingFocus}`)?.focus()
  }, [activeTab, pendingFocus])

  useEffect(() => {
    if (!slugLocked) {
      setValue('slug', slugifyPropertyTitle(title), {
        shouldDirty: Boolean(title),
        shouldValidate: Boolean(title),
      })
    }
  }, [setValue, slugLocked, title])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as PropertyFieldName, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const filteredFacilities = useMemo(() => {
    const query = facilitySearch.trim().toLowerCase()
    return query
      ? facilities.filter(item => item.facilities_name.toLowerCase().includes(query))
      : facilities
  }, [facilities, facilitySearch])

  const tabHasError = (tab: TabId) => Object.keys(errors).some(
    field => PROPERTY_FIELD_TABS[field as PropertyFieldName] === tab,
  )

  const showFirstError = (invalid: FieldErrors<PropertyFormValues>) => {
    const firstField = propertyFieldOrder.find(field => invalid[field])
    if (!firstField) return
    const errorTab = PROPERTY_FIELD_TABS[firstField]
    if (errorTab === activeTab) {
      document.getElementById(`property-${firstField}`)?.focus()
      return
    }
    setPendingFocus(firstField)
    selectTab(errorTab)
  }

  const submitValid = async (values: PropertyFormValues) => {
    await onSubmit(values)
  }

  const mediaErrors = Object.fromEntries(
    PROPERTY_MEDIA_FIELDS.map(field => [field, errors[field]?.message]),
  ) as Partial<Record<PropertyMediaField, string | undefined>>

  return (
    <div className={styles.editor}>
      <div className={styles.tabs} role="tablist" aria-label="Property editor sections">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`property-panel-${tab.id}`}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
            {tabHasError(tab.id) ? <span className={styles.errorDot} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>

      {apiErrors?.form ? (
        <div className={styles.formAlert} role="alert">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{apiErrors.form}</span>
        </div>
      ) : null}

      {lookupsLoading ? (
        <div className={styles.lookupState} role="status">Loading categories, agents, and facilities...</div>
      ) : null}
      {lookupError ? (
        <div className={styles.formAlert} role="alert">
          <span>Lookup choices could not be loaded.</span>
          <button type="button" onClick={onRetryLookups}>Retry</button>
        </div>
      ) : null}

      <form id={formId} className={styles.form} onSubmit={handleSubmit(submitValid, showFirstError)} noValidate>
        <section id="property-panel-basic" role="tabpanel" hidden={activeTab !== 'basic'} className={styles.panel}>
          <div className={styles.grid}>
            <Field label="Property title" htmlFor="property-property_title" error={errors.property_title?.message} required spanTwo>
              <input id="property-property_title" className={styles.input} {...register('property_title')} />
            </Field>
            <Field label="Property ID" htmlFor="property-property_id" error={errors.property_id?.message} hint="Optional internal identifier.">
              <input id="property-property_id" className={styles.input} {...register('property_id')} />
            </Field>
            <Field label="Status" htmlFor="property-property_status" error={errors.property_status?.message} required>
              <select id="property-property_status" className={styles.select} {...register('property_status')}>
                <option value="For Sale">For Sale</option>
                <option value="For Rent">For Rent</option>
              </select>
            </Field>
            <Field label="Category" htmlFor="property-property_types" error={errors.property_types?.message} required>
              <select id="property-property_types" className={styles.select} disabled={lookupsLoading || lookupError} {...register('property_types')}>
                <option value="">Select category</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.catagorys}</option>)}
              </select>
            </Field>
            <Field label="Agent" htmlFor="property-agent" error={errors.agent?.message}>
              <select id="property-agent" className={styles.select} disabled={lookupsLoading || lookupError} {...register('agent')}>
                <option value="">Unassigned</option>
                {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </Field>
            <Field label="Slug" htmlFor="property-slug" error={errors.slug?.message} hint="Generated from the title until edited." required spanTwo>
              <input
                id="property-slug"
                className={styles.input}
                {...slugRegistration}
                onChange={event => {
                  setSlugLocked(true)
                  slugRegistration.onChange(event)
                }}
              />
            </Field>
            <Field label="Short description" htmlFor="property-property_short_discription" error={errors.property_short_discription?.message} spanTwo>
              <textarea id="property-property_short_discription" className={styles.textarea} rows={5} {...register('property_short_discription')} />
            </Field>
          </div>
        </section>

        <section id="property-panel-location" role="tabpanel" hidden={activeTab !== 'location'} className={styles.panel}>
          <div className={styles.grid}>
            <Field label="Price" htmlFor="property-price" error={errors.price?.message} hint="Include ETB or USD when numeric filtering is expected." required>
              <input id="property-price" className={styles.input} {...register('price')} />
            </Field>
            <Field label="Location" htmlFor="property-property_location" error={errors.property_location?.message} required>
              <input id="property-property_location" className={styles.input} {...register('property_location')} />
            </Field>
            <Field label="Size (m2)" htmlFor="property-property_size" error={errors.property_size?.message}>
              <input id="property-property_size" type="number" min="0" step="1" className={styles.input} {...register('property_size')} />
            </Field>
            <Field label="Land area (m2)" htmlFor="property-property_area" error={errors.property_area?.message}>
              <input id="property-property_area" type="number" min="0" step="1" className={styles.input} {...register('property_area')} />
            </Field>
            <Field label="Floor" htmlFor="property-property_floor" error={errors.property_floor?.message}>
              <input id="property-property_floor" type="number" min="0" step="1" className={styles.input} {...register('property_floor')} />
            </Field>
            <Field label="Bedrooms" htmlFor="property-bedrooms" error={errors.bedrooms?.message}>
              <input id="property-bedrooms" className={styles.input} {...register('bedrooms')} />
            </Field>
            <Field label="Bathrooms" htmlFor="property-bathrooms" error={errors.bathrooms?.message}>
              <input id="property-bathrooms" className={styles.input} {...register('bathrooms')} />
            </Field>
            <Field label="Furnished" htmlFor="property-furnished" error={errors.furnished?.message}>
              <select id="property-furnished" className={styles.select} {...register('furnished')}>
                <option value="">Not specified</option>
                <option value="Furnished">Furnished</option>
                <option value="Unfurnished">Unfurnished</option>
                <option value="Semi-furnished">Semi-furnished</option>
              </select>
            </Field>
          </div>
        </section>

        <section id="property-panel-amenities" role="tabpanel" hidden={activeTab !== 'amenities'} className={styles.panel}>
          <div id="property-facilitie" tabIndex={-1} className={styles.facilitySection}>
            <div className={styles.facilityToolbar}>
              <div>
                <h4>Facilities</h4>
                <p>Select every amenity included with this listing.</p>
              </div>
              <label className={styles.facilitySearch}>
                <Search aria-hidden="true" size={15} />
                <span className="sr-only">Search facilities</span>
                <input value={facilitySearch} onChange={event => setFacilitySearch(event.target.value)} placeholder="Search facilities" />
              </label>
            </div>
            <div className={styles.facilityGrid}>
              {filteredFacilities.map(facility => {
                const value = String(facility.id)
                const checked = selectedFacilities.includes(value)
                return (
                  <label key={facility.id} className={`${styles.facilityOption} ${checked ? styles.facilityChecked : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? selectedFacilities.filter(id => id !== value)
                          : [...selectedFacilities, value]
                        setValue('facilitie', next, { shouldDirty: true, shouldValidate: true })
                      }}
                    />
                    <span className={styles.facilityCheck}>{checked ? <Check aria-hidden="true" size={13} /> : null}</span>
                    <span>{facility.facilities_name}</span>
                  </label>
                )
              })}
              {!lookupsLoading && filteredFacilities.length === 0 ? (
                <p className={styles.facilityEmpty}>No matching facilities.</p>
              ) : null}
            </div>
            {errors.facilitie?.message ? <p className={styles.errorText}>{errors.facilitie.message}</p> : null}
          </div>
        </section>

        <section id="property-panel-media" role="tabpanel" hidden={activeTab !== 'media'} className={styles.panel}>
          <PropertyMediaFields
            existing={existingPropertyMedia(initialProperty)}
            files={mediaFiles}
            errors={mediaErrors}
            onChange={(field, file) => setValue(field, file, { shouldDirty: true, shouldValidate: true })}
          />
          <div className={styles.videoField}>
            <Field label="Video URL" htmlFor="property-video_link" error={errors.video_link?.message} hint="Use an HTTP or HTTPS link." spanTwo>
              <input id="property-video_link" type="url" className={styles.input} {...register('video_link')} />
            </Field>
          </div>
        </section>
      </form>
    </div>
  )
}
