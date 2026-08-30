import React, { useEffect, useRef, useState, useCallback } from 'react'
import type {
  DesignSystemSummary,
  DesignTemplateSummary,
  PromptTemplateSummary,
  WorkspaceView,
} from '@const-ai/host-apiproxy/api'
import {
  ConstLogo,
  IconPlusOutline16,
  IconSendOutline16,
  IconPaperclipOutline16,
  IconBrowseOutline16,
  IconCloseOutline16,
  IconChevronDownOutline14,
  IconChevronRightOutline14,
  IconGlobeOutline14,
} from '@const-ai/client-ui-primitives'
import { FigmaImportModal } from './FigmaImportModal.tsx'
import { PluginPickerPopover } from './PluginPickerPopover.tsx'
import { DesignSystemPickerPopover } from './DesignSystemPickerPopover.tsx'
import styles from './OpenDesignHome.module.css'
import { en } from './locales.ts'

import imgOpenDesignLanding from './assets/community-templates/open-design-landing.webp'
import imgSocialCarousel from './assets/community-templates/social-carousel.jpg'
import imgBlogPost from './assets/community-templates/blog-post.webp'
import imgDashboard from './assets/community-templates/dashboard.webp'
import imgHyperframes from './assets/community-templates/hyperframes.webp'
import imgKanbanBoard from './assets/community-templates/kanban-board.webp'
import imgLiveArtifact from './assets/community-templates/live-artifact.webp'
import imgMobileFlow from './assets/community-templates/mobile-flow.webp'
import imgPitchDeck from './assets/community-templates/pitch-deck.webp'
import imgWireframeGreybox from './assets/community-templates/wireframe-greybox.webp'
import imgWireframeSketch from './assets/community-templates/wireframe-sketch.webp'
import imgWorkspaceCover from './assets/community-templates/workspace-cover.webp'

import imgCover0 from './assets/mock-covers/cover-0.jpg'
import imgCover1 from './assets/mock-covers/cover-1.jpg'
import imgCover2 from './assets/mock-covers/cover-2.jpg'
import imgCover3 from './assets/mock-covers/cover-3.jpg'
import imgCover4 from './assets/mock-covers/cover-4.jpg'
import imgCover5 from './assets/mock-covers/cover-5.jpg'
import imgCover6 from './assets/mock-covers/cover-6.jpg'
import imgCover7 from './assets/mock-covers/cover-7.jpg'
import imgCover8 from './assets/mock-covers/cover-8.jpg'
import imgCover9 from './assets/mock-covers/cover-9.jpg'
import imgCover10 from './assets/mock-covers/cover-10.jpg'
import imgCover11 from './assets/mock-covers/cover-11.jpg'

const mockCovers = [
  imgCover0, imgCover1, imgCover2, imgCover3, imgCover4, imgCover5,
  imgCover6, imgCover7, imgCover8, imgCover9, imgCover10, imgCover11,
]

function getTemplateThumbnail(t: { id: string; title: string; category?: string }, index: number): string {
  const idLower = t.id.toLowerCase()
  const titleLower = t.title.toLowerCase()

  if (idLower.includes('landing') || titleLower.includes('opendesign landing') || titleLower.includes('landing')) {
    return imgOpenDesignLanding
  }
  if (idLower.includes('carousel') || titleLower.includes('social carousel') || titleLower.includes('carousel')) {
    return imgSocialCarousel
  }
  if (idLower.includes('blog') || titleLower.includes('blog post')) {
    return imgBlogPost
  }
  if (idLower.includes('guide') || titleLower.includes('digital eguide') || titleLower.includes('eguide')) {
    return imgCover0
  }
  if (idLower.includes('magazine') || titleLower.includes('magazine article') || titleLower.includes('article')) {
    return imgCover1
  }
  if (idLower.includes('email') || titleLower.includes('email marketing') || titleLower.includes('newsletter')) {
    return imgCover2
  }
  if (idLower.includes('pitch') || idLower.includes('deck') || idLower.includes('slides') || titleLower.includes('pitch deck')) {
    return imgPitchDeck
  }
  if (idLower.includes('dashboard') || idLower.includes('analytics') || titleLower.includes('dashboard')) {
    return imgDashboard
  }
  if (idLower.includes('kanban') || titleLower.includes('kanban board')) {
    return imgKanbanBoard
  }
  if (idLower.includes('mobile') || idLower.includes('app') || titleLower.includes('mobile flow')) {
    return imgMobileFlow
  }
  if (idLower.includes('sketch') || titleLower.includes('sketch')) {
    return imgWireframeSketch
  }
  if (idLower.includes('wireframe') || idLower.includes('greybox')) {
    return imgWireframeGreybox
  }
  if (idLower.includes('hyperframe') || idLower.includes('video')) {
    return imgHyperframes
  }
  if (idLower.includes('artifact') || titleLower.includes('live artifact')) {
    return imgLiveArtifact
  }
  if (idLower.includes('workspace') || idLower.includes('cover')) {
    return imgWorkspaceCover
  }

  return mockCovers[index % mockCovers.length]!
}

export interface OpenDesignHomeProps {
  api?: any
  onStartSession: (options: {
    prompt: string
    mode: string
    interaction: string
    designSystemId: string | null
    workspaceId?: string
    model?: string
    permissionPreset: string
  }) => void
  t?: (key: keyof typeof en) => string
}

/* =========================================================================
   CLEAN SVG ICONS (NO SPARKLES, NO EMOJIS)
   ========================================================================= */

function IconPrototypeSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  )
}

function IconSlideDeckSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function IconImageSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconDocumentSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconHyperFramesSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  )
}

function IconWebsiteCloneSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function IconAllSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function IconDesignModeSvg({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function IconPlanModeSvg({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function IconAskModeSvg({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconShieldWorkspaceSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8.08887 0.251709C8.20479 0.23085 8.32486 0.241168 8.43652 0.282959L15.0215 2.75171C15.2787 2.84819 15.4492 3.09414 15.4492 3.3689V7.0105C15.4492 7.10986 15.4441 7.2081 15.4414 7.30542C15.0285 7.07175 14.5905 6.87695 14.1309 6.73022V3.82495L8.20508 1.60327L2.2793 3.82495V7.0105C2.27936 9.7171 3.4745 11.5379 5.02734 12.7947C5.01025 12.9942 5 13.1962 5 13.4001C5.00001 13.7617 5.02722 14.1169 5.08008 14.4636C2.91555 13.0393 0.961014 10.752 0.960938 7.0105V3.3689C0.960938 3.09417 1.13146 2.84821 1.38867 2.75171L7.97461 0.282959L8.08887 0.251709Z" fill="currentColor" />
      <path d="M11.3525 5.64688V6.85688H5V5.64688H11.3525Z" fill="currentColor" />
      <path d="M9.5824 8.29376V9.50376H5V8.29376H9.5824Z" fill="currentColor" />
    </svg>
  )
}

function IconShieldFullAccessSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8.20554 0.899994L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.899994Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.10094 4.5V8.75939H7.59888V4.5H9.10094Z" fill="currentColor" />
      <path d="M9.10094 9.8114V11.5H7.59888V9.8114H9.10094Z" fill="currentColor" />
    </svg>
  )
}

function IconPluginPuzzleSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function IconFilterRocketSvg({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function IconFilterDashboardSvg({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  )
}

function IconFilterMobileSvg({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

function IconFilterWireframeSvg({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function IconFilterAppSvg({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 4v4" />
      <path d="M2 8h20" />
      <path d="M6 4v4" />
    </svg>
  )
}

/* =========================================================================
   MAIN OPEN DESIGN HOME COMPONENT
   ========================================================================= */

export function OpenDesignHome({
  api,
  onStartSession,
  t = (k: keyof typeof en) => en[k] || k,
}: OpenDesignHomeProps): React.JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [surfaceMode, setSurfaceMode] = useState<string>('prototype')
  const [interactionMode, setInteractionMode] = useState<'design' | 'plan' | 'ask'>('design')
  const [permissionPreset, setPermissionPreset] = useState<'workspace_write' | 'full_access'>('workspace_write')
  const [selectedDesignSystem, setSelectedDesignSystem] = useState<{ id: string | null; name: string }>({
    id: null,
    name: t('ds.no_design_system'),
  })
  const [selectedTemplateBadge, setSelectedTemplateBadge] = useState<string | null>(null)

  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false)
  const [isPluginPickerOpen, setIsPluginPickerOpen] = useState(false)
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false)
  const [isDsPickerOpen, setIsDsPickerOpen] = useState(false)
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false)
  const [isInteractionDropdownOpen, setIsInteractionDropdownOpen] = useState(false)
  const [isPermissionDropdownOpen, setIsPermissionDropdownOpen] = useState(false)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)

  const [systems, setSystems] = useState<readonly DesignSystemSummary[]>([])
  const [templates, setTemplates] = useState<readonly DesignTemplateSummary[]>([])
  const [promptTemplates, setPromptTemplates] = useState<readonly PromptTemplateSummary[]>([])
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([])
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>(['Omniroute/Const', 'Const', 'DeepSeek-V3'])
  const [selectedModel, setSelectedModel] = useState<string>('Omniroute/Const')
  const [exampleCategory, setExampleCategory] = useState<string>('all')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardsContainerRef = useRef<HTMLDivElement>(null)
  const scrollAnimRef = useRef<number | null>(null)

  const [isMoreCatOpen, setIsMoreCatOpen] = useState(false)

  const closeAllMenus = useCallback(() => {
    setIsPlusMenuOpen(false)
    setIsProjectDropdownOpen(false)
    setIsModeDropdownOpen(false)
    setIsInteractionDropdownOpen(false)
    setIsPermissionDropdownOpen(false)
    setIsModelDropdownOpen(false)
    setIsDsPickerOpen(false)
    setIsPluginPickerOpen(false)
    setIsMoreCatOpen(false)
  }, [])

  useEffect(() => {
    if (!api) return

    void (async () => {
      try {
        const res = await api.design?.systems?.({})
        if (res?.result?.ok) {
          setSystems(res.result.value.systems)
        }
      } catch {}

      try {
        const tRes = await api.design?.templates?.({})
        if (tRes?.result?.ok) {
          setTemplates(tRes.result.value.templates)
        }
      } catch {}

      try {
        const res = await api.design?.promptTemplates?.({})
        if (res?.result?.ok) {
          setPromptTemplates(res.result.value.templates)
        }
      } catch {}

      try {
        const wRes = await api.workspace?.list?.({})
        if (wRes?.result?.ok) {
          const items: WorkspaceView[] = wRes.result.value.items || []
          const mapped = items.map((w: WorkspaceView) => ({
            id: w.workspaceId,
            name: w.title || w.path.split(/[/\\]/).pop() || w.workspaceId,
          }))
          setWorkspaces(mapped)
        }
      } catch {}

      try {
        const mRes = await api.llm?.discoveredModels?.({})
        if (mRes?.result?.ok && Array.isArray(mRes.result.value.models)) {
          const list = mRes.result.value.models.map((m: any) => m.name || m.id).filter(Boolean)
          if (list.length > 0) {
            setAvailableModels(list)
            setSelectedModel(list[0] || 'Omniroute/Const')
          }
        }
      } catch {}
    })()
  }, [api])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 56), 220)}px`
  }, [prompt])

  const getPlaceholder = () => {
    switch (surfaceMode) {
      case 'prototype': return t('placeholder.prototype')
      case 'slide_deck': return t('placeholder.slide_deck')
      case 'image': return t('placeholder.image')
      case 'document': return t('placeholder.document')
      case 'hyperframes': return t('placeholder.hyperframes')
      case 'website_clone': return t('placeholder.website_clone')
      default: return 'Ask ZCode anything, @ to add context, / for commands or capabilities'
    }
  }

  const handleSelectTemplate = (item: DesignTemplateSummary) => {
    setSelectedTemplateBadge(item.title)
    setPrompt(`Create a ${item.title}: ${item.description}`)
    if (item.category.toLowerCase().includes('slide') || item.id.includes('ppt')) {
      setSurfaceMode('slide_deck')
    } else {
      setSurfaceMode('prototype')
    }
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleSelectPromptTemplate = (item: PromptTemplateSummary) => {
    setSelectedTemplateBadge(item.title)
    setPrompt(`Create an ${item.title}: ${item.summary}`)
    setSurfaceMode(item.surface === 'video' ? 'hyperframes' : 'image')
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleSelectPlugin = (plugin: PromptTemplateSummary) => {
    setPrompt(prev => `${prev ? `${prev} ` : ''}@${plugin.id} `)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!prompt.trim()) return

    onStartSession({
      prompt: prompt.trim(),
      mode: surfaceMode,
      interaction: interactionMode,
      designSystemId: selectedDesignSystem.id,
      ...(selectedFolder ? { workspaceId: selectedFolder.id } : {}),
      model: selectedModel,
      permissionPreset,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const stopEdgeScroll = () => {
    if (scrollAnimRef.current !== null) {
      cancelAnimationFrame(scrollAnimRef.current)
      scrollAnimRef.current = null
    }
  }

  const handleCarouselMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardsContainerRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const edgeThreshold = 120

    stopEdgeScroll()

    if (x < edgeThreshold && el.scrollLeft > 0) {
      const speed = ((edgeThreshold - x) / edgeThreshold) * 14
      const step = () => {
        el.scrollLeft -= speed
        if (el.scrollLeft > 0) {
          scrollAnimRef.current = requestAnimationFrame(step)
        }
      }
      scrollAnimRef.current = requestAnimationFrame(step)
    } else if (x > rect.width - edgeThreshold && el.scrollLeft < el.scrollWidth - el.clientWidth) {
      const speed = ((x - (rect.width - edgeThreshold)) / edgeThreshold) * 14
      const step = () => {
        el.scrollLeft += speed
        if (el.scrollLeft < el.scrollWidth - el.clientWidth) {
          scrollAnimRef.current = requestAnimationFrame(step)
        }
      }
      scrollAnimRef.current = requestAnimationFrame(step)
    }
  }

  const scrollLeftBy = (amount: number) => {
    if (cardsContainerRef.current) {
      cardsContainerRef.current.scrollBy({ left: -amount, behavior: 'smooth' })
    }
  }

  const scrollRightBy = (amount: number) => {
    if (cardsContainerRef.current) {
      cardsContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  const modesList = [
    { id: 'prototype', label: t('modes.prototype'), prefix: '#', icon: <IconPrototypeSvg size={13} /> },
    { id: 'slide_deck', label: t('modes.slide_deck'), prefix: '', icon: <IconSlideDeckSvg size={13} /> },
    { id: 'image', label: t('modes.image'), prefix: '', icon: <IconImageSvg size={13} /> },
    { id: 'document', label: t('modes.document'), prefix: '', icon: <IconDocumentSvg size={13} /> },
    { id: 'hyperframes', label: t('modes.hyperframes'), prefix: '', icon: <IconHyperFramesSvg size={13} /> },
    { id: 'website_clone', label: t('modes.website_clone'), prefix: '', icon: <IconWebsiteCloneSvg size={13} /> },
    { id: 'all', label: t('modes.all'), prefix: '', icon: <IconAllSvg size={13} /> },
  ]

  const isMediaMode = surfaceMode === 'image' || surfaceMode === 'hyperframes'

  const filteredPromptTemplates = promptTemplates.filter((item) => {
    if (exampleCategory === 'all') return true
    if (exampleCategory === 'landing') return item.category.toLowerCase().includes('marketing') || item.category.toLowerCase().includes('social')
    if (exampleCategory === 'dashboards') return item.category.toLowerCase().includes('infographic') || item.category.toLowerCase().includes('dashboard')
    if (exampleCategory === 'mobile') return item.category.toLowerCase().includes('app') || item.category.toLowerCase().includes('avatar')
    if (exampleCategory === 'wireframe') return item.category.toLowerCase().includes('infographic') || item.category.toLowerCase().includes('wireframe')
    if (exampleCategory === 'apps') return item.category.toLowerCase().includes('game') || item.category.toLowerCase().includes('app')
    if (exampleCategory === 'slides') return item.category.toLowerCase().includes('slide') || item.surface === 'video'
    return true
  })

  const filteredDesignTemplates = templates.filter((item) => {
    if (exampleCategory === 'all') return true
    const cat = item.category.toLowerCase()
    const id = item.id.toLowerCase()
    if (exampleCategory === 'landing') return cat.includes('landing') || cat.includes('marketing') || id.includes('landing') || id.includes('pricing') || id.includes('waitlist')
    if (exampleCategory === 'dashboards') return cat.includes('dashboard') || id.includes('dashboard') || id.includes('kanban') || id.includes('flowai') || id.includes('finance')
    if (exampleCategory === 'mobile') return cat.includes('mobile') || id.includes('mobile') || id.includes('gamified') || id.includes('dating') || id.includes('hr-onboarding')
    if (exampleCategory === 'wireframe') return cat.includes('wireframe') || id.includes('wireframe')
    if (exampleCategory === 'apps') return cat.includes('apps') || id.includes('prototype') || id.includes('worker') || id.includes('live-artifact')
    if (exampleCategory === 'slides') return cat.includes('slide') || id.includes('ppt') || id.includes('deck')
    if (exampleCategory === 'document') return id.includes('doc') || id.includes('case-report') || id.includes('valuation')
    return true
  })

  const renderTemplateVisual = (item: DesignTemplateSummary, index: number) => {
    if (item.previewImageUrl) {
      return <img src={item.previewImageUrl} alt={item.title} className={styles.cardThumbnailImg} loading="lazy" />
    }
    const thumb = getTemplateThumbnail(item, index)
    return (
      <img
        src={thumb}
        alt={item.title}
        className={styles.cardThumbnailImg}
        loading="lazy"
      />
    )
  }

  return (
    <div className={styles.container} onClick={closeAllMenus}>
      <div className={styles.contentWrapper} onClick={e => e.stopPropagation()}>
        {/* Compact Hero Section */}
        <div className={styles.heroSection}>
          {/* Centered Brand Header */}
          <div className={styles.heroHeader}>
            <ConstLogo size={28} className={styles.logoIcon} />
            <h1 className={styles.brandTitle}>{t('title')}</h1>
          </div>

          {/* Mode Chips Row with clean SVG icons */}
          <div className={styles.modeChipsRow}>
            {modesList.map(m => (
              <button
                key={m.id}
                type="button"
                className={`${styles.modeChip} ${surfaceMode === m.id ? styles.active : ''}`}
                onClick={() => setSurfaceMode(m.id)}
              >
                <span className={styles.modeChipIcon}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Outer Composer Frame (Matching Image 2) */}
          <div className={styles.composerOuterFrame}>
            {selectedTemplateBadge && (
              <div className={styles.activeTemplateBadge}>
                <span>{selectedTemplateBadge}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateBadge(null)}
                  aria-label="Remove template"
                >
                  <IconCloseOutline16 size={12} />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder={getPlaceholder()}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />

            {/* Composer Bottom Toolbar */}
            <div className={styles.composerBottomBar}>
              <div className={styles.composerLeftActions}>
                {/* Plus (+) Button Menu */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`${styles.plusBtn} ${isPlusMenuOpen ? styles.active : ''}`}
                    onClick={() => {
                      closeAllMenus()
                      setIsPlusMenuOpen(!isPlusMenuOpen)
                    }}
                    aria-label="Attach or select tools"
                  >
                    <IconPlusOutline16 size={14} />
                  </button>

                  {isPlusMenuOpen && (
                    <div className={`${styles.dropdownMenu} ${styles.dropdownMenuDown}`} style={{ width: 220, left: 0, top: 'calc(100% + 6px)' }}>
                      <button
                        type="button"
                        className={styles.dropdownItem}
                        onClick={() => setIsPlusMenuOpen(false)}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconPaperclipOutline16 size={14} />
                          <span>{t('menu.attach_files')}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={styles.dropdownItem}
                        onClick={() => setIsPlusMenuOpen(false)}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconBrowseOutline16 size={14} />
                          <span>{t('menu.ref_project')}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsPlusMenuOpen(false)
                          setIsPluginPickerOpen(true)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconPluginPuzzleSvg size={14} />
                          <span>{t('menu.plugins')}</span>
                        </div>
                        <IconChevronRightOutline14 size={12} />
                      </button>

                      <button
                        type="button"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setIsPlusMenuOpen(false)
                          setIsFigmaModalOpen(true)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>{t('menu.import_figma')}</span>
                        </div>
                      </button>
                    </div>
                  )}

                  {isPluginPickerOpen && (
                    <PluginPickerPopover
                      isOpen={isPluginPickerOpen}
                      onClose={() => setIsPluginPickerOpen(false)}
                      onSelectPlugin={handleSelectPlugin}
                      templates={promptTemplates}
                      t={t}
                    />
                  )}
                </div>

                {/* Category Dropdown Chip */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={styles.modeDropdownBtn}
                    onClick={() => {
                      closeAllMenus()
                      setIsModeDropdownOpen(!isModeDropdownOpen)
                    }}
                  >
                    <span>{modesList.find(m => m.id === surfaceMode)?.icon}</span>
                    <span>{modesList.find(m => m.id === surfaceMode)?.label || surfaceMode}</span>
                    <IconChevronDownOutline14 size={10} />
                  </button>

                  {isModeDropdownOpen && (
                    <div className={`${styles.dropdownMenu} ${styles.dropdownMenuDown}`} style={{ minWidth: 170, left: 0, top: 'calc(100% + 6px)' }}>
                      {modesList.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          className={`${styles.dropdownItem} ${surfaceMode === m.id ? styles.active : ''}`}
                          onClick={() => {
                            setSurfaceMode(m.id)
                            setIsModeDropdownOpen(false)
                          }}
                        >
                          <div className={styles.dropdownItemLeft}>
                            {m.icon}
                            <span>{m.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Toolbar Controls */}
              <div className={styles.composerRightActions}>
                {/* Interaction Mode (Design, Plan, Ask) */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={styles.pillControlBtn}
                    onClick={() => {
                      closeAllMenus()
                      setIsInteractionDropdownOpen(!isInteractionDropdownOpen)
                    }}
                  >
                    {interactionMode === 'design' && <IconDesignModeSvg size={13} />}
                    {interactionMode === 'plan' && <IconPlanModeSvg size={13} />}
                    {interactionMode === 'ask' && <IconAskModeSvg size={13} />}
                    <span>{t(`interaction.${interactionMode}` as keyof typeof en)}</span>
                    <IconChevronDownOutline14 size={10} />
                  </button>

                  {isInteractionDropdownOpen && (
                    <div className={`${styles.dropdownMenu} ${styles.dropdownMenuDown}`} style={{ minWidth: 130, right: 0, top: 'calc(100% + 6px)' }}>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${interactionMode === 'design' ? styles.active : ''}`}
                        onClick={() => {
                          setInteractionMode('design')
                          setIsInteractionDropdownOpen(false)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconDesignModeSvg size={13} />
                          <span>{t('interaction.design')}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${interactionMode === 'plan' ? styles.active : ''}`}
                        onClick={() => {
                          setInteractionMode('plan')
                          setIsInteractionDropdownOpen(false)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconPlanModeSvg size={13} />
                          <span>{t('interaction.plan')}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${interactionMode === 'ask' ? styles.active : ''}`}
                        onClick={() => {
                          setInteractionMode('ask')
                          setIsInteractionDropdownOpen(false)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconAskModeSvg size={13} />
                          <span>{t('interaction.ask')}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Permission Preset (Workspace Write / Full Access) */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`${styles.permissionBtn} ${permissionPreset === 'full_access' ? styles.permissionDanger : ''}`}
                    onClick={() => {
                      closeAllMenus()
                      setIsPermissionDropdownOpen(!isPermissionDropdownOpen)
                    }}
                  >
                    {permissionPreset === 'full_access' ? (
                      <IconShieldFullAccessSvg size={14} />
                    ) : (
                      <IconShieldWorkspaceSvg size={14} />
                    )}
                    <span>{t(`permission.${permissionPreset}` as keyof typeof en)}</span>
                    <IconChevronDownOutline14 size={10} />
                  </button>

                  {isPermissionDropdownOpen && (
                    <div className={`${styles.dropdownMenu} ${styles.dropdownMenuDown}`} style={{ minWidth: 170, right: 0, top: 'calc(100% + 6px)' }}>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${permissionPreset === 'workspace_write' ? styles.active : ''}`}
                        onClick={() => {
                          setPermissionPreset('workspace_write')
                          setIsPermissionDropdownOpen(false)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconShieldWorkspaceSvg size={14} />
                          <span>{t('permission.workspace_write')}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${permissionPreset === 'full_access' ? styles.active : ''}`}
                        onClick={() => {
                          setPermissionPreset('full_access')
                          setIsPermissionDropdownOpen(false)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconShieldFullAccessSvg size={14} />
                          <span>{t('permission.full_access')}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Model Selector (Native Typography Style) */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={styles.modelSelectorBtn}
                    onClick={() => {
                      closeAllMenus()
                      setIsModelDropdownOpen(!isModelDropdownOpen)
                    }}
                  >
                    <span>{selectedModel}</span>
                    <IconChevronDownOutline14 size={10} />
                  </button>

                  {isModelDropdownOpen && (
                    <div className={`${styles.dropdownMenu} ${styles.dropdownMenuDown}`} style={{ minWidth: 170, right: 0, top: 'calc(100% + 6px)' }}>
                      {availableModels.map(m => (
                        <button
                          key={m}
                          type="button"
                          className={`${styles.dropdownItem} ${selectedModel === m ? styles.active : ''}`}
                          onClick={() => {
                            setSelectedModel(m)
                            setIsModelDropdownOpen(false)
                          }}
                        >
                          <span>{m}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <button
                  type="button"
                  className={styles.sendBtn}
                  disabled={!prompt.trim()}
                  onClick={handleSubmit}
                  aria-label="Send prompt"
                >
                  <IconSendOutline16 size={15} />
                </button>
              </div>
            </div>

            {/* Bottom Sub Row (Design System + Working Directory pickers) */}
            <div className={styles.composerBottomSubRow} onClick={e => e.stopPropagation()}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={styles.bottomSubItem}
                  onClick={() => {
                    closeAllMenus()
                    setIsDsPickerOpen(!isDsPickerOpen)
                  }}
                >
                  <IconGlobeOutline14 size={14} />
                  <span>{selectedDesignSystem.name}</span>
                  <IconChevronDownOutline14 size={10} />
                </button>

                {isDsPickerOpen && (
                  <DesignSystemPickerPopover
                    isOpen={isDsPickerOpen}
                    onClose={() => setIsDsPickerOpen(false)}
                    selectedId={selectedDesignSystem.id}
                    onSelect={(id, name) => {
                      setSelectedDesignSystem({ id, name })
                      setIsDsPickerOpen(false)
                    }}
                    systems={systems}
                    t={t}
                  />
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={styles.bottomSubItem}
                  onClick={() => {
                    closeAllMenus()
                    setIsProjectDropdownOpen(!isProjectDropdownOpen)
                  }}
                >
                  <IconBrowseOutline16 size={14} />
                  <span>{selectedFolder ? selectedFolder.name : t('folder.outside_project')}</span>
                  <IconChevronDownOutline14 size={10} />
                </button>

                {isProjectDropdownOpen && (
                  <div className={`${styles.dropdownMenu} ${styles.dropdownMenuDown}`} style={{ minWidth: 220, left: 0 }}>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${!selectedFolder ? styles.active : ''}`}
                      onClick={() => {
                        setSelectedFolder(null)
                        setIsProjectDropdownOpen(false)
                      }}
                    >
                      <div className={styles.dropdownItemLeft}>
                        <IconBrowseOutline16 size={14} />
                        <span>{t('folder.outside_project')}</span>
                      </div>
                    </button>
                    {workspaces.map(w => (
                      <button
                        key={w.id}
                        type="button"
                        className={`${styles.dropdownItem} ${selectedFolder?.id === w.id ? styles.active : ''}`}
                        onClick={() => {
                          setSelectedFolder(w)
                          setIsProjectDropdownOpen(false)
                        }}
                      >
                        <div className={styles.dropdownItemLeft}>
                          <IconBrowseOutline16 size={14} />
                          <span>{w.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills & Examples Section */}
        <div className={styles.examplesSection}>
          <div className={styles.examplesHeaderRow}>
            <div className={styles.examplesHeading}>{t('examples.heading')}</div>
            <div className={styles.categoryFilterRow}>
              {[
                { id: 'all', label: t('examples.cat_all'), icon: <IconAllSvg size={11} /> },
                { id: 'landing', label: t('examples.cat_landing'), icon: <IconFilterRocketSvg size={11} /> },
                { id: 'dashboards', label: t('examples.cat_dashboards'), icon: <IconFilterDashboardSvg size={11} /> },
                { id: 'mobile', label: t('examples.cat_mobile'), icon: <IconFilterMobileSvg size={11} /> },
                { id: 'wireframe', label: t('examples.cat_wireframe'), icon: <IconFilterWireframeSvg size={11} /> },
                { id: 'apps', label: t('examples.cat_apps'), icon: <IconFilterAppSvg size={11} /> },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.catBtn} ${exampleCategory === c.id ? styles.active : ''}`}
                  onClick={() => setExampleCategory(c.id)}
                >
                  <span className={styles.catBtnIcon}>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}

              {/* More Categories Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`${styles.catBtn} ${['slides', 'document', 'hyperframes'].includes(exampleCategory) ? styles.active : ''}`}
                  onClick={() => setIsMoreCatOpen(!isMoreCatOpen)}
                >
                  <span>More</span>
                  <IconChevronDownOutline14 size={10} />
                </button>

                {isMoreCatOpen && (
                  <div className={`${styles.dropdownMenu} ${styles.dropdownMenuDown}`} style={{ minWidth: 150, right: 0, top: 'calc(100% + 6px)' }}>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${exampleCategory === 'slides' ? styles.active : ''}`}
                      onClick={() => {
                        setExampleCategory('slides')
                        setIsMoreCatOpen(false)
                      }}
                    >
                      <span>Slide deck</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${exampleCategory === 'document' ? styles.active : ''}`}
                      onClick={() => {
                        setExampleCategory('document')
                        setIsMoreCatOpen(false)
                      }}
                    >
                      <span>Document</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${exampleCategory === 'hyperframes' ? styles.active : ''}`}
                      onClick={() => {
                        setExampleCategory('hyperframes')
                        setIsMoreCatOpen(false)
                      }}
                    >
                      <span>HyperFrames</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.carouselWrapper}>
            <button
              type="button"
              className={`${styles.scrollArrowBtn} ${styles.scrollArrowLeft}`}
              onClick={() => scrollLeftBy(260)}
              aria-label="Scroll left"
            >
              ‹
            </button>

            <div
              ref={cardsContainerRef}
              className={styles.cardsCarousel}
              onMouseMove={handleCarouselMouseMove}
              onMouseLeave={stopEdgeScroll}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && cardsContainerRef.current) {
                  cardsContainerRef.current.scrollLeft += e.deltaY
                }
              }}
            >
              {isMediaMode ? (
                /* Media Prompt Templates Carousel */
                filteredPromptTemplates.map((item, idx) => (
                  <div
                    key={item.id}
                    className={styles.cardItem}
                    onClick={() => handleSelectPromptTemplate(item)}
                  >
                    <div className={styles.cardThumbnailWrapper}>
                      {item.previewImageUrl ? (
                        <img
                          src={item.previewImageUrl}
                          alt={item.title}
                          loading="lazy"
                        />
                      ) : (
                        <img
                          src={getTemplateThumbnail(item, idx)}
                          alt={item.title}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardTitle} title={item.title}>{item.title}</div>
                      <div className={styles.cardCategoryBadge}>{item.category}</div>
                    </div>
                  </div>
                ))
              ) : (
                /* Design Starter Templates Carousel with LIVE REAL VISUAL THUMBNAILS */
                filteredDesignTemplates.map((item, idx) => (
                  <div
                    key={item.id}
                    className={styles.cardItem}
                    onClick={() => handleSelectTemplate(item)}
                  >
                    <div className={styles.cardThumbnailWrapper}>
                      {renderTemplateVisual(item, idx)}
                    </div>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardTitle} title={item.title}>{item.title}</div>
                      <div className={styles.cardCategoryBadge}>{item.category}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className={`${styles.scrollArrowBtn} ${styles.scrollArrowRight}`}
              onClick={() => scrollRightBy(260)}
              aria-label="Scroll right"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <FigmaImportModal
        isOpen={isFigmaModalOpen}
        onClose={() => setIsFigmaModalOpen(false)}
        onImportMock={(notes) => {
          const importText = notes ? `[Imported from Figma: ${notes}]` : '[Imported from Figma]'
          setPrompt(prev => (prev ? `${prev}\n${importText}` : importText))
        }}
        t={t}
      />
    </div>
  )
}
