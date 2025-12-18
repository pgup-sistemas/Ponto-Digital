# Design Guidelines: Sistema de Ponto Eletrônico

## Design Approach

**Selected System: Material Design 3 (Material You) Adaptation**

**Justification:** This employee time-tracking system prioritizes trust, efficiency, and clarity. Material Design provides:
- Strong visual hierarchy for status-critical information
- Proven patterns for forms and data tables
- Excellent mobile-first responsive patterns (essential for PWA)
- Clear feedback states for biometric operations
- Professional, trustworthy aesthetic for enterprise context

**Core Principles:**
1. **Clarity First:** Every interaction must be immediately understandable
2. **Trust Through Transparency:** Clear feedback on biometric processing and data handling
3. **Mobile-Optimized:** Touch-friendly targets, thumb-zone optimization
4. **Status-Driven Design:** Visual hierarchy emphasizes punch status (ok/pending)

## Typography

**Font Family:** Inter (via Google Fonts CDN)
- Primary: Inter (400, 500, 600, 700)
- Fallback: system-ui, -apple-system, sans-serif

**Type Scale:**
- H1 (Page Titles): 2rem (32px), font-weight-700, tracking-tight
- H2 (Section Headers): 1.5rem (24px), font-weight-600
- H3 (Card Titles): 1.25rem (20px), font-weight-600
- Body: 1rem (16px), font-weight-400, line-height-1.5
- Small (Metadata): 0.875rem (14px), font-weight-400
- Captions (Timestamps): 0.75rem (12px), font-weight-500, uppercase, tracking-wide

## Layout System

**Spacing Primitives (Tailwind Units):** 
- Core set: 2, 4, 6, 8, 12, 16, 24
- Use: p-4, m-6, gap-8, space-y-12, py-16, px-24 (desktop containers)

**Grid System:**
- Mobile: Single column, full-width cards
- Desktop: max-w-7xl container, centered
- Punch History: Grid-based table layout (grid-cols-1 md:grid-cols-[auto_1fr_auto_auto])

**Responsive Breakpoints:**
- Mobile-first approach
- md: 768px (tablet)
- lg: 1024px (desktop)

## Component Library

### Core UI Elements

**Cards (Elevation-Based):**
- Default: bg-white, rounded-xl, shadow-md, p-6
- Interactive: hover:shadow-lg transition
- Critical Actions (Punch): shadow-xl, border-2 for emphasis

**Buttons:**
- Primary (Punch Action): Large (py-4 px-8), rounded-lg, font-semibold
- Secondary: outlined variant, py-3 px-6
- Text/Ghost: minimal styling, hover:bg-opacity-10
- Icon buttons: p-3, rounded-full for camera/GPS controls

**Status Badges:**
- OK: Pill-shaped, px-3 py-1, rounded-full, font-medium
- Pending: Outlined variant
- Include icon + text (checkmark, clock icons)

### Navigation

**Primary Nav (Mobile):**
- Bottom tab bar (fixed position)
- 4 main sections: Punch, History, Justifications, Profile
- Icons + labels, active state with underline indicator

**Desktop Nav:**
- Top horizontal bar with logo left, nav center, user menu right
- Sticky on scroll

### Forms

**Input Fields:**
- Floating labels (Material style)
- Border-b-2 when inactive, full rounded-lg border when focused
- Helper text below (text-sm)
- Error states: red border + icon + message

**Camera Capture Component:**
- Full-width preview area, rounded-xl
- Centered capture button (large, circular, 64px)
- GPS indicator chip (top-right overlay)
- Privacy notice (small text below)

### Data Displays

**Punch History Table:**
- Alternating row backgrounds (subtle)
- Sticky header on scroll
- Columns: Timestamp, Type (Entry/Exit), Status Badge, GPS Icon, Actions
- Mobile: Stacked card layout with all info

**Justification Form:**
- Textarea: min-height 120px, rounded-lg, p-4
- Character counter
- Attachment option (optional future feature)
- Submit button (full-width on mobile)

### Overlays

**Modals:**
- Centered, max-w-md, backdrop blur
- Header with title + close button
- Content area with padding
- Footer with action buttons (right-aligned)

**Toast Notifications:**
- Bottom position (bottom-4, left-1/2, -translate-x-1/2)
- Auto-dismiss after 4s
- Success/Error/Info variants with icons

**Loading States:**
- Skeleton screens for data loading
- Spinner for biometric processing (with progress text)
- Inline loading for button actions

## Specific Screens

### Login Screen
- Centered card (max-w-md)
- Logo at top, form below
- "Remember me" checkbox
- Forgot password link
- Full-height centered layout on mobile

### Punch Screen (Primary)
- Hero-style layout with current time display (large, prominent)
- Camera preview (16:9 aspect ratio, rounded corners)
- Single large "Register Punch" button below camera
- GPS status chip (floating, top-right of camera)
- Last punch info card below (small, summarized)

### History Screen
- Filter tabs at top (All, This Week, This Month)
- Searchable table/list
- Export button (top-right)
- Empty state with illustration + helpful text

### Justification Screen
- List of pending punches (cards)
- Each card expandable to show form
- Submit individual or bulk actions

## Animations

**Minimal, Purpose-Driven:**
- Button press: scale-95 on active
- Card hover: translate-y-1 + shadow change
- Success feedback: checkmark animation (0.3s)
- Loading: Subtle pulse on skeleton screens
- **No decorative animations**

## Accessibility

- Minimum touch target: 44x44px (iOS guideline)
- Focus indicators: 2px ring offset-2
- ARIA labels for icon buttons
- Keyboard navigation for all interactive elements
- High contrast mode support
- Screen reader announcements for status changes

## Critical UX Notes

- **Biometric Consent:** Prominent, clear notice before first enrollment
- **Processing Feedback:** Show "Processing facial recognition..." with spinner during backend validation
- **Error Recovery:** Clear, actionable error messages with retry options
- **Offline Handling:** Queue punches when offline (PWA), sync when connection restored
- **Privacy Assurance:** Visible indicator that no images are stored (icon + text in footer)