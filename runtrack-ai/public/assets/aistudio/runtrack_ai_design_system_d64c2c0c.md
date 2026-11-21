---
name: "RunTrack AI"
description: "Precision dark-navy and lime-green sports analytics design system for recreational Garmin runners."
---

## Overview

RunTrack AI is a performance-driven sports analytics and AI coaching system built for recreational Garmin runners who want clear, actionable insight from their training data. The aesthetic is disciplined, high-contrast, and telemetry-focused—combining deep midnight-navy surfaces with crisp cool-white typography and high-visibility lime-green accents that guide attention to key performance deltas, readiness states, and AI coaching recommendations without decorative clutter.

## Colors

The palette pairs an almost-black midnight navy canvas with layered slate-navy containers and a vibrant lime-green primary accent. Semantic status colors are reserved strictly for training readiness, heart-rate zones, and load balance states.

- **Primary & Primary Container:** Electric lime green used for active navigation indicators, primary CTAs, VO2 max trend highlights, and chart focal series.
- **Surfaces:** Deep navy tiers (`#060E1F` to `#2D3547`) establish visual hierarchy through tonal elevation rather than heavy drop shadows.
- **Status Roles:** Semantic hues (`success`, `warning`, `error`, `info`) communicate training status, recovery readiness, and aerobic/anaerobic load thresholds.

```yaml
colors:
  primary: "#B4FF1A"
  on-primary: "#0B1324"
  primary-container: "#9EF01A"
  on-primary-container: "#0B1324"
  secondary: "#AED278"
  on-secondary: "#0B1324"
  secondary-container: "#1F3606"
  on-secondary-container: "#B4FF1A"
  tertiary: "#38BDF8"
  on-tertiary: "#060E1F"
  tertiary-container: "#0C4A6E"
  on-tertiary-container: "#E0F2FE"
  error: "#F87171"
  on-error: "#450A0A"
  error-container: "#7F1D1D"
  on-error-container: "#FEE2E2"
  warning: "#FBBF24"
  on-warning: "#451A03"
  success: "#B4FF1A"
  on-success: "#0B1324"
  background: "#060E1F"
  on-background: "#F8FAFC"
  surface: "#0B1324"
  surface-dim: "#060E1F"
  surface-bright: "#2D3547"
  surface-container-lowest: "#060E1F"
  surface-container-low: "#131B2D"
  surface-container: "#181F31"
  surface-container-high: "#222A3C"
  surface-container-highest: "#2D3547"
  on-surface: "#F8FAFC"
  on-surface-variant: "#CBD5E1"
  outline: "#64748B"
  outline-variant: "#334155"
  inverse-surface: "#F8FAFC"
  inverse-on-surface: "#0B1324"
  inverse-primary: "#446900"
  shadow: "#000000"
  scrim: "#000000"
```

## Typography

RunTrack AI uses **Inter** across all display, section headings, UI labels, and body copy for maximum legibility and zero decorative distortion, paired with **Geist Mono** for paces, heart rates, distances, timestamps, and tabular telemetry. All numeric metrics use `tabular-nums` so columns and live readouts align vertically.

```yaml
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 46px
    letterSpacing: -0.75px
  display-lg-mobile:
    fontFamily: "Inter"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.5px
  display-md:
    fontFamily: "Inter"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 38px
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: "Inter"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Inter"
    fontSize: 19px
    fontWeight: 700
    lineHeight: 26px
    letterSpacing: -0.15px
  title-md:
    fontFamily: "Inter"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
  body-md:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Inter"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: "Inter"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.3px
  mono-lg:
    fontFamily: "Geist Mono"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
    letterSpacing: -0.5px
  mono-md:
    fontFamily: "Geist Mono"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  mono-sm:
    fontFamily: "Geist Mono"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: 0px
```

## Layout & Spacing

The web application uses a sticky horizontal top navigation bar on tablet and desktop viewports (`768px`+) and a fixed bottom navigation bar on mobile viewports (`<768px`) with bottom content clearance (`pb-24 md:pb-page-margin`). Main content sits inside a centered fluid container (`max-w-7xl`) organized on a 12-column CSS Grid with `20px` (`gutter-lg`) gaps and `16px`/`24px` (`page-margin`) outer padding. A `4px` base unit governs all spacing so card padding, chart axes, and table rows stay aligned.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 20px
  gutter-xl: 24px
  section: 32px
  page-margin: 24px
```

## Elevation & Depth

Hierarchy is expressed through tonal surface stepping and crisp `1px` `outline-variant` (`#334155`) hairlines rather than heavy drop shadows. The app shell sits on `surface-dim` (`#060E1F`), primary workspace cards sit on `surface-container-low` (`#131B2D`), and interactive hover states or nested chart tooltips step up to `surface-container` (`#181F31`) and `surface-container-high` (`#222A3C`).

## Shapes

Corners are crisp and technical: cards use `12px` (`md`), inputs and buttons use `8px` (`DEFAULT`), data bars and compact chips use `4px` (`sm`), and status pills use `full`.

```yaml
rounded:
  sm: 4px
  DEFAULT: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
```

## Motion & Micro-interaction

Transitions are fast and mechanical with zero decorative looping. Button hovers and tab switches resolve within `100ms`, while drawers or panels decelerate cleanly over `200ms`. Only `transform`, `opacity`, and color properties are animated.

```yaml
motion:
  state-change:
    duration: 100ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 200ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

Copy is direct, coaching-oriented, and grounded in running physiology.

- **Tone of voice:** Analytical, encouraging, and concise. Say *"Aerobic efficiency improved 3.2% at 5:10/km"* rather than *"Amazing job unlocking your potential!"*
- **Capitalisation:** Sentence case for section titles, coach insights, and action buttons; uppercase only for compact `label-sm` table column headers or status tags.
- **Button and action labels:** Action-oriented verb phrases (`Sync Garmin Now`, `Upload .FIT File`, `Update Race Goal`, `Ask Coach`).
- **Numbers, dates, and units:** Metric units by default (`km`, `min/km`, `bpm`, `ml/kg/min`) with `tabular-nums`, e.g. `4:52 /km`, `154 bpm`, `52.4 ml/kg/min`.

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Badge** → `@components/badge.html`: `badge-numeric`, `badge-dot`
- **Button** → `@components/button.html`: `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html`: `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Input Field** → `@components/input-field.html`: `input-field-text`, `input-field-icon`
- **Table** → `@components/table.html`: `table-standard`, `table-interactive`, `table-selectable`
