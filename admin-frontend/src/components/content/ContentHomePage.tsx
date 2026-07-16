'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, ImageIcon, Images, LoaderCircle, Upload } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import api from '@/lib/api'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'
import MediaPickerDialog from '@/components/media/MediaLibrary'
import {
  homeFormSchema,
  homeToFormValues,
  normalizeContentApiErrors,
  toHomeFormData,
  type ContentApiErrors,
  type HomeFormValues,
} from './content-form'
import { Field, inputProps, Section } from './Field'
import { pickSingleton, type HomeRecord, type SingletonCollection } from './types'
import styles from './ContentForm.module.css'

const HOME_QUERY_KEY = ['content', 'home'] as const
const fieldsTracked = new Set<string>(['slogon', 'title', 'image'])

export default function ContentHomePage() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)
  const [apiErrors, setApiErrors] = useState<ContentApiErrors | null>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)

  const previewRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const recordQuery = useQuery({
    queryKey: HOME_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const response = await api.get<SingletonCollection<HomeRecord>>('/home/', { signal })
      return response.data
    },
    staleTime: 15 * 60_000,
  })
  const record = useMemo(() => pickSingleton(recordQuery.data), [recordQuery.data])

  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<HomeFormValues>({
    resolver: zodResolver(homeFormSchema),
    defaultValues: homeToFormValues(record),
    mode: 'onBlur',
    values: record ? homeToFormValues(record) : undefined,
  })
  const selectedImage = useWatch({ control, name: 'image' })

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof HomeFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const selectImage = (file: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const nextPreview = URL.createObjectURL(file)
    previewRef.current = nextPreview
    setPreview(nextPreview)
    setValue('image', file, { shouldDirty: true, shouldValidate: true })
  }

  const saveMutation = useMutation({
    mutationFn: async (values: HomeFormValues) => {
      const data = toHomeFormData(values)
      if (record) {
        return api.patch(`/home/${record.id}/`, data)
      }
      return api.post('/home/', data)
    },
    onMutate: () => {
      setApiErrors(null)
      setFeedback(null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: HOME_QUERY_KEY })
      setFeedback(createAdminToastFeedback('Home page content saved.'))
    },
    onError: error => {
      const data = (error as { response?: { data?: unknown } }).response?.data
      setApiErrors(normalizeContentApiErrors(data, fieldsTracked))
    },
  })

  const submit = (values: HomeFormValues) => saveMutation.mutate(values)
  const imageSource = preview ?? record?.image ?? null
  const isLoading = recordQuery.isLoading
  const isError = recordQuery.isError
  const isSaving = saveMutation.isPending

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading home content">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <Header />
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Home content could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => recordQuery.refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        actions={(
          <button
            type="submit"
            form="content-home-form"
            className="btn btn-brass"
            disabled={isSaving || !isDirty}
            aria-busy={isSaving}
          >
            {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Check aria-hidden="true" size={15} />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      />

      {feedback ? (
        <AdminToast
          eventId={feedback.id}
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      <form id="content-home-form" className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        {apiErrors?.form ? (
          <div className={styles.formAlert} role="alert">
            <AlertCircle aria-hidden="true" size={16} />
            <span>{apiErrors.form}</span>
          </div>
        ) : null}

        <Section title="Hero section" description="The headline banner shown at the top of the public homepage.">
          <Field label="Slogan" htmlFor="home-slogon" error={errors.slogon?.message} hint="Short tagline above the title." spanTwo>
            <input id="home-slogon" {...inputProps('home-slogon', errors.slogon?.message)} {...register('slogon')} />
          </Field>
          <Field label="Title" htmlFor="home-title" error={errors.title?.message} hint="Main hero headline." spanTwo>
            <input id="home-title" {...inputProps('home-title', errors.title?.message)} {...register('title')} />
          </Field>
        </Section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>Hero background image</h3>
            <p>Shown behind the hero section. Landscape-oriented images work best.</p>
          </div>
          <div className={styles.photoField}>
            <div className={styles.photoPreview}>
              {imageSource ? (
                <Image src={imageSource} alt="Hero background preview" fill sizes="104px" unoptimized />
              ) : (
                <ImageIcon aria-hidden="true" size={28} />
              )}
            </div>
            <div className={styles.photoDetails}>
              <strong>Hero image</strong>
              <div className={styles.photoActions}>
                <label className={styles.fileButton}>
                  <Upload aria-hidden="true" size={15} />
                  {imageSource ? 'Replace image' : 'Choose image'}
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Hero image file"
                    onChange={event => {
                      const file = event.target.files?.[0]
                      if (file) selectImage(file)
                      event.target.value = ''
                    }}
                  />
                </label>
                <button type="button" className={styles.libraryButton} onClick={() => setMediaPickerOpen(true)}>
                  <Images aria-hidden="true" size={15} /> Choose existing
                </button>
              </div>
              <span className={styles.fileName}>{selectedImage ? selectedImage.name : imageSource ? 'Current image' : 'No image selected'}</span>
              {errors.image?.message ? <p className={styles.errorText}>{errors.image.message}</p> : null}
            </div>
          </div>
        </section>

        <Section title="Hero video" description="Optional background video shown on the homepage hero. Uploaded as an MP4 / WebM file.">
          <Field label="Current video" htmlFor="home-video-current" spanTwo>
            {record?.video ? (
              <a href={record.video} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open current video in a new tab</a>
            ) : (
              <p className={styles.hint}>No video uploaded. Video management is handled by the Django admin at /admin.</p>
            )}
          </Field>
        </Section>
      </form>

      <MediaPickerDialog
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={file => selectImage(file)}
        title="Choose Hero Image"
      />
    </div>
  )
}

function Header({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head-main">
        <div className="page-eyebrow">Content</div>
        <h1 className="page-title">Home Page</h1>
        <p className="page-desc">Edit the hero section, slogan, and background image shown on the public homepage.</p>
      </div>
      {actions}
    </div>
  )
}
