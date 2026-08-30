/**
 * Design Prompt Injector for Const-Harness.
 *
 * Implements the Agent Design Brain prompt engine adapted from OpenDesign:
 *   1. Core design charter & senior designer role doctrine.
 *   2. Active brand design system injection (:root CSS tokens & DESIGN.md rules).
 *   3. Craft standards & anti-AI-slop rules (the 7 cardinal sins, typography, color, a11y).
 *   4. Fixed 16:9 slide deck framework (1920x1080 canvas, scale-to-fit JS, print stylesheet, chart & diagram discipline).
 *   5. Mode-specific surface skeletons (prototype, live dashboard, document, hyperframes).
 *   6. Live tweaks parameter schema directive (dataSchemaJson / CSS variables).
 *   7. Fallback canonical design directions (editorial, minimal, approachable, tech, brutalist).
 *
 * @module @const-ai/host-apiproxy/design-prompt-injector
 */

import type {
  CraftGuideline,
  DesignSystemDetail,
  DesignTemplateDetail,
} from './api/design.ts'

/** Supported prompt modes for OpenDesign deliverables. */
export type DesignPromptMode =
  | 'deck'
  | 'prototype'
  | 'dashboard'
  | 'document'
  | 'hyperframes'
  | 'general'

/** Configuration options for generating an OpenDesign system prompt. */
export interface DesignPromptOptions {
  /** Target deliverable mode. Defaults to 'general'. */
  mode?: DesignPromptMode
  /** Brand design system ID (e.g. 'linear-app', 'stripe', 'apple'). */
  designSystemId?: string
  /** Optional pre-loaded design system detail. */
  designSystem?: DesignSystemDetail
  /** Starter design template ID (e.g. 'html-ppt-pitch-deck', 'live-dashboard'). */
  templateId?: string
  /** Optional pre-loaded template detail. */
  template?: DesignTemplateDetail
  /** IDs of craft guidelines to inject. Defaults to key rules. */
  craftRuleIds?: string[]
  /** Optional pre-loaded craft guidelines map. */
  craftGuidelines?: CraftGuideline[]
  /** Whether to inject the fixed 16:9 slide deck framework (auto-true for 'deck' mode). */
  includeSlideSkeleton?: boolean
  /** Whether to inject the interactive live tweaks parameter schema directive (auto-true for 'dashboard' mode). */
  includeLiveTweaksSchema?: boolean
  /** Output locale code (e.g. 'en', 'zh-CN', 'id'). Defaults to 'en'. */
  locale?: string
  /** Custom user/project-level design instructions. */
  customInstructions?: string
}

/** Result of prompt compilation. */
export interface DesignPromptResult {
  /** Full assembled system prompt string. */
  systemPrompt: string
  /** Resolved CSS tokens (:root block) if a design system was active. */
  tokensCss?: string
  /** Resolved DESIGN.md markdown rules if a design system was active. */
  designMarkdown?: string
  /** List of craft rule IDs successfully injected into the prompt. */
  injectedCraftRules: string[]
  /** Compilation metadata. */
  metadata: {
    mode: DesignPromptMode
    designSystemId?: string
    templateId?: string
    locale?: string
  }
}

/** Canonical 5 design directions with OKLch palettes for zero-brand briefs. */
export interface CanonicalDirection {
  id: string
  label: string
  mood: string
  displayFont: string
  bodyFont: string
  monoFont?: string
  palette: {
    bg: string
    surface: string
    fg: string
    muted: string
    border: string
    accent: string
  }
  posture: string[]
}

/** 5 canonical built-in design directions. */
export const CANONICAL_DIRECTIONS: readonly CanonicalDirection[] = [
  {
    id: 'editorial-monocle',
    label: 'Editorial — Monocle / FT Magazine',
    mood: 'Print-magazine feel for publishing, journalism, and editorial briefs. Generous whitespace, large serif headlines, neutral paper tone + ink + single accent.',
    displayFont: "'Iowan Old Style', 'Charter', Georgia, serif",
    bodyFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    palette: {
      bg: 'oklch(98% 0.004 95)',
      surface: 'oklch(100% 0.002 95)',
      fg: 'oklch(20% 0.018 70)',
      muted: 'oklch(48% 0.012 70)',
      border: 'oklch(90% 0.006 95)',
      accent: 'oklch(52% 0.10 28)',
    },
    posture: [
      'serif display, sans body, mono for metadata only',
      'no shadows, no rounded cards — borders + whitespace do the work',
      'kicker / eyebrow in mono uppercase, one accent color used at most twice per screen',
    ],
  },
  {
    id: 'modern-minimal',
    label: 'Modern Minimal — Linear / Vercel',
    mood: 'Quiet, precise, software-native. Crisp neutral foundations, controlled accent signal, tight letter spacing, and tabular numeric data.',
    displayFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    bodyFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    palette: {
      bg: 'oklch(99% 0.002 240)',
      surface: 'oklch(100% 0 0)',
      fg: 'oklch(18% 0.012 250)',
      muted: 'oklch(54% 0.012 250)',
      border: 'oklch(92% 0.005 250)',
      accent: 'oklch(58% 0.18 255)',
    },
    posture: [
      'tight letter-spacing on display sizes (-0.02em)',
      'hairline borders only, no shadows except floating dropdowns/modals',
      'mono numerics with font-variant-numeric: tabular-nums',
      'primary action color + one secondary signal + status colors',
    ],
  },
  {
    id: 'human-approachable',
    label: 'Human / Approachable — Airbnb / Duolingo',
    mood: 'Friendly, tactile, and consumer-led. Comfortable radii (12-18px), clear visual hierarchy, and warm neutral surfaces.',
    displayFont: "'Söhne', 'Avenir Next', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    bodyFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    palette: {
      bg: 'oklch(98% 0.004 240)',
      surface: 'oklch(100% 0 0)',
      fg: 'oklch(20% 0.02 240)',
      muted: 'oklch(50% 0.018 240)',
      border: 'oklch(90% 0.006 240)',
      accent: 'oklch(56% 0.12 170)',
    },
    posture: [
      'sans display with strong weight contrast, system body for readability',
      'comfortable radii (12–18px) paired with crisp grid alignment',
      'subtle elevation only on interactive cards, avoid generic pastel washes',
    ],
  },
  {
    id: 'tech-utility',
    label: 'Tech / Utility — Datadog / GitHub',
    mood: 'Data-dense, monospace-friendly, dark or light grid. Engineered for operators who prioritize information per square inch over ornamentation.',
    displayFont: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif",
    bodyFont: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace",
    palette: {
      bg: 'oklch(98% 0.005 250)',
      surface: 'oklch(100% 0 0)',
      fg: 'oklch(22% 0.02 240)',
      muted: 'oklch(50% 0.018 240)',
      border: 'oklch(90% 0.008 240)',
      accent: 'oklch(58% 0.16 145)',
    },
    posture: [
      'sans display + sans body (one family) is intentional for utility',
      'tabular numerics everywhere, mono for code/IDs/metrics',
      'dense tables with hairline borders, inline status pills with tinted backgrounds',
    ],
  },
  {
    id: 'brutalist-experimental',
    label: 'Brutalist / Experimental — Are.na / Yale',
    mood: 'Loud type, visible grid, system sans + oversized serif. Confident asymmetry and raw contrast for artistic, manifesto, or agency projects.',
    displayFont: "'Times New Roman', 'Iowan Old Style', Georgia, serif",
    bodyFont: "ui-monospace, 'IBM Plex Mono', 'JetBrains Mono', Menlo, monospace",
    palette: {
      bg: 'oklch(98% 0.004 240)',
      surface: 'oklch(100% 0 0)',
      fg: 'oklch(15% 0.02 100)',
      muted: 'oklch(40% 0.02 100)',
      border: 'oklch(15% 0.02 100)',
      accent: 'oklch(60% 0.22 25)',
    },
    posture: [
      'display = serif at extreme sizes clamp(80px, 12vw, 200px)',
      'body = monospace deliberately',
      'borders are full-strength fg (1.5–2px), minimal border-radius (0-2px), no shadows',
    ],
  },
]

/** Canonical fixed 16:9 slide deck HTML skeleton (1920x1080 canvas with hardened JS & print CSS). */
export const DECK_SKELETON_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><!-- SLOT: deck title --></title>
  <style>
    /* ===========================================================
       Deck framework — DO NOT EDIT the rules in this <style> block.
       Edit only inside the second <style> block below (per-deck
       styles) and inside <section class="slide"> bodies.

       Contract this framework provides:
         - 1920×1080 fixed canvas, scaled to fit the viewport
         - Only .slide.active is visible at a time
         - Programmatic prev/next + counter elements kept outside the scaled
           stage but hidden by default for host UI chrome
         - Keyboard (← → space PgUp PgDn Home End R), half-slide click, and stored
           position survive iframe focus quirks
         - "Save as PDF" produces a multi-page vertical PDF, one slide
           per page, by toggling every slide visible under @media print
       =========================================================== */
    :root {
      /* SLOT: theme tokens — the only top-level CSS the agent edits.
         Add or override --bg / --fg / --accent / etc. here. */
      --bg: #ffffff;
      --fg: #1c1b1a;
      --muted: #6b6964;
      --accent: #c96442;
      --surface: #ffffff;
      --shell: #08090d;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--shell);
      color: var(--fg);
      font: 18px/1.5 -apple-system, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .deck-shell {
      position: fixed;
      inset: 0;
      overflow: hidden;
    }
    .deck-stage {
      width: 1920px;
      height: 1080px;
      background: var(--bg);
      position: relative;
      transform-origin: top left;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
    }
    .slide {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    /* Visibility toggle hardened with :not(.active) + !important so cascade
       order cannot break it. */
    .slide:not(.active) { display: none !important; }
    /* The active default uses :where() so it has zero specificity. Per-slide
       variant classes like .s-grid or .s-magazine can override display cleanly. */
    :where(.slide.active) { display: flex; flex-direction: column; }

    /* Programmatic chrome — counter + prev/next live outside the scaled stage */
    .deck-counter {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      align-items: center;
      gap: 4px;
      background: rgba(10, 14, 26, 0.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 6px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #fff;
      font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.18em;
      z-index: 1000;
    }
    .deck-counter button {
      width: 36px; height: 36px;
      background: transparent;
      color: #fff;
      border: 0;
      border-radius: 50%;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: background 0.15s;
    }
    .deck-counter button:hover { background: rgba(255, 255, 255, 0.12); }
    .deck-counter button[disabled] { opacity: 0.3; cursor: default; }
    .deck-counter .deck-count {
      padding: 0 14px;
      letter-spacing: 0.22em;
    }
    .deck-counter .deck-count .total { color: rgba(255, 255, 255, 0.5); }
    .deck-hint {
      position: fixed;
      bottom: 26px;
      right: 28px;
      color: rgba(255, 255, 255, 0.4);
      font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      z-index: 999;
      pointer-events: none;
      display: none;
    }

    /* Print / PDF stitching — every slide stacks top-to-bottom, one per page */
    @media print {
      @page { size: 1920px 1080px; margin: 0; }
      html, body {
        width: 1920px !important;
        height: auto !important;
        overflow: visible !important;
        background: #fff !important;
      }
      .deck-shell {
        position: static !important;
        display: block !important;
        inset: auto !important;
      }
      .deck-stage {
        width: 1920px !important;
        height: auto !important;
        transform: none !important;
        box-shadow: none !important;
        position: static !important;
      }
      .slide {
        display: flex !important;
        position: relative !important;
        inset: auto !important;
        width: 1920px !important;
        height: 1080px !important;
        page-break-after: always;
        break-after: page;
      }
      .slide:last-child { page-break-after: auto; break-after: auto; }
      .deck-counter, .deck-hint { display: none !important; }
    }
  </style>
  <style>
    /* SLOT: per-deck styles — typography, layout helpers, slide variants.
       Add classes used by the slide content below, e.g. .title, .big-stat,
       .grid-3. Do not redefine .deck-shell / .deck-stage / .slide /
       .deck-counter / .deck-hint or anything inside @media print. */
  </style>
</head>
<body>
  <div class="deck-shell">
    <div class="deck-stage" id="deck-stage">

      <!-- SLOT: slides — one <section class="slide"> per slide. The first
           slide must have class="slide active". The framework auto-counts
           them and toggles .active as the user navigates. -->

      <section class="slide active" data-screen-label="01 Title">
        <!-- SLOT: slide 1 content -->
      </section>

      <section class="slide" data-screen-label="02">
        <!-- SLOT: slide 2 content -->
      </section>

      <!-- ... add as many <section class="slide"> blocks as the brief asks
           for. The first one is .active; the rest are not. -->

    </div>
  </div>

  <!-- Framework chrome — DO NOT EDIT below this line. -->
  <nav class="deck-counter" role="navigation" aria-label="Deck navigation">
    <button type="button" id="deck-prev" aria-label="Previous slide">‹</button>
    <span class="deck-count"><span id="deck-cur">01</span> <span class="total">/ <span id="deck-total">01</span></span></span>
    <button type="button" id="deck-next" aria-label="Next slide">›</button>
  </nav>
  <div class="deck-hint">← / → · space · R reset</div>

  <script>
    (function () {
      var stage = document.getElementById('deck-stage');
      var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
      var prev = document.getElementById('deck-prev');
      var next = document.getElementById('deck-next');
      var cur = document.getElementById('deck-cur');
      var total = document.getElementById('deck-total');
      var STORE = 'deck:idx:' + (location.pathname || '/');
      var idx = 0;

      // ---- scale-to-fit ---------------------------------------------------
      function fit() {
        var sw = window.innerWidth;
        var sh = window.innerHeight;
        var pad = 32;
        var s = Math.min((sw - pad) / 1920, (sh - pad) / 1080);
        if (!isFinite(s) || s <= 0) s = 1;
        var tx = (sw - 1920 * s) / 2;
        var ty = (sh - 1080 * s) / 2;
        stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
      }

      // ---- navigation -----------------------------------------------------
      function pad2(n) { return (n < 10 ? '0' : '') + n; }
      function paint() {
        slides.forEach(function (el, i) { el.classList.toggle('active', i === idx); });
        if (cur) cur.textContent = pad2(idx + 1);
        if (total) total.textContent = pad2(slides.length);
        if (prev) prev.toggleAttribute('disabled', idx <= 0);
        if (next) next.toggleAttribute('disabled', idx >= slides.length - 1);
      }
      function go(i) {
        idx = Math.max(0, Math.min(slides.length - 1, i));
        paint();
        try { localStorage.setItem(STORE, String(idx)); } catch (_) {}
      }
      function onKey(e) {
        if (e.__odDeckKeyHandled) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.__odDeckKeyHandled = true; e.preventDefault(); go(idx + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.__odDeckKeyHandled = true; e.preventDefault(); go(idx - 1); }
        else if (e.key === 'Home' || String(e.key).toLowerCase() === 'r') { e.__odDeckKeyHandled = true; e.preventDefault(); go(0); }
        else if (e.key === 'End') { e.__odDeckKeyHandled = true; e.preventDefault(); go(slides.length - 1); }
      }
      window.addEventListener('keydown', onKey, true);
      document.addEventListener('keydown', onKey, true);
      if (prev) prev.addEventListener('click', function () { go(idx - 1); });
      if (next) next.addEventListener('click', function () { go(idx + 1); });
      document.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        if (e.button !== undefined && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
        var t = e.target;
        while (t && t !== document.body && t !== document.documentElement) {
          var tag = String(t.tagName || '').toUpperCase();
          if (
            tag === 'A' ||
            tag === 'BUTTON' ||
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            tag === 'SELECT' ||
            t.isContentEditable ||
            t.getAttribute('role') === 'button' ||
            t.getAttribute('role') === 'link'
          ) return;
          t = t.parentElement;
        }
        focusDeck();
        if (e.clientX < window.innerWidth / 2) go(idx - 1);
        else go(idx + 1);
      }, true);

      document.body.setAttribute('tabindex', '-1');
      document.body.style.outline = 'none';
      function focusDeck() { try { window.focus(); document.body.focus({ preventScroll: true }); } catch (_) {} }
      document.addEventListener('mousedown', focusDeck);
      window.addEventListener('load', focusDeck);

      try {
        var saved = parseInt(localStorage.getItem(STORE) || '0', 10);
        if (!isNaN(saved) && saved >= 0 && saved < slides.length) idx = saved;
      } catch (_) {}

      window.addEventListener('resize', fit);
      fit();
      paint();
      focusDeck();
    })();
  </script>
</body>
</html>`

/** Fixed slide deck framework directive. */
export const DECK_FRAMEWORK_DIRECTIVE = `# Slide Deck — Fixed 16:9 Framework (Non-Negotiable)

When authoring slides, your deliverable is a single self-contained HTML file built from the canonical 1920×1080 skeleton. **Copy the skeleton verbatim**, including its first \`<style>\` block, \`.deck-shell\` / \`.deck-stage\` structure, and the entire trailing \`<script>\`.

## Rules & Disciplines

1. **Canvas & Scaling**: Strictly 1920×1080 canvas per slide. Do not write custom \`fit()\` scripts or alter \`transform-origin: top left\`.
2. **One Visual Focal Point Per Slide**: Only one primary focal weight per slide (a key headline, a hero statistic, or a clear chart). Do not compete for attention.
3. **Density & Overflow Discipline**:
   - Cover/Title display headlines: max ~140px, max 8 words.
   - Body slides: ≤ 3 paragraphs, ≤ 56ch width.
   - Flow content must leave an 80px safe zone above bottom-anchored footers.
4. **Data Chart Discipline**:
   - Computed bar widths/heights: declare \`--max\` once on the container and \`--v\` inline on each bar (\`.bar { width: calc(var(--v) / var(--max) * 100%); }\`). Never eyeball magic percentages.
   - Render numeric values outside the bar so short bars do not clip the label.
5. **Mermaid Diagram Theme Discipline**:
   - Dark slide backgrounds MUST initialize Mermaid with \`theme: 'dark'\` or \`theme: 'base'\` with explicit dark \`themeVariables\`. Never leave default light theme on dark slides.

## Canonical Deck Skeleton

\`\`\`html
${DECK_SKELETON_HTML}
\`\`\`
`

/** Anti-AI-slop rules and 7 cardinal sins. */
export const ANTI_AI_SLOP_RULES = `## Mandatory Craft Standards: The 7 Cardinal Sins of AI Slop

Avoid these cliché AI visual patterns at all costs:
1. **Default Tailwind Indigo Accent**: Never use \`#6366f1\`, \`#4f46e5\`, \`#4338ca\`, \`#3730a3\`, \`#8b5cf6\`, \`#7c3aed\`. Always use the active system's \`--accent\` token.
2. **Two-Stop Purple-Blue Gradient Hero**: Avoid generic purple→blue or indigo→pink gradient washes. A crisp flat surface with deliberate typography wins every time.
3. **Emoji as Feature Icons**: Never use emoji (✨ 🚀 🎯 ⚡ 🔥) inside buttons, cards, or headings. Use clean monoline inline SVGs with \`currentColor\`.
4. **Sans-Serif on Display when Serif is Bound**: When the active theme binds a serif display font, use \`var(--font-display)\` for headlines, not unstyled system sans.
5. **Rounded Card with Colored Left Border**: The canonical AI dashboard tile shape. Drop either the heavy border radius or the colored left stripe.
6. **Invented Metrics**: Avoid fake claims like "10x faster" or "99.9% uptime" without user-provided data. Use honest, labeled placeholders.
7. **Filler Copy**: Never use \`lorem ipsum\` or "Feature One/Two/Three". Use specific, domain-relevant prose and microcopy.

## Additional Quality Gates
- **Action Economy**: Exactly ONE solid primary CTA button per visible viewport. Secondary actions must be ghost, outline, or text links.
- **Color Discipline**: Maximum 2 visible uses of \`var(--accent)\` per viewport.
- **Contrast & States**: Maintain WCAG AA contrast (≥ 4.5:1 for body text, ≥ 3:1 for UI controls/icons). Verify hover, focus, and active state pairings.`

/** Live Tweaks parameter schema directive for interactive live-preview adjustments. */
export const LIVE_TWEAKS_DIRECTIVE = `## Live Tweaks & Interactive Parameter Directive

For dashboards, prototypes, or artifacts with customizable parameters, embed a machine-readable parameter schema in a \`<script type="application/json" id="data-schema">\` block at the bottom of \`<body>\`:

\`\`\`html
<script type="application/json" id="data-schema">
{
  "parameters": [
    { "id": "themeColor", "label": "Accent Color", "type": "color", "target": "--accent", "default": "#0066ff" },
    { "id": "cardRadius", "label": "Card Radius (px)", "type": "number", "target": "--radius", "min": 0, "max": 24, "default": 8 },
    { "id": "showMetrics", "label": "Show Live Stats", "type": "boolean", "target": "body.has-metrics", "default": true }
  ]
}
</script>
\`\`\`

This schema enables real-time visual adjustment directly inside the OpenDesign preview studio without re-prompting.`

/**
 * Compiles an expert system prompt tailored for OpenDesign artifact creation.
 *
 * @param options - Prompt configuration parameters.
 * @returns Complete assembled system prompt and metadata.
 */
export function injectDesignPrompt(options: DesignPromptOptions): DesignPromptResult {
  const mode = options.mode ?? 'general'
  const locale = options.locale ?? 'en'
  const injectedCraftRules: string[] = []
  const sections: string[] = []

  // 1. Core Role & Instruction Priority
  sections.push(renderCoreCharter(locale))

  // 2. Locale Directive
  if (locale !== 'en') {
    sections.push(renderLocaleDirective(locale))
  }

  // 3. Active Design System (Tokens & Rules)
  let tokensCss: string | undefined
  let designMarkdown: string | undefined

  if (options.designSystem !== undefined) {
    tokensCss = options.designSystem.tokensCss.trim()
    designMarkdown = options.designSystem.designMarkdown.trim()

    sections.push(`## Active Design System — ${options.designSystem.name}\n`)
    if (designMarkdown.length > 0) {
      sections.push(`### Visual Principles & Guidelines\n\n${designMarkdown}\n`)
    }
    if (tokensCss.length > 0) {
      sections.push(
        '### Verbatim :root CSS Tokens Contract\n\n' +
          '**Paste the following `:root { ... }` block verbatim into your artifact\'s first `<style>` tag:**\n\n' +
          `\`\`\`css\n${tokensCss}\n\`\`\`\n`,
      )
    }
  } else {
    // Fallback to Canonical Directions
    sections.push(renderCanonicalDirectionsFallback())
  }

  // 4. Craft Standards & Anti-AI-Slop Rules
  sections.push(ANTI_AI_SLOP_RULES)

  // Append Injected Craft Guidelines
  if (options.craftGuidelines !== undefined && options.craftGuidelines.length > 0) {
    const craftTexts = options.craftGuidelines.map((cg) => {
      injectedCraftRules.push(cg.id)
      return `### Craft Rule: ${cg.title}\n\n${cg.content.trim()}`
    })
    sections.push(`## Universal Craft Guidelines\n\n${craftTexts.join('\n\n')}`)
  }

  // 5. Mode-Specific Skeletons & Directives
  const isDeck = mode === 'deck' || options.includeSlideSkeleton === true
  const isDashboard = mode === 'dashboard' || options.includeLiveTweaksSchema === true

  if (isDeck) {
    sections.push(DECK_FRAMEWORK_DIRECTIVE)
  } else if (mode === 'prototype') {
    sections.push(renderPrototypeDirective())
  } else if (mode === 'document') {
    sections.push(renderDocumentDirective())
  } else if (mode === 'hyperframes') {
    sections.push(renderHyperFramesDirective())
  }

  // 6. Live Tweaks Schema Directive (for dashboard/interactive modes)
  if (isDashboard) {
    sections.push(LIVE_TWEAKS_DIRECTIVE)
  }

  // 7. Starter Template Guidance (if provided)
  if (options.template !== undefined) {
    sections.push(
      `## Active Starter Template: ${options.template.title}\n\n` +
        `Description: ${options.template.description}\n\n` +
        'When crafting the output, use the starter layout as reference while updating content, copy, and visual tokens.\n',
    )
  }

  // 8. Custom Instructions (User/Project)
  if (options.customInstructions !== undefined && options.customInstructions.trim().length > 0) {
    sections.push(`## Custom Project Instructions\n\n${options.customInstructions.trim()}`)
  }

  // 9. Final Output Delivery Contract
  sections.push(renderDeliveryContract(isDeck))

  const systemPrompt = sections.join('\n\n---\n\n')

  return {
    systemPrompt,
    ...tokensCss !== undefined ? { tokensCss } : {},
    ...designMarkdown !== undefined ? { designMarkdown } : {},
    injectedCraftRules,
    metadata: {
      mode,
      ...options.designSystemId !== undefined ? { designSystemId: options.designSystemId } : {},
      ...options.templateId !== undefined ? { templateId: options.templateId } : {},
      locale,
    },
  }
}

/** DesignPromptInjector helper namespace. */
export const DesignPromptInjector = {
  inject: injectDesignPrompt,
} as const

/** Renders core senior designer charter and instruction priorities. */
function renderCoreCharter(locale: string): string {
  const isZh = locale.startsWith('zh')
  const isId = locale.startsWith('id')

  if (isZh) {
    return `# OpenDesign 专家设计宪章

## 角色定位
你是一名顶级数字产品与视觉设计工程师。你的目标是产出符合专业设计系统标准、具备极高审美水准、完全消除 AI 模板感的独立运行 HTML 文件。

## 指令优先级
1. 用户当前轮次的显式要求；
2. 激活的 Design System (:root Token 与 DESIGN.md)；
3. 本设计宪章与 Universal Craft 规范；
4. 默认通用规则。`
  }

  if (isId) {
    return `# Piagam Desain Utama OpenDesign

## Peran & Tanggung Jawab
Anda adalah seorang Senior Digital Product Designer & Frontend Craft Engineer. Misi Anda adalah memproduksi artefak desain HTML yang indah, presisi, berstandar industri tinggi, dan bebas dari AI slop.

## Prioritas Instruksi
1. Permintaan eksplisit pengguna pada sesi saat ini;
2. Active Design System (:root CSS tokens & aturan DESIGN.md);
3. Standar Craft & Anti-AI-Slop;
4. Aturan bawaan umum.`
  }

  return `# OpenDesign Senior Designer Charter

## Role & Mission
You are an elite Digital Product Designer and Creative Frontend Engineer. Your goal is to produce stunning, production-ready, standalone HTML design artifacts (slide decks, web prototypes, live dashboards, documents, or motion graphics) that adhere strictly to design system tokens and eliminate generic AI slop.

## Instruction Priority
1. User's explicit instructions in the current turn;
2. Active Brand Design System (:root CSS tokens & DESIGN.md);
3. Craft Guidelines & Anti-AI-Slop Standards;
4. General system defaults.`
}

/** Renders locale override instructions. */
function renderLocaleDirective(locale: string): string {
  const langName = locale === 'zh-CN' ? 'Simplified Chinese' : locale === 'id' ? 'Indonesian' : locale
  return `## UI & Content Language Override

The requested output locale is \`${locale}\` (${langName}). All user-visible headings, body text, buttons, navigation items, chart labels, and notes in the generated HTML artifact must be written naturally in ${langName}.`
}

/** Renders fallback canonical direction guidance when no brand is selected. */
function renderCanonicalDirectionsFallback(): string {
  const lines = [
    '## Visual Direction Selection (Zero-Brand Default)',
    '',
    'No brand design system was pre-selected. Choose one of the 5 canonical design directions below based on the brief\'s domain, tone, and audience, then bind its OKLch palette and typography into `:root` before generating the layout:',
    '',
  ]

  for (const dir of CANONICAL_DIRECTIONS) {
    lines.push(`### ${dir.label} (\`${dir.id}\`)`)
    lines.push(`- **Mood**: ${dir.mood}`)
    lines.push(`- **Fonts**: Display: \`${dir.displayFont}\` | Body: \`${dir.bodyFont}\``)
    lines.push(`- **Palette**: bg: \`${dir.palette.bg}\`, surface: \`${dir.palette.surface}\`, fg: \`${dir.palette.fg}\`, muted: \`${dir.palette.muted}\`, border: \`${dir.palette.border}\`, accent: \`${dir.palette.accent}\``)
    lines.push(`- **Posture**: ${dir.posture.join('; ')}`)
    lines.push('')
  }

  return lines.join('\n')
}

/** Renders web prototype mode directive. */
function renderPrototypeDirective(): string {
  return `## Web / Application Prototype Directive

- Design clean, semantic responsive layouts using modern CSS Flexbox and Grid.
- Provide full interactive states (:hover, :focus-visible, :active) with clear contrast pairs.
- Include realistic domain modules (e.g. navigation, modal overlays, search filters, detail drawers).
- Ensure mobile viewports adapt smoothly without unintended horizontal overflow.`
}

/** Renders document mode directive. */
function renderDocumentDirective(): string {
  return `## Editorial Document Directive

- Use an editorial vertical flow with clear typographic hierarchy and page-break definitions.
- Set generous margins and comfortable line heights (1.6 - 1.8 for long-form body text).
- Include header metadata, table of contents (if applicable), and print-ready styles (@media print).`
}

/** Renders HyperFrames motion directive. */
function renderHyperFramesDirective(): string {
  return `## HyperFrames Motion Directive

- Build performant 60fps CSS / GSAP timeline animations using GPU-accelerated \`transform\` and \`opacity\` only.
- Avoid animating layout-triggering properties (\`width\`, \`height\`, \`top\`, \`margin\`).
- Ensure all animations can be paused or replayed with deterministic timeline markers.`
}

/** Renders final output delivery contract. */
function renderDeliveryContract(isDeck: boolean): string {
  return `## Output Delivery Contract

1. **Standalone Deliverable**: Output the complete, fully-formed HTML file containing all styles, scripts, SVG assets, and content.
2. **No Placeholders or Truncation**: Deliver the entire code without skipping sections or using temporary stubs.
3. **Semantic Filename**: Name the output file descriptively based on the brief (e.g. \`${isDeck ? 'pitch-deck.html' : 'product-prototype.html'}\`).
4. **Summary**: Conclude your response with a concise summary of the visual decisions, token bindings, and structure implemented.`
}
