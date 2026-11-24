# JobPilot AI: Precision Utility Design System

This document is the single source of truth for visual tokens, typography, spacing, radii, shadows, and interactive states for JobPilot AI. All surfaces must adhere to these specifications without arbitrary pixel overrides.

---

## 1. Design Direction: Precision Utility
- **Aesthetic:** Dark, dense, quiet, keyboard-first (Linear / Raycast / Warp).
- **Core Principle:** The UI does not narrate: it reports truthful machine and domain state.
- **Rules:**
  - Strictly zero emoji in the user interface.
  - All icons are Lucide, sized to 16px with a stroke width of 1.5px.
  - Exactly one accent color for primary focus and active states.
  - Semantic colors are reserved strictly for status (success, warning, error).
  - No linear or radial gradients, no glow shadows, no glassmorphism, no neon backdrops.
  - Cards and containers are flat with a 1px hairline border. Shadows are reserved exclusively for floating menus, dropdowns, dialogs, and drawers.

---

## 2. Color Tokens

### Base Surfaces
- `--bg-canvas`: `#090a0f` (Main workspace window background)
- `--bg-surface`: `#0f1118` (Primary cards, sidebar, table containers)
- `--bg-surface-raised`: `#151823` (Active rows, input fields, raised widgets)
- `--bg-overlay`: `#1a1e2d` (Dropdown menus, modal dialogs, drawers)
- `--bg-hover`: `rgba(255, 255, 255, 0.04)`
- `--bg-active`: `rgba(255, 255, 255, 0.08)`

### Borders
- `--border-hairline`: `rgba(255, 255, 255, 0.08)` (Default 1px flat border)
- `--border-subtle`: `rgba(255, 255, 255, 0.14)` (Dividers and inactive inputs)
- `--border-focus`: `#3b82f6` (Keyboard focus ring: 2px solid)
- `--border-active`: `rgba(255, 255, 255, 0.22)`

### Typography Colors
- `--text-primary`: `#f1f5f9` (Headings, primary values, active controls)
- `--text-secondary`: `#94a3b8` (Subheadings, table labels, active chips)
- `--text-muted`: `#64748b` (Secondary labels, breadcrumbs, placeholder text)
- `--text-disabled`: `#334155` (Disabled actions, inactive controls)

### Single Accent Color
- `--accent`: `#3b82f6` (Raycast / Linear Precision Blue)
- `--accent-subtle`: `rgba(59, 130, 246, 0.12)` (Selection backgrounds, active tabs)
- `--accent-hover`: `#2563eb` (Button hover state)
- `--accent-text`: `#60a5fa` (Active text highlights)

### Semantic Status Colors (Status only)
- `--status-success`: `#10b981` (Verified, applied, interview scheduled)
- `--status-success-bg`: `rgba(16, 185, 129, 0.10)`
- `--status-warning`: `#f59e0b` (Assessment pending, quota alert, sync needed)
- `--status-warning-bg`: `rgba(245, 158, 11, 0.10)`
- `--status-error`: `#ef4444` (Rejected, scam flagged, gateway offline)
- `--status-error-bg`: `rgba(239, 68, 68, 0.10)`

---

## 3. Typography Scale

Fonts:
- UI Font: System sans-serif stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", system-ui, sans-serif`)
- Mono Font: System monospace stack (`ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace`) for machine values only (timestamps, counts, IDs, ports, URLs, scores).

Scale & Weights:
- **Section Titles:** `24px` | Weight: `590` | Line-height: `1.2` | Tracking: `-0.02em`
- **Body & Prompts:** `14px` | Weight: `400` | Line-height: `1.5` | Tracking: `-0.01em`
- **UI Elements & Table Cells:** `13px` | Weight: `510` | Line-height: `1.4` | Tracking: `-0.005em`
- **Captions, Badges, Meta:** `12px` | Weight: `400` | Line-height: `1.3` | Tracking: `0`

Weights Allowed: `400` (Regular), `510` (Medium), `590` (Semibold).

---

## 4. Spacing Scale (4px Grid)
All padding, margin, gap, and dimension values must use this 4px scale:
- `4px` (`--space-1`): Gap between compact chips, icon-to-text gap
- `8px` (`--space-2`): Button inner padding, card item gap, chip row gap
- `12px` (`--space-3`): Card inner padding, omnibar height offset, dock gap
- `16px` (`--space-4`): Panel header padding, standard container margins
- `20px` (`--space-5`): Section margins, table cell vertical balance
- `24px` (`--space-6`): Layout column gutters, view top padding
- `32px` (`--space-8`): View boundaries, modal container spacing

---

## 5. Radii Scale
- `--radius-control`: `6px` (Input fields, dropdown selects, search bars, filter chips)
- `--radius-button`: `8px` (Buttons, table cards, badges, status pills)
- `--radius-panel`: `12px` (Workspace views, inspector drawers, modal dialogs)

---

## 6. Shadows Scale
- Cards & Content Containers: Flat with 1px border (`border: 1px solid var(--border-hairline)`). No box-shadow.
- Menus & Popovers: `--shadow-menu`: `0 4px 16px rgba(0, 0, 0, 0.35)`
- Modal Dialogs & Drawers: `--shadow-modal`: `0 12px 36px rgba(0, 0, 0, 0.55)`

---

## 7. Interactive States
Every interactive element must define all 4 states:
1. **Default:** Flat with `--border-hairline` and appropriate background.
2. **Hover:** `--bg-hover` and `--border-subtle`.
3. **Active:** `--bg-active` and slight 0.99x scale or solid tint.
4. **Focus-Visible:** Outline `2px solid var(--border-focus)` with an offset of `2px`.
5. **Disabled:** Opacity `0.4`, cursor `not-allowed`, zero pointer events.

---

## 8. Async Surface Protocol
Every asynchronous UI view must render four distinct states:
1. **Loading State:** Structured skeleton rows with subtle pulse animation. Never a raw spinner alone.
2. **Empty State:** Quiet Lucide icon, truthful headline, descriptive helper text, and primary call-to-action button.
3. **Error State:** Clear hairline banner with error details, retry action, and status indicator.
4. **Stale State:** Subtle inline indicator displaying timestamp of last sync while background fetching occurs.
