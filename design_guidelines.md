# Fantasy Premier League Assistant - Design Guidelines

## Design Approach: Data-Driven Sports Analytics

**Selected Approach:** Design System (Fluent Design + FPL Brand Identity)

**Rationale:** This is a utility-focused, data-intensive application where performance insights and usability take precedence. We'll draw from Premier League's visual identity while maintaining clarity for complex data visualization.

**Key Design Principles:**
- Data First: Every visual element serves to clarify information
- Immediate Feedback: Real-time updates feel instantaneous
- Hierarchical Clarity: Critical insights stand out from supporting data
- Strategic Confidence: Design instills trust in recommendations

---

## Core Design Elements

### A. Color Palette

**Primary Colors (Dark Mode - Default):**
- Background Base: 15 8% 12% (deep charcoal)
- Surface: 15 6% 16% (elevated panels)
- Surface Elevated: 15 5% 20% (cards, modals)
- Premier League Purple: 280 65% 60% (brand accent)
- Success Green: 142 76% 36% (positive predictions, gains)
- Alert Red: 0 72% 51% (warnings, point deductions)
- Neutral Text: 0 0% 95% (primary text)
- Muted Text: 0 0% 65% (secondary text)

**Light Mode:**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Surface Elevated: 0 0% 100% with subtle shadow
- Adapt purple/green/red with adjusted lightness for contrast

**Data Visualization:**
- Form Trend Up: 142 76% 40%
- Form Trend Down: 0 72% 55%
- Neutral/Static: 220 13% 60%
- Fixture Difficulty Scale: Green (easy) → Amber → Red (hard)

### B. Typography

**Font Stack:**
- Primary: 'Inter', system-ui, sans-serif (Google Fonts)
- Monospace: 'JetBrains Mono', monospace (for stats, prices)

**Hierarchy:**
- Hero/Dashboard Title: text-4xl font-bold (36px)
- Section Headers: text-2xl font-semibold (24px)
- Card Titles: text-lg font-semibold (18px)
- Body Text: text-base (16px)
- Data Labels: text-sm font-medium (14px)
- Stats/Numbers: text-lg font-mono (18px monospace)

### C. Layout System

**Spacing Primitives:** Tailwind units of 3, 4, 6, 8, 12, 16
- Component Padding: p-6 (cards), p-8 (sections)
- Stack Spacing: space-y-6 (default), space-y-8 (major sections)
- Grid Gaps: gap-4 (tight), gap-6 (standard), gap-8 (spacious)

**Layout Grid:**
- Main Container: max-w-7xl mx-auto px-4
- Dashboard: 3-column grid (sidebar-main-stats) on desktop
- Team Modeller: Full-width section with 2-column split (pitch + predictions)
- Mobile: Single column stack

### D. Component Library

**Navigation:**
- Top Navigation Bar: Sticky header with logo, gameweek selector, user profile
- Side Navigation: Collapsible sidebar with Dashboard, Team Modeller, Transfers, Analytics sections
- Breadcrumbs: For deep navigation within analysis tools

**Data Cards:**
- Player Card: Avatar, name, team badge, position, price, form indicator
- Stat Card: Large number with trend arrow, label, sparkline chart
- Match Card: Team badges, fixture difficulty rating, predicted points
- Recommendation Card: Gradient border for AI suggestions, confidence percentage

**Interactive Team Modeller:**
- Football Pitch Visualization: SVG-based 4-3-3/4-4-2 formation grid
- Draggable Player Slots: Drop zones with real-time validation
- Player Search Panel: Filterable list with live budget tracking
- Live Prediction Panel: Updates instantly on changes, shows point differential
- Action Buttons: Clear visual hierarchy for "Apply Changes" vs "Reset"

**Tables:**
- Sortable Columns: Clear sort indicators
- Alternating Row Colors: Subtle zebra striping (bg-surface vs bg-base)
- Sticky Headers: For long scrolling tables
- Responsive: Collapse to cards on mobile

**Data Visualization:**
- Line Charts: Player form trends (7-game rolling average)
- Bar Charts: Fixture difficulty comparisons
- Heatmaps: Ownership percentage across leagues
- Sparklines: Inline mini-charts in tables

**Forms & Controls:**
- Toggle Switches: For chip activation (Wildcard, Free Hit)
- Slider: Budget allocation, risk tolerance
- Dropdowns: Team/position filters with icons
- Action Buttons: Primary (purple), Secondary (outline), Danger (red)

**Overlays:**
- Modal: Player detail view with full stats
- Slide-out Panel: Transfer confirmation with point impact
- Toast Notifications: Transfer deadline alerts, price change warnings

### E. Animations

**Micro-interactions (Subtle Only):**
- Player Swap: 200ms ease-out transition on drag-drop
- Prediction Update: Gentle pulse on number change (once)
- Data Refresh: Subtle spinner on API fetch
- Button Hover: Scale 1.02 with 150ms ease

**NO ANIMATIONS FOR:**
- Page transitions
- Section reveals
- Background effects
- Decorative movements

---

## Images & Visual Assets

**Hero Section:**
- Full-width split hero (left: headline + CTA, right: dashboard preview screenshot or abstract pitch visualization)
- Use stylized football pitch graphic with data overlays, NOT player photos
- Optional: Subtle gradient mesh background in purple tones

**Dashboard:**
- Team badges: Official PL team logos via API
- Player avatars: API-provided headshots (fallback to initials)
- Trophy/badge icons: For achievements, league positions

**Interactive Modeller:**
- Pitch Background: Subtle grass texture or abstract grid
- Position Indicators: Minimal geometric shapes (circles/hexagons)

---

## Special Sections

**Dashboard Overview (Landing):**
- Quick Stats Row: 4 stat cards (Total Points, Gameweek Rank, Next Fixture, Free Transfers)
- Team Preview: Horizontal scrollable player cards with next opponent
- AI Insight Banner: Featured recommendation with "Apply" CTA

**Transfer Analyzer:**
- Comparison View: Side-by-side current vs recommended team
- Budget Tracker: Live remaining budget with visual fill bar
- Points Projection: Before/After comparison chart

**Fixture Planner:**
- 6-week lookahead table with color-coded difficulty
- Team rotation visualization showing optimal transfer windows

**Historical Performance:**
- Predicted vs Actual: Scatter plot showing recommendation accuracy
- Chip Usage Timeline: Horizontal timeline showing when chips were played

---

## Accessibility & Responsiveness

- Maintain WCAG AA contrast ratios (4.5:1 text, 3:1 UI)
- Keyboard navigation for all interactive elements
- Screen reader labels for data visualizations
- Mobile: Pitch view adapts to vertical orientation, prediction panel moves below
- Dark mode optimized for extended use during match days