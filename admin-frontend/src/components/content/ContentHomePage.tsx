'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, ImageIcon, Images, LoaderCircle, Upload, Video } from 'lucide-react'
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
const fieldsTracked = new Set<string>(['slogon', 'title', 'image', 'video'])

export default function ContentHomePage() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)
  const [apiErrors, setApiErrors] = useState<ContentApiErrors | null>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [videoPickerOpen, setVideoPickerOpen] = useState(false)

  const imagePreviewRef = useRef<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const videoPreviewRef = useRef<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

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
    formState: { errors, isDirty, dirtyFields },
  } = useForm<HomeFormValues>({
    resolver: zodResolver(homeFormSchema),
    defaultValues: homeToFormValues(record),
    mode: 'onBlur',
    values: record ? homeToFormValues(record) : undefined,
  })
  const selectedImage = useWatch({ control, name: 'image' })
  const selectedVideo = useWatch({ control, name: 'video' })
  const dirtyMap = dirtyFields as Record<string, boolean>

  useEffect(() => () => {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current)
    if (videoPreviewRef.current) URL.revokeObjectURL(videoPreviewRef.current)
  }, [])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof HomeFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const selectImage = (file: File) => {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current)
    const nextPreview = URL.createObjectURL(file)
    imagePreviewRef.current = nextPreview
    setImagePreview(nextPreview)
    setValue('image', file, { shouldDirty: true, shouldValidate: true })
  }

  const selectVideo = (file: File) => {
    if (videoPreviewRef.current) URL.revokeObjectURL(videoPreviewRef.current)
    const nextPreview = URL.createObjectURL(file)
    videoPreviewRef.current = nextPreview
    setVideoPreview(nextPreview)
    setValue('video', file, { shouldDirty: true, shouldValidate: true })
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
      // The record refetch resets defaultValues, so dirtyFields clears
    },
    onError: error => {
      const data = (error as { response?: { data?: unknown } }).response?.data
      setApiErrors(normalizeContentApiErrors(data, fieldsTracked))
    },
  })

  const submit = (values: HomeFormValues) => saveMutation.mutate(values)
  const imageSource = imagePreview ?? record?.image ?? null
  const videoSource = videoPreview ?? record?.video ?? null
  const isLoading = recordQuery.isLoading
  const isError = recordQuery.isError
  const isSaving = saveMutation.isPending
  const heroImageDirty = dirtyMap.image === true
  const heroVideoDirty = dirtyMap.video === true

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

        <Section
          title="Hero section"
          description="The headline banner shown at the top of the public homepage."
          fields={['slogon', 'title']}
          dirtyFields={dirtyMap}
          formId="content-home-form"
          saving={isSaving}
        >
          <Field label="Slogan" htmlFor="home-slogon" error={errors.slogon?.message} hint="Short tagline above the title." spanTwo>
            <input id="home-slogon" {...inputProps('home-slogon', errors.slogon?.message)} {...register('slogon')} />
          </Field>
          <Field label="Title" htmlFor="home-title" error={errors.title?.message} hint="Main hero headline." spanTwo>
            <input id="home-title" {...inputProps('home-title', errors.title?.message)} {...register('title')} />
          </Field>
        </Section>

        <section className={`${styles.section} ${heroImageDirty ? styles.sectionDirty : ''}`}>
          <div className={`${styles.sectionHead} ${heroImageDirty ? styles.sectionHeadDirty : ''}`}>
            <div className={styles.sectionHeadCopy}>
              <h3>Hero background image</h3>
              <p>Shown behind the hero section. Landscape-oriented images work best.</p>
            </div>
            {heroImageDirty ? (
              <button
                type="submit"
                form="content-home-form"
                className={`btn btn-brass btn-sm ${styles.sectionSave}`}
                disabled={isSaving}
                aria-busy={isSaving}
                title="Save changes in this section"
              >
                {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Check aria-hidden="true" size={14} />}
                {isSaving ? 'Saving...' : 'Save section'}
              </button>
            ) : null}
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

        <section className={`${styles.section} ${heroVideoDirty ? styles.sectionDirty : ''}`}>
          <div className={`${styles.sectionHead} ${heroVideoDirty ? styles.sectionHeadDirty : ''}`}>
            <div className={styles.sectionHeadCopy}>
              <h3>Hero video</h3>
              <p>Optional background video shown on the homepage hero. MP4 or WebM, 200 MB or smaller.</p>
            </div>
            {heroVideoDirty ? (
              <button
                type="submit"
                form="content-home-form"
                className={`btn btn-brass btn-sm ${styles.sectionSave}`}
                disabled={isSaving}
                aria-busy={isSaving}
                title="Save changes in this section"
              >
                {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Check aria-hidden="true" size={14} />}
                {isSaving ? 'Saving...' : 'Save section'}
              </button>
            ) : null}
          </div>
          <div className={styles.videoField}>
            <div className={styles.videoPreview}>
              {videoSource ? (
                // useRef is used to revoke the object URL; controls below are fine
                <video src={videoSource} controls playsInline preload="metadata" />
              ) : (
                <Video aria-hidden="true" size={28} />
              )}
            </div>
            <div className={styles.photoDetails}>
              <strong>Hero video</strong>
              <div className={styles.photoActions}>
                <label className={styles.fileButton}>
                  <Upload aria-hidden="true" size={15} />
                  {videoSource ? 'Replace video' : 'Choose video'}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    aria-label="Hero video file"
                    onChange={event => {
                      const file = event.target.files?.[0]
                      if (file) selectVideo(file)
                      event.target.value = ''
                    }}
                  />
                </label>
                <button type="button" className={styles.libraryButton} onClick={() => setVideoPickerOpen(true)}>
                  <Images aria-hidden="true" size={15} /> Choose existing
                </button>
              </div>
              <span className={styles.fileName}>{selectedVideo ? selectedVideo.name : videoSource ? 'Current video' : 'No video selected'}</span>
              {errors.video?.message ? <p className={styles.errorText}>{errors.video.message}</p> : null}
            </div>
          </div>
        </section>
      </form>

      <MediaPickerDialog
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={file => selectImage(file)}
        title="Choose Hero Image"
      />

      <MediaPickerDialog
        open={videoPickerOpen}
        onClose={() => setVideoPickerOpen(false)}
        onSelect={file => selectVideo(file)}
        title="Choose Hero Video"
        mediaKind="video"
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
        <p className="page-desc">Edit the hero section, slogan, background image, and background video shown on the public homepage.</p>
      </div>
      {actions}
    </div>
  )
}
