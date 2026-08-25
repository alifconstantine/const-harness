import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCloseOutline16, IconCodeOutline16, IconDownloadOutline16, IconFileOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { detectAttachmentKind } from './AttachmentRail.tsx'
import css from './ImageLightbox.module.css'

/** Formats byte sizes into human-readable strings (KB / MB). */
function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Extracts a short file extension (e.g. PDF, MP4, TS). */
function getFileExtension(name?: string): string {
  if (!name) return ''
  const dot = name.lastIndexOf('.')
  return dot !== -1 ? name.slice(dot + 1).toUpperCase().slice(0, 5) : ''
}

/** Lightbox strings the owner resolves from its own locale namespace. */
export interface ImageLightboxLabels {
  /** Accessible name of the preview dialog. */
  dialog: string
  /** Accessible label of the close control. */
  close: string
}

/**
 * Document-level media/file preview opened by clicking a thumbnail.
 * Closes on Escape, backdrop press, or the close control, and restores focus
 * to the opener on unmount. Rendered through a body portal: an opener inside
 * a transformed or filtered ancestor would otherwise trap the fixed backdrop
 * in that ancestor's box instead of covering the viewport.
 *
 * @param props.src - the preview URL (object URL or durable URL).
 * @param props.alt - display title or filename.
 * @param props.kind - media category: image, video, or generic file.
 * @param props.fileSize - file size in bytes if available.
 * @param props.mimeType - MIME type string if available.
 * @param props.labels - dialog and close-control strings.
 * @param props.onClose - dismiss callback owned by the opener.
 * @returns the modal preview dialog.
 */
export function ImageLightbox({
  src,
  alt,
  kind,
  fileSize,
  mimeType,
  labels,
  onClose,
}: {
  src: string
  alt: string
  kind?: 'image' | 'video' | 'file'
  fileSize?: number
  mimeType?: string
  labels: ImageLightboxLabels
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  const detectedKind = detectAttachmentKind(kind, mimeType, alt)
  const isVideo = detectedKind === 'video'
  const isFile = detectedKind === 'file'
  const ext = getFileExtension(alt)
  const isCode = ['TS', 'JS', 'PY', 'RS', 'GO', 'CPP', 'C', 'JSON', 'CSS', 'HTML', 'SH', 'MD', 'YML', 'YAML'].includes(ext)
  const sizeText = formatFileSize(fileSize)

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      restoreRef.current?.focus()
    }
  }, [onClose])

  return createPortal(
    <div
      className={css.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={labels.dialog}
    >
      <div className={css.mask} aria-hidden="true" onMouseDown={onClose} />
      {isVideo ? (
        <div className={css.videoContainer}>
          {alt && <div className={css.mediaHeader}>{alt}</div>}
          <video
            className={css.video}
            src={src}
            controls
            autoPlay
            playsInline
          />
        </div>
      ) : isFile ? (
        <div className={css.filePreviewCard}>
          <div className={css.filePreviewIcon}>
            {isCode ? <IconCodeOutline16 size={36} /> : <IconFileOutline16 size={36} />}
          </div>
          <div className={css.filePreviewDetails}>
            <div className={css.filePreviewTitle}>{alt}</div>
            <div className={css.filePreviewMeta}>
              {ext && <span className={css.fileExtBadge}>{ext}</span>}
              {sizeText && <span className={css.fileSizeText}>{sizeText}</span>}
              {mimeType && <span className={css.fileMimeText}>{mimeType}</span>}
            </div>
          </div>
          {src && (
            <a href={src} download={alt} className={css.downloadButton} title="Download file">
              <IconDownloadOutline16 size={16} />
              <span>Download</span>
            </a>
          )}
        </div>
      ) : (
        <img className={css.image} src={src} alt={alt} />
      )}
      <button ref={closeRef} type="button" className={css.close} aria-label={labels.close} onClick={onClose}>
        <IconCloseOutline16 size={16} />
      </button>
    </div>,
    document.body,
  )
}
