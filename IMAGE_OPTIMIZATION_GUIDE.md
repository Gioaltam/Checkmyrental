# Image Optimization Guide

## Critical Issue: Large Demo Photos

Your `public/demo-photos/` contains **6-7 MB images** that will significantly slow page load times.

---

## Immediate Actions Required

### 1. Compress Demo Photos

Use one of these tools to compress images to < 500KB each:

**Option A: TinyPNG (Recommended)**
- Visit [tinypng.com](https://tinypng.com/)
- Drag and drop each image
- Download compressed versions
- Replace originals in `public/demo-photos/`

**Option B: Command Line with ImageMagick**
```bash
# Install ImageMagick (if not installed)
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: sudo apt install imagemagick

# Compress all JPGs to 85% quality
cd public/demo-photos
for img in *.jpg; do
  convert "$img" -quality 85 -strip "compressed_$img"
done
```

**Option C: Squoosh CLI**
```bash
npm install -g @squoosh/cli

# Compress with modern formats
squoosh-cli --webp auto --resize '{width:1920}' public/demo-photos/*.jpg
```

---

### 2. Create Responsive Image Variants

Generate multiple sizes for responsive loading:

```bash
# Create thumbnails (400px wide)
convert original.jpg -resize 400x -quality 80 photo-thumb.jpg

# Create medium (800px wide)
convert original.jpg -resize 800x -quality 85 photo-medium.jpg

# Create large (1920px wide)
convert original.jpg -resize 1920x -quality 85 photo-large.jpg

# Create WebP versions (better compression)
cwebp -q 85 photo-large.jpg -o photo-large.webp
```

---

### 3. Use Modern Image Formats

Convert to WebP for ~30% smaller file sizes:

```bash
# Install cwebp
# Windows: Download from https://developers.google.com/speed/webp/download
# Mac: brew install webp
# Linux: sudo apt install webp

# Convert JPG to WebP
cwebp -q 85 input.jpg -o output.webp
```

Then use `<picture>` element for fallback:

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

---

### 4. Implement Lazy Loading

All images already use `loading="lazy"` attribute, but ensure it's applied everywhere:

```html
<img src="/demo-photos/photo.jpg" alt="..." loading="lazy" decoding="async">
```

---

## Generate Missing Favicon and Icons

### Required Assets

You need to create these in `public/`:

- `favicon.ico` (16x16, 32x32)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `og-image.jpg` (1200x630 for social sharing)
- `logo.png` (for schema.org)

### Option 1: Use Favicon Generator (Easiest)

1. Visit [realfavicongenerator.net](https://realfavicongenerator.net/)
2. Upload your logo (SVG or high-res PNG)
3. Download the generated package
4. Extract all files to `public/`

### Option 2: Create Manually with ImageMagick

```bash
# Assuming you have a logo.png (512x512 or larger)

# Create favicons
convert logo.png -resize 16x16 public/favicon-16x16.png
convert logo.png -resize 32x32 public/favicon-32x32.png
convert public/favicon-32x32.png public/favicon.ico

# Create Apple touch icon
convert logo.png -resize 180x180 public/apple-touch-icon.png

# Create Open Graph image (1200x630)
convert logo.png -resize 1200x630 -background "#0a0a0f" -gravity center -extent 1200x630 public/og-image.jpg
```

### Option 3: Design Custom Assets

Use tools like:
- **Figma** (free) - [figma.com](https://figma.com)
- **Canva** (free tier) - [canva.com](https://canva.com)
- **Photoshop/Illustrator** (paid)

**OG Image Specs:**
- Size: 1200x630 pixels
- Format: JPG or PNG
- File size: < 1 MB
- Include: Logo, tagline, brand colors

---

## Create site.webmanifest

Create `public/site.webmanifest`:

```json
{
  "name": "CheckMyRental",
  "short_name": "CheckMyRental",
  "description": "Professional rental property inspections in Tampa Bay",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#0a0a0f",
  "background_color": "#0a0a0f",
  "display": "standalone",
  "start_url": "/",
  "scope": "/"
}
```

---

## Performance Budget

Aim for these targets:

| Asset Type | Budget |
|------------|--------|
| Single Image | < 300 KB |
| Total Images/Page | < 2 MB |
| Favicon/Icons | < 50 KB each |
| OG Image | < 500 KB |

---

## Testing Image Performance

### 1. Google PageSpeed Insights
```
https://pagespeed.web.dev/
```

### 2. Chrome DevTools
1. Open DevTools (F12)
2. Network tab
3. Filter by "Img"
4. Check file sizes and load times

### 3. WebPageTest
```
https://www.webpagetest.org/
```

---

## Automated Image Optimization (Future)

Consider integrating:

### Astro Image Integration

```bash
npm install @astrojs/image
```

```astro
---
import { Image } from '@astrojs/image/components';
---

<Image
  src="/demo-photos/photo.jpg"
  alt="Property inspection"
  width={800}
  height={600}
  format="webp"
  quality={85}
/>
```

### Cloudflare Images (for production)

- Automatic WebP/AVIF conversion
- Responsive variants
- Global CDN delivery

---

## Checklist

Before deploying:

- [ ] All demo photos compressed to < 300 KB
- [ ] WebP versions created
- [ ] Responsive variants generated (thumb, medium, large)
- [ ] Lazy loading applied to all images
- [ ] Favicon set created (ico, png, apple-touch-icon)
- [ ] OG image created (1200x630)
- [ ] Logo.png created for schema
- [ ] site.webmanifest created
- [ ] Tested with PageSpeed Insights
- [ ] Lighthouse score > 90

---

## Quick Commands

```bash
# Check current image sizes
cd public/demo-photos
ls -lh *.jpg

# Batch compress all JPGs to 85% quality
for img in *.jpg; do convert "$img" -quality 85 -strip "$img"; done

# Convert all to WebP
for img in *.jpg; do cwebp -q 85 "$img" -o "${img%.jpg}.webp"; done

# Generate favicons from logo
convert logo.png -resize 180x180 apple-touch-icon.png
convert logo.png -resize 32x32 favicon-32x32.png
convert logo.png -resize 16x16 favicon-16x16.png
```

---

## Support

If you need help with image optimization, consider:

- Hiring a designer on Fiverr/Upwork
- Using automated services like Cloudinary or Imgix
- Consulting the Astro docs: https://docs.astro.build/en/guides/images/

---

**Priority: HIGH** - Image optimization should be done before launch to avoid poor user experience and SEO penalties.
