import React, { useState, useRef, useEffect } from 'react'
import type { DesignSystemSummary } from '@const-ai/host-apiproxy/api'
import {
  IconCloseOutline16,
  IconPaletteOutline16,
  IconPlusOutline16,
  IconFileOutline16,
  IconCheckOutline16,
  IconChevronDownOutline14,
} from '@const-ai/client-ui-primitives'
import styles from './CreateDesignSystemModal.module.css'

export interface CreateDesignSystemModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (system: DesignSystemSummary) => void
}

const CATEGORY_OPTIONS = [
  'Modern SaaS',
  'Minimal & Clean',
  'Editorial & Magazine',
  'FinTech & Dashboard',
  'Dark Cyber & DevTools',
  'Creative & Studio',
  'Luxury & Brand',
  'Custom...',
]

const DISPLAY_FONTS = [
  'Plus Jakarta Sans',
  'Inter',
  'Geist Sans',
  'Playfair Display',
  'Cinzel',
  'Clash Display',
  'Cabinet Grotesk',
  'Instrument Serif',
  'Space Grotesk',
  'Outfit',
  'Manrope',
  'Syne',
  'Custom...',
]

const BODY_FONTS = [
  'Inter',
  'Geist Sans',
  'Plus Jakarta Sans',
  'Roboto',
  'Open Sans',
  'Merriweather',
  'Source Sans 3',
  'Custom...',
]

const MONO_FONTS = [
  'JetBrains Mono',
  'Geist Mono',
  'Fira Code',
  'SF Mono',
  'Roboto Mono',
  'Custom...',
]

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  previewFonts?: boolean
}

function CustomSelect({
  value,
  onChange,
  options,
  previewFonts = false,
}: CustomSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={styles.customSelectWrapper} ref={menuRef}>
      <button
        type="button"
        className={`${styles.customSelectTrigger} ${isOpen ? styles.selectOpen : ''}`}
        onClick={() => { setIsOpen(!isOpen) }}
      >
        <span
          className={styles.customSelectValue}
          style={previewFonts && value !== 'Custom...' ? { fontFamily: value } : undefined}
        >
          {value}
        </span>
        <IconChevronDownOutline14
          size={11}
          className={`${styles.chevron} ${isOpen ? styles.chevronRotated : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.customSelectDropdown}>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              className={`${styles.customSelectItem} ${opt === value ? styles.selectedItem : ''}`}
              onClick={() => {
                onChange(opt)
                setIsOpen(false)
              }}
            >
              <div className={styles.itemContent}>
                {previewFonts && opt !== 'Custom...' && (
                  <span className={styles.fontGlyphPreview} style={{ fontFamily: opt }}>
                    Ag
                  </span>
                )}
                <span
                  className={styles.itemLabel}
                  style={previewFonts && opt !== 'Custom...' ? { fontFamily: opt } : undefined}
                >
                  {opt}
                </span>
              </div>
              {opt === value && (
                <IconCheckOutline16 size={13} className={styles.itemCheck} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CreateDesignSystemModal({
  isOpen,
  onClose,
  onCreate,
}: CreateDesignSystemModalProps): React.JSX.Element | null {
  const [tab, setTab] = useState<'form' | 'markdown'>('form')

  // Form states
  const [name, setName] = useState('')
  const [categorySelect, setCategorySelect] = useState('Modern SaaS')
  const [customCategory, setCustomCategory] = useState('')
  const [quote, setQuote] = useState('')

  // Font selections
  const [displayFontSelect, setDisplayFontSelect] = useState('Plus Jakarta Sans')
  const [customDisplayFont, setCustomDisplayFont] = useState('')
  const [bodyFontSelect, setBodyFontSelect] = useState('Inter')
  const [customBodyFont, setCustomBodyFont] = useState('')
  const [monoFontSelect, setMonoFontSelect] = useState('JetBrains Mono')
  const [customMonoFont, setCustomMonoFont] = useState('')

  // Color palette state (start with clean essential palette)
  const [colors, setColors] = useState<string[]>([
    '#2563eb',
    '#38bdf8',
    '#10b981',
    '#0f172a',
    '#f8fafc',
  ])
  const [newColorInput, setNewColorInput] = useState('#3b82f6')

  // Markdown state (empty by default, no dummy color detection)
  const [markdownText, setMarkdownText] = useState('')
  const [detectedMarkdownColors, setDetectedMarkdownColors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addColorInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const resolvedCategory = categorySelect === 'Custom...' ? (customCategory.trim() || 'Custom') : categorySelect
  const resolvedDisplayFont = displayFontSelect === 'Custom...' ? (customDisplayFont.trim() || 'Inter') : displayFontSelect
  const resolvedBodyFont = bodyFontSelect === 'Custom...' ? (customBodyFont.trim() || 'Inter') : bodyFontSelect
  const resolvedMonoFont = monoFontSelect === 'Custom...' ? (customMonoFont.trim() || 'JetBrains Mono') : monoFontSelect

  const parseMarkdown = (text: string) => {
    let extractedName = name
    let extractedQuote = quote
    let extractedCategory = categorySelect
    let extractedDisplay = displayFontSelect
    let extractedBody = bodyFontSelect
    let extractedMono = monoFontSelect

    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('# ') && !extractedName) {
        extractedName = trimmed.replace(/^#\s*(?:Design System Inspired by\s*)?/i, '').trim()
      }
      if (trimmed.startsWith('> ') && trimmed.toLowerCase().includes('category:')) {
        extractedCategory = trimmed.replace(/^>\s*category:\s*/i, '').trim()
      } else if (trimmed.startsWith('> ') && !extractedQuote) {
        extractedQuote = trimmed.slice(2).trim()
      }
      if (trimmed.includes('Families:') || trimmed.includes('families:')) {
        const dMatch = trimmed.match(/display=([^,;]+)/i)
        if (dMatch && dMatch[1]) extractedDisplay = dMatch[1].trim()
        const pMatch = trimmed.match(/(?:primary|body)=([^,;]+)/i)
        if (pMatch && pMatch[1]) extractedBody = pMatch[1].trim()
        const mMatch = trimmed.match(/mono=([^,;]+)/i)
        if (mMatch && mMatch[1]) extractedMono = mMatch[1].trim()
      }
    }

    const hexMatches = text.match(/#[0-9a-fA-F]{6}\b/g)
    const hexes = hexMatches ? Array.from(new Set(hexMatches.map(h => h.toLowerCase()))) : []

    if (extractedName) setName(extractedName)
    if (extractedQuote) setQuote(extractedQuote)
    if (extractedCategory) {
      if (CATEGORY_OPTIONS.includes(extractedCategory)) {
        setCategorySelect(extractedCategory)
      } else {
        setCategorySelect('Custom...')
        setCustomCategory(extractedCategory)
      }
    }
    if (extractedDisplay) {
      if (DISPLAY_FONTS.includes(extractedDisplay)) {
        setDisplayFontSelect(extractedDisplay)
      } else {
        setDisplayFontSelect('Custom...')
        setCustomDisplayFont(extractedDisplay)
      }
    }
    if (extractedBody) {
      if (BODY_FONTS.includes(extractedBody)) {
        setBodyFontSelect(extractedBody)
      } else {
        setBodyFontSelect('Custom...')
        setCustomBodyFont(extractedBody)
      }
    }
    if (extractedMono) {
      if (MONO_FONTS.includes(extractedMono)) {
        setMonoFontSelect(extractedMono)
      } else {
        setMonoFontSelect('Custom...')
        setCustomMonoFont(extractedMono)
      }
    }
    if (hexes.length > 0) {
      setColors(hexes)
      setDetectedMarkdownColors(hexes)
    } else {
      setDetectedMarkdownColors([])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setMarkdownText(content)
        parseMarkdown(content)
      }
    }
    reader.readAsText(file)
  }

  const handleAddColor = (newHex: string) => {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(newHex)) return
    const formatted = newHex.toLowerCase()
    if (!colors.includes(formatted)) {
      setColors(prev => [...prev, formatted])
    }
  }

  const handleUpdateColor = (index: number, newHex: string) => {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(newHex)) return
    setColors(prev => prev.map((c, i) => (i === index ? newHex.toLowerCase() : c)))
  }

  const handleRemoveColor = (index: number) => {
    if (colors.length <= 1) return
    setColors(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim() || 'Custom Design System'
    const id = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `custom-${Date.now()}`

    const newSystem: DesignSystemSummary = {
      id,
      name: trimmedName,
      category: resolvedCategory,
      description: quote.trim() || `Custom design system for ${trimmedName}`,
      tags: [id, resolvedCategory.toLowerCase(), 'custom'],
      suggestedCraft: ['color', 'accessibility-baseline'],
      previewColors: colors.slice(0, 5),
      palette: colors,
      displayFont: resolvedDisplayFont,
      bodyFont: resolvedBodyFont,
      monoFont: resolvedMonoFont,
      ...(quote.trim() ? { identityQuote: quote.trim() } : {}),
      hasTailwind: false,
    }

    onCreate(newSystem)
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => { e.stopPropagation() }}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <IconPaletteOutline16 size={18} />
            <h2>Create Design System</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <IconCloseOutline16 size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'form' ? styles.active : ''}`}
            onClick={() => { setTab('form') }}
          >
            Visual Builder
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'markdown' ? styles.active : ''}`}
            onClick={() => { setTab('markdown') }}
          >
            Upload / Paste DESIGN.md
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={styles.formWrapper}>
          <div className={styles.bodyContent}>
            {tab === 'form' ? (
              <>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>System Name *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Acme Studio"
                      value={name}
                      onChange={(e) => { setName(e.target.value) }}
                      required
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Category</label>
                    <CustomSelect
                      value={categorySelect}
                      onChange={setCategorySelect}
                      options={CATEGORY_OPTIONS}
                    />
                    {categorySelect === 'Custom...' && (
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Type custom category name..."
                        value={customCategory}
                        onChange={(e) => { setCustomCategory(e.target.value) }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                {/* Identity & Philosophy Quote */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Identity & Philosophy Quote</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Describe the aesthetic direction, vibe, mood, and brand rules..."
                    value={quote}
                    onChange={(e) => { setQuote(e.target.value) }}
                    rows={3}
                  />
                </div>

                {/* Typography Selectors */}
                <div className={styles.sectionDivider}>
                  <span>Typography Hierarchy</span>
                </div>

                <div className={styles.typographyRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Display Font</label>
                    <CustomSelect
                      value={displayFontSelect}
                      onChange={setDisplayFontSelect}
                      options={DISPLAY_FONTS}
                      previewFonts
                    />
                    {displayFontSelect === 'Custom...' && (
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Clash Display"
                        value={customDisplayFont}
                        onChange={(e) => { setCustomDisplayFont(e.target.value) }}
                      />
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Body Font</label>
                    <CustomSelect
                      value={bodyFontSelect}
                      onChange={setBodyFontSelect}
                      options={BODY_FONTS}
                      previewFonts
                    />
                    {bodyFontSelect === 'Custom...' && (
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Open Sans"
                        value={customBodyFont}
                        onChange={(e) => { setCustomBodyFont(e.target.value) }}
                      />
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Mono Font</label>
                    <CustomSelect
                      value={monoFontSelect}
                      onChange={setMonoFontSelect}
                      options={MONO_FONTS}
                      previewFonts
                    />
                    {monoFontSelect === 'Custom...' && (
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Roboto Mono"
                        value={customMonoFont}
                        onChange={(e) => { setCustomMonoFont(e.target.value) }}
                      />
                    )}
                  </div>
                </div>

                {/* Color Palette Manager */}
                <div className={styles.sectionDivider}>
                  <span>Color Palette</span>
                </div>

                {/* Active Color Swatches & Add Color */}
                <div className={styles.paletteManager}>
                  <div className={styles.swatchList}>
                    {colors.map((color, idx) => (
                      <div key={idx} className={styles.swatchCard}>
                        <div className={styles.colorInputWrapper}>
                          <input
                            type="color"
                            value={color}
                            className={styles.nativeColorInput}
                            onChange={(e) => { handleUpdateColor(idx, e.target.value) }}
                            title="Click to pick color"
                          />
                          <div
                            className={styles.swatchCircle}
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        <input
                          type="text"
                          className={styles.hexInput}
                          value={color}
                          onChange={(e) => { handleUpdateColor(idx, e.target.value) }}
                        />
                        {colors.length > 1 && (
                          <button
                            type="button"
                            className={styles.removeColorBtn}
                            onClick={() => { handleRemoveColor(idx) }}
                            aria-label={`Remove color ${color}`}
                          >
                            <IconCloseOutline16 size={10} />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Add Color Button */}
                    <div className={styles.addColorWrapper}>
                      <input
                        ref={addColorInputRef}
                        type="color"
                        value={newColorInput}
                        className={styles.nativeColorInput}
                        onChange={(e) => {
                          setNewColorInput(e.target.value)
                          handleAddColor(e.target.value)
                        }}
                      />
                      <button
                        type="button"
                        className={styles.addColorBtn}
                        onClick={() => { addColorInputRef.current?.click() }}
                      >
                        <IconPlusOutline16 size={12} />
                        <span>Add Color</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <div
                  className={styles.uploadBanner}
                  onClick={() => { fileInputRef.current?.click() }}
                >
                  <IconFileOutline16 size={24} />
                  <span className={styles.uploadText}>
                    Click to upload a <code>DESIGN.md</code> file
                  </span>
                  <span className={styles.uploadSub}>
                    Supports standard DESIGN.md with typography and color definitions
                  </span>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Paste Markdown Content</label>
                  <textarea
                    className={`${styles.textarea} ${styles.mdTextarea}`}
                    placeholder="Paste DESIGN.md content here (headings, quotes, font families, and #hex colors)..."
                    value={markdownText}
                    onChange={(e) => {
                      setMarkdownText(e.target.value)
                      parseMarkdown(e.target.value)
                    }}
                  />
                </div>

                {detectedMarkdownColors.length > 0 && markdownText.trim().length > 0 && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Detected Palette ({detectedMarkdownColors.length} colors)
                    </label>
                    <div className={styles.swatchPreviewRow}>
                      {detectedMarkdownColors.map((c, i) => (
                        <div
                          key={i}
                          className={styles.swatchCircle}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createBtn}
            >
              <IconCheckOutline16 size={14} />
              <span>Create & Apply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
