# InspectionAgent Landing Page (Astro)

A modern, performant landing page built with Astro, inspired by best-in-class marketing sites with smooth page transitions and scroll animations.

## Features

- **View Transitions API** for smooth page-to-page navigation
- **Scroll-reveal animations** using IntersectionObserver
- **Animated statistics counters** with easing
- **Responsive design** optimized for all screen sizes
- **Accessibility-first** with reduced-motion support
- **Custom branding** with navy, orange, and slate color scheme

## Tech Stack

- **Astro 4.0** - Static site generator
- **TypeScript** - Type safety
- **CSS Variables** - Centralized design tokens
- **View Transitions API** - Native page transitions
- **Google Fonts (Inter)** - Typography

## Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── Nav.astro          # Sticky navigation
│   │   ├── Footer.astro       # Site footer
│   │   ├── Reveal.astro       # Scroll-reveal wrapper
│   │   ├── StatCounter.astro  # Animated counters
│   │   └── ServiceCard.astro  # Product/service cards
│   ├── layouts/
│   │   └── BaseLayout.astro   # Main layout with ViewTransitions
│   ├── pages/
│   │   ├── index.astro        # Home page
│   │   ├── solutions.astro    # Solutions page
│   │   └── company.astro      # Company page
│   └── styles/
│       ├── tokens.css         # Design tokens
│       └── global.css         # Global styles
├── astro.config.mjs
├── tsconfig.json
└── package.json
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:4321` to see the site.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Design System

### Colors

- **Navy**: `#0b1e3b` - Primary brand color
- **Orange**: `#ff7f11` - Accent/CTA color
- **Dark BG**: `#0a0a0a` - Main background
- **Elevated BG**: `#101317` - Card backgrounds
- **Text**: `#cbd5e1` - Primary text
- **Muted**: `#94a3b8` - Secondary text
- **Off-white**: `#f6f7fb` - Highlights

### Typography

- **Font Family**: Inter (Google Fonts)
- **Weights**: 400 (body), 500 (medium), 600 (semibold), 800 (display)
- **Display**: 800 weight for hero headings
- **Section Headings**: 600-700 weight
- **Body**: 400-500 weight

## Customization

### Replace Placeholder Images

Update the `img` props in `ServiceCard` components with your own images:

```astro
<ServiceCard
  tag="Popular"
  title="Your Service"
  text="Your description"
  img="/path/to/your/image.jpg"
/>
```

### Update Branding

Edit `src/styles/tokens.css` to change colors, spacing, and other design tokens.

### Modify Content

All page content is in `src/pages/`. Edit the `.astro` files to update copy, add sections, or change layouts.

## Performance

- Static site generation (SSG) for optimal performance
- CSS code splitting disabled for faster initial load
- Images lazy-loaded by default
- Minimal JavaScript (only for animations)
- View Transitions API for native, GPU-accelerated page transitions

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- ARIA labels where needed
- Keyboard navigation support
- `prefers-reduced-motion` support for animations
- Sufficient color contrast ratios

## Browser Support

- Modern browsers with View Transitions API support
- Graceful degradation for older browsers (cross-fade disabled)
- Mobile-responsive design

## License

All rights reserved.
