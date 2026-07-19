# FitHabit Design System Reference

This document serves as the standalone reference for the FitHabit Design System, extracted from the FitHabit codebase. It defines the visual styles, color system, typography, spacing, and component representations for reuse.

---

## 1. Color System

FitHabit features a premium, modern high-contrast aesthetic with active energetic accent tones. It provides full support for light and dark modes.

### A. Core Brand Colors
*   **Brand Emerald (Primary Accent / Done State):** `#10b981` (emerald-500)
*   **Brand Orange (Secondary Accent / Energy):** `#f97316` (orange-500)
*   **Dark Mode Background:** `#0b0c10` (custom black)
*   **Dark Mode Surface:** `#171923` (custom navy/slate surface)
*   **Dark Mode Border:** `#2d3748` (custom dark border)

### B. Mode-Specific Semantics (Side-by-Side)

| Token Name | Light Mode Value | Dark Mode Value | Description |
| :--- | :--- | :--- | :--- |
| **Page Background** | `#f9fafb` (neutral-50) | `#0b0c10` (brand dark) | Deep background canvas |
| **Surface/Card Background** | `#ffffff` | `#171923` (brand surface) | Container backgrounds |
| **Secondary Input BG** | `#f9fafb` (neutral-50) | `#171923` (slate-900) | Secondary surface / Input fields |
| **Text Primary** | `#1f2937` (neutral-800) | `#f7fafc` (neutral-100) | Headings, major content texts |
| **Text Secondary** | `#4b5563` (neutral-600) | `#cbd5e1` (slate-300) | Secondary descriptions, text details |
| **Text Muted** | `#9ca3af` (neutral-400) | `#718096` (slate-500) | Placeholders, captions, disabled |
| **Border Color** | `#e5e7eb` (neutral-200) | `#2d3748` (slate-700) | Grid lines, inputs, card edges |
| **Success Color (Done)** | `#10b981` (emerald-500) | `#10b981` (emerald-500) | Completed tasks, active highlights |
| **Danger Color (Missed)** | `#ef4444` (red-500) | `#f87171` (red-400) | Overdue, failed, errors |
| **Warning Color** | `#f59e0b` (amber-500) | `#fbbf24` (amber-400) | In-progress, alert warnings |

### C. Buttons Color Matrix

| State / Button Type | Light Mode | Dark Mode |
| :--- | :--- | :--- |
| **Primary (Accent) BG** | `#10b981` (emerald-500) | `#10b981` (emerald-500) |
| **Primary Text** | `#0b0c10` (neutral-950) | `#0b0c10` (neutral-950) |
| **Primary Hover BG** | `#059669` (emerald-600) | `#059669` (emerald-600) |
| **Secondary BG** | `#f3f4f6` (neutral-100) | `#2d3748` (slate-700) |
| **Secondary Text** | `#4b5563` (neutral-600) | `#cbd5e1` (slate-300) |
| **Secondary Hover BG** | `#e5e7eb` (neutral-200) | `#4a5568` (slate-600) |
| **Disabled Opacity** | `0.5` | `0.5` |

---

## 2. Typography

*   **Font Family:** `'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif`
*   **Font Weights:**
    *   Light: `300`
    *   Regular: `400`
    *   Medium: `500`
    *   Semibold: `600`
    *   Bold: `700`
    *   Extrabold: `800`
*   **Scale Hierarchy:**
    *   **H1 (Page Title):** `2.25rem (36px)` / Extrabold (`800`) / Line Height: `1.25`
    *   **H2 (Section Header):** `1.875rem (30px)` / Bold (`700`) / Line Height: `1.3`
    *   **H3 (Card Header):** `1.25rem (20px)` / Semibold (`600`) / Line Height: `1.35`
    *   **Body (Regular):** `0.875rem (14px)` / Regular (`400`) / Line Height: `1.5`
    *   **Caption/Label:** `0.75rem (12px)` / Medium (`500`) or Bold (`700`) / Line Height: `1.4`

---

## 3. Spacing & Layout

*   **Grid Base Unit:** `4px` / `8px` / `16px` / `24px` / `32px` (Tailwind layout standard)
*   **Page Margin:** `16px (1rem)` mobile, `32px (2rem)` desktop
*   **Card/Container Padding:** `24px (1.5rem)`
*   **Gap Value (standard grid):** `24px (1.5rem)`
*   **Border Radii:**
    *   **Buttons & Inputs:** `12px (0.75rem)` - rounded-xl
    *   **Cards:** `24px (1.5rem)` - rounded-3xl
    *   **Badges/Tags:** `8px (0.5rem)` - rounded-lg
    *   **Avatars / Theme toggle / Floating buttons:** `8px` or `50%` (fully circular)

---

## 4. Component Styles

### Login Page Layout
*   Centering card block with a light mode `bg-neutral-50` and dark mode `bg-neutral-950` backdrop.
*   The card itself has a premium `shadow-2xl` and a high border-radius (`rounded-3xl` / 24px) with subtle ambient gradient glow circles (`blur-3xl`) positioned behind it.
*   Input wrappers use custom left-positioned absolute SVG icons with light gray borders that focus transition into an emerald green boundary.

### Cards
*   **Border:** `1px solid #e5e7eb` (Light), `1px solid #2d3748` (Dark)
*   **Background:** `#ffffff` (Light), `#171923` (Dark)
*   **Shadow:** Subtle `shadow-sm` or `shadow-md` for standard, `shadow-2xl` for dialog overlays
*   **Border Radius:** `24px`

### Inputs & Select Fields
*   **Border:** `1px solid #d1d5db` (Light), `1px solid #4a5568` (Dark)
*   **Background:** `#f9fafb` (Light), `#1a202c` or `#171923` (Dark)
*   **Focus State:** Outlines removed. Set `border-color: #10b981` (emerald accent) accompanied by a custom glow box-shadow.
*   **Padding:** `12px 16px`

### Progress Bars
*   **Container:** `height: 8px`, `border-radius: 9999px`, background color `bg-neutral-100` (Light) or `bg-neutral-800` (Dark).
*   **Fill:** Solid brand colors or gradients from Orange to Emerald (`bg-gradient-to-r from-orange-500 to-emerald-500`).

### Badges / Status Indicators
*   **Done/Success (Green):** Text color `#10b981` on transparent or `#10b981/10` background with `border-emerald-500/20`.
*   **Missed/Error (Red):** Text color `#ef4444` on `#ef4444/10` background.
*   **Pending/Warning (Orange/Amber):** Text color `#f97316` on `#f97316/10` background.
*   **Future/Empty (Gray):** Text color `text-neutral-400` on `bg-neutral-50` (Light) or `bg-neutral-800` (Dark).

---

## 5. Animations & Interactions

*   **Micro-interactions (Buttons/Cards):** Hover states apply a vertical translation of `-2px` or `-4px` combined with a scale modifier (`active:scale-98` or `scale-102`) to create tactile feedback.
*   **Satisfaction Checkmark Animation:** A custom stroke-dasharray animation that triggers on completion status toggling (`animate-checkmark`).
*   **Fade-in Transitions:** Standard page routes or modal panels load via `animate-fade-in` (`translateY` offset returning to 0 with opacity ramping).

---

## 6. Copy-Paste styling layer (CSS Custom Properties & Config)

Below is the drop-in CSS variables code to be declared globally:

```css
:root {
  /* Fonts */
  --font-sans: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
  --font-body: var(--font-sans);
  --font-title: var(--font-sans);

  /* Colors - Light Mode */
  --bg-main: #f9fafb;
  --bg-card: #ffffff;
  --bg-input: #f9fafb;
  --bg-card-hover: #f3f4f6;
  
  --accent-color: #10b981; /* Brand Emerald */
  --accent-hover: #059669; /* Darker Emerald */
  --accent-glow: rgba(16, 185, 129, 0.1);
  --primary-brand: #10b981;
  --primary-brand-hover: #059669;
  
  --success-color: #10b981;
  --warning-color: #f97316; /* Brand Orange */
  --danger-color: #ef4444;
  
  --text-primary: #1f2937;
  --text-secondary: #4b5563;
  --text-muted: #9ca3af;
  
  --border-color: #e5e7eb;
  
  /* Sizing Tokens */
  --border-radius-sm: 8px;
  --border-radius-md: 12px;
  --border-radius-lg: 24px;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --shadow-premium: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
  
  --transition-smooth: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --space-card-padding: 24px;
  --space-section-gap: 24px;
  --navbar-height: 64px;
  
  /* Typography */
  --font-size-h1: 36px;
  --font-size-h2: 30px;
  --font-size-body: 14px;
  --font-size-label: 12px;
}

[data-theme="dark"] {
  /* Colors - Dark Mode */
  --bg-main: #0b0c10;
  --bg-card: #171923;
  --bg-input: #11131c;
  --bg-card-hover: #1f2330;
  
  --accent-color: #10b981;
  --accent-hover: #059669;
  --primary-brand: #10b981;
  --primary-brand-hover: #059669;
  
  --text-primary: #f7fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #718096;
  
  --border-color: #2d3748;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(0, 0, 0, 0.15);
  --shadow-premium: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}
```
