# CAKRA57 - Master Specification (Header & Navigation + Production Readiness Audit)

## Table of Contents

1. [Part 1: Header & Navigation Improvement Specification](#part-1-header--navigation-improvement-specification)
2. [Part 2: Production Readiness Audit Prompt](#part-2-production-readiness-audit-prompt)

---

# Part 1: Header & Navigation Improvement Specification

## Objective

Redesign the website header and navigation to create a cleaner, more modern, and intuitive user experience across Desktop, Tablet, and Mobile without changing any existing business logic.

## Header Branding

### Replace

Premium Rental

### With

Premium Rent, Tour & Travel

Reason:
- Car Rental
- Tour
- Open Trip
- Travel Services
- Tourism Packages

Use this subtitle consistently across the website.

## Header Layout

- **Left side**: Hamburger menu (existing element to be removed — see Navigation Refactor below).
- **Right side**: Notification, Profile Avatar, Profile Dropdown (unchanged).

## Navigation Refactor

Correction: the hamburger menu is actually located on the **left side** of the header (not the right side, as an earlier version of this document incorrectly stated).

Remove the left-side hamburger menu entirely. It is **not** being repositioned — it is being fully removed, since all sidebar navigation it used to trigger is now consolidated into the Profile Dropdown.

Keep on the right side (unchanged):
- Notification
- Profile Avatar
- Profile Dropdown

## Move Navigation into Profile Dropdown

Move all sidebar items into the authenticated profile dropdown.

Menu:
- Layanan
- Open Trip
- Company
- Paket Wisata
- History Pesanan
- Logout

## Remove "Sewa Mobil"

Do not create a standalone "Sewa Mobil" menu.

Reason:
"Sewa Mobil" is already included inside "Layanan".

"Layanan" becomes the single entry point for:
- Rental Mobil
- Rental Mobil + Driver
- Drop Off
- Airport Transfer
- City Tour
- Additional Services

## Profile Dropdown

Show:
- User Avatar
- User Name
- User Email

Divider

- Layanan
- Open Trip
- Company
- Paket Wisata
- History Pesanan

Divider

- Logout

Requirements:
- Responsive
- Keyboard accessible
- Close on outside click
- Smooth animation
- ARIA support

## Color Theme Adjustment

Adjust the header and navigation color palette so red is no longer the dominant color.

Guidelines:
- Reduce the proportion of red used across the header, buttons, and active/highlight states.
- Use red only as a small accent (e.g., for critical actions, alerts, or badges) rather than as the primary surface color.
- Introduce complementary colors to create a more elegant and professional look, for example:
  - A neutral dark tone (charcoal/navy/near-black) as the primary base for header background or text.
  - A soft neutral (off-white/light gray) for contrast and breathing room.
  - A muted gold, bronze, or warm gray as a secondary accent to convey a premium feel.
- Maintain sufficient color contrast for accessibility (WCAG AA minimum).
- Keep the palette consistent across header, dropdown, buttons, and icons.
- Final color combination should be validated visually before implementation (e.g., via a style guide or design mockup) rather than applied ad hoc in code.

## Remove Unused Components

- Sidebar
- Left-side hamburger menu (removed entirely, not repositioned)
- Unused CSS
- Unused state
- Dead code

## Responsive

Support:
- Desktop
- Laptop
- Tablet
- Android
- iPhone

Ensure:
- No overflow
- No horizontal scroll
- Auto positioning
- Close after navigation on mobile

## Accessibility

- ESC closes dropdown
- Proper tab order
- Focus management
- 44x44 touch target

## UI Consistency

Reuse existing typography, spacing, icons, and animation. Apply the adjusted color theme (see "Color Theme Adjustment") consistently across all header and navigation elements.

## Performance

- Reduce duplicate components
- Remove unused JS
- Preserve Lighthouse score

## Acceptance Criteria

- Left-side hamburger menu removed entirely (not repositioned).
- Right side retains only Notification, Profile Avatar, and Profile Dropdown.
- Profile dropdown is the only authenticated navigation.
- All sidebar menus moved into dropdown.
- "Sewa Mobil" removed.
- Subtitle changed to "Premium Rent, Tour & Travel".
- Color theme is no longer red-dominant; complementary elegant/professional colors are applied with proper contrast.
- No duplicate navigation.
- Existing business logic unchanged.

## Constraints (Part 1)

Do not break:
- Authentication
- Booking flow
- Existing business logic

Only improve navigation architecture, color theme, and UI/UX.

---

# Part 2: Production Readiness Audit Prompt

## Role

Act as a Senior Full Stack Engineer, Cloud Security Engineer, UI/UX
Engineer, Performance Optimization Specialist, and DevSecOps Engineer.

## Project Information

-   Domain: https://www.cakra57.com
-   Frontend: React + Vite
-   Hosting: Vercel
-   DNS/CDN: Cloudflare
-   Backend: Firebase Authentication
-   Database: Firestore
-   Storage: Firebase Storage
-   Purpose: Rental Mobil, Tour & Travel Platform

## Related Specification

Refer to **Part 1: Header & Navigation Improvement Specification**
(above, in this same document) as the source of truth for the header
and navigation layout during this audit. In particular, verify the
application against:

-   Hamburger menu (previously located on the left side of the
    header) is removed entirely — not repositioned.
-   Right side of header contains only: Notification, Profile
    Avatar, Profile Dropdown.
-   Header subtitle updated to "Premium Rent, Tour & Travel".
-   All sidebar items consolidated into the authenticated profile
    dropdown; no standalone "Sewa Mobil" menu.
-   Updated color theme applied (red no longer dominant; elegant,
    professional complementary palette with WCAG AA-compliant
    contrast).

Any deviation from this spec found during the audit should be
flagged as a UI/UX finding, not treated as expected behavior.

## Objective

Perform a complete production audit and improve the application
**without changing existing business logic**.

The application should become:

-   Secure
-   Mobile Responsive
-   Fast
-   SEO Friendly
-   Production Ready
-   Accessible
-   Easy to maintain

## 1. Security Audit

Follow OWASP Top 10, Mozilla Security Guidelines, Cloudflare Best
Practices, and Vercel Best Practices.

Review and improve:

-   HTTP Security Headers
-   Content Security Policy (CSP)
-   X-Frame-Options
-   X-Content-Type-Options
-   Referrer Policy
-   Permissions Policy
-   HSTS
-   CSP compatibility
-   CORS
-   CSRF (if applicable)
-   XSS prevention
-   Input validation
-   Output sanitization
-   JWT validation
-   Authentication
-   Authorization
-   Rate limiting
-   Firebase Security Rules
-   Firebase Storage Rules
-   Upload Security
-   Secret Management
-   API Security
-   Environment Variables
-   Dependency vulnerabilities

## 2. Cloudflare Hardening

Review and optimize:

-   SSL/TLS
-   Always HTTPS
-   Automatic HTTPS Rewrites
-   TLS 1.3
-   Minimum TLS 1.2
-   HTTP/3
-   Brotli
-   HSTS
-   Browser Integrity Check
-   Security Level
-   WAF Rules
-   Bot Protection
-   Cache Rules
-   Transform Rules
-   Page Rules
-   Rate Limiting

Generate the recommended Cloudflare Dashboard configuration.

## 3. Vercel Hardening

Review:

-   vercel.json
-   Security headers
-   Redirects
-   Rewrites
-   Cache strategy
-   Compression
-   Remove unnecessary exposed routes

## 4. Mobile Responsiveness

Perform a complete mobile-first UI audit.

Review every page:

-   Home
-   Booking
-   Booking Form
-   Login
-   Register
-   Dashboard
-   Admin
-   Driver
-   Payment
-   Gallery
-   Footer
-   Navbar
-   Sidebar
-   Tables
-   Modal
-   Maps

For Navbar specifically, also verify:

-   The hamburger menu (previously on the left side) has been fully
    removed — not repositioned or hidden — per Part 1 of this
    document.
-   Right side shows only Notification, Profile Avatar, and Profile
    Dropdown — no duplicate/legacy hamburger remaining anywhere in
    the header.
-   Profile dropdown behaves correctly on all breakpoints (opens,
    closes on outside click/ESC, closes after navigation on mobile).

Test:

-   320px
-   360px
-   375px
-   390px
-   414px
-   480px
-   768px
-   820px
-   1024px
-   Desktop

Fix:

-   Overflow
-   Horizontal scrolling
-   Broken layout
-   Button size
-   Font scaling
-   Grid
-   Flexbox
-   Alignment
-   Responsive spacing
-   Sticky components

Touch targets minimum 44×44 px.

## 5. UI / UX Improvement

Improve:

-   Visual consistency
-   Typography
-   Spacing
-   Color hierarchy
-   Skeleton loading
-   Empty state
-   Error state
-   Success state
-   Toast notification
-   Animation
-   Accessibility
-   Color contrast

Color theme specifically:

-   Verify red is no longer the dominant color across header,
    buttons, and active/highlight states.
-   Verify red is used only as a small accent (alerts, critical
    actions, badges).
-   Verify the new complementary palette (dark neutral base, soft
    neutral contrast, muted gold/bronze/warm gray accent) is applied
    consistently across header, dropdown, buttons, and icons.
-   Verify contrast ratios meet WCAG AA across the new palette.

## 6. Performance

Target Lighthouse:

-   Performance ≥95
-   Accessibility ≥95
-   Best Practices ≥95
-   SEO ≥95

Optimize:

-   Lazy loading
-   Image optimization
-   Bundle size
-   Tree shaking
-   Code splitting
-   Prefetch
-   Preconnect
-   Compression
-   Cache

## 7. SEO

Improve:

-   Meta Tags
-   Open Graph
-   Twitter Card
-   robots.txt
-   sitemap.xml
-   Structured Data
-   Canonical URLs
-   Semantic HTML
-   Heading hierarchy
-   Image ALT

Also verify the updated header subtitle ("Premium Rent, Tour &
Travel") is reflected consistently in meta title/description and
Open Graph tags where relevant.

## 8. Booking System Security

Audit the booking flow:

Customer → Booking → Admin Approval → Payment Upload → Driver Assignment

Ensure:

-   Customer only accesses own bookings
-   Driver only accesses assigned bookings
-   Admin-only operations
-   IDOR protection
-   Secure invoice generation
-   Secure payment uploads
-   Unguessable booking IDs
-   Proper authorization

## 9. Mobile User Experience

Optimize:

-   One-hand usability
-   Minimal typing
-   Proper mobile keyboard types
-   Sticky CTA buttons
-   Fast loading on 3G/4G/5G
-   Comfortable checkout flow
-   Google Maps usability
-   Reduce unnecessary popups

## 10. Final Report

Produce:

1.  Executive Summary
2.  Risk Assessment (Critical/High/Medium/Low)
3.  Security Findings
4.  Mobile UI Findings
5.  UX Findings
6.  Performance Findings
7.  SEO Findings
8.  Cloudflare Recommendations
9.  Vercel Recommendations
10. Firebase Recommendations
11. Exact Code Changes
12. Exact Configuration Changes
13. File-by-file implementation plan
14. Testing checklist
15. Rollback plan
16. Compliance check against Part 1 (Header & Navigation Improvement
    Specification) — hamburger fully removed, dropdown consolidation,
    subtitle, color theme

## Constraints (Part 2)

-   Do NOT remove existing business logic.
-   Do NOT break production functionality.
-   Apply only production-safe improvements.
-   Preserve compatibility with React, Vite, Firebase, Cloudflare, and
    Vercel.
-   Explain every change before applying it.
-   Prioritize security, maintainability, performance, and mobile
    experience.
-   Any UI/navigation change must remain consistent with Part 1 of
    this document.
