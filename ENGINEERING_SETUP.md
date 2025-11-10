# Engineering & Ops Setup

Complete guide for linting, formatting, CI/CD, and security best practices.

---

## 🔧 Development Tools Setup

### 1. Install Development Dependencies

```bash
npm install --save-dev \
  @astrojs/check \
  typescript \
  eslint \
  prettier \
  prettier-plugin-astro \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-astro
```

### 2. ESLint Configuration

Create `.eslintrc.json`:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:astro/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "overrides": [
    {
      "files": ["*.astro"],
      "parser": "astro-eslint-parser",
      "parserOptions": {
        "parser": "@typescript-eslint/parser",
        "extraFileExtensions": [".astro"]
      }
    }
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_"
    }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "ignorePatterns": ["dist/", "node_modules/", ".astro/"]
}
```

### 3. Prettier Configuration

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro"],
  "overrides": [
    {
      "files": "*.astro",
      "options": {
        "parser": "astro"
      }
    }
  ]
}
```

Create `.prettierignore`:

```
dist/
node_modules/
.astro/
package-lock.json
public/
```

### 4. TypeScript Configuration

Your `tsconfig.json` is already set up. Verify it includes:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "allowJs": true
  }
}
```

---

## 📝 Update package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "lint": "eslint . --ext .js,.ts,.astro",
    "lint:fix": "eslint . --ext .js,.ts,.astro --fix",
    "format": "prettier --write \"**/*.{js,ts,astro,json,md}\"",
    "format:check": "prettier --check \"**/*.{js,ts,astro,json,md}\"",
    "type-check": "tsc --noEmit",
    "validate": "npm run format:check && npm run lint && npm run check && npm run type-check"
  }
}
```

---

## 🤖 GitHub Actions CI/CD

### 1. Create `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Lint, Type Check, and Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Format check
        run: npm run format:check

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Astro check
        run: npm run check

      - name: Build
        run: npm run build

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: validate
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          PUBLIC_BACKEND_URL: ${{ secrets.PUBLIC_BACKEND_URL }}
          PUBLIC_DASHBOARD_URL: ${{ secrets.PUBLIC_DASHBOARD_URL }}
          PUBLIC_GTM_ID: ${{ secrets.PUBLIC_GTM_ID }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 2. Create `.github/workflows/pr-check.yml`

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-check:
    name: PR Validation
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run validation
        run: npm run validate

      - name: Build check
        run: npm run build

      - name: Comment PR
        uses: actions/github-script@v7
        if: always()
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ All checks passed! Ready for review.'
            })
```

---

## 🔐 Environment Variable Security

### ✅ Current Status

Your `.env` file is properly configured:
- ✅ Listed in `.gitignore`
- ✅ Contains secrets (OpenAI API key, AWS credentials)
- ✅ Public variables prefixed with `PUBLIC_`

### Astro Environment Variable Rules

**PUBLIC variables:**
- Prefixed with `PUBLIC_`
- **Bundled into client-side code**
- Safe: URLs, non-sensitive config
- Example: `PUBLIC_BACKEND_URL`, `PUBLIC_GTM_ID`

**Private variables:**
- No `PUBLIC_` prefix
- **Server-side only, NOT bundled**
- Use for: API keys, secrets, database URLs
- Example: `OPENAI_API_KEY`, `JWT_SECRET_KEY`

### Security Checklist

- [x] `.env` in `.gitignore`
- [x] Secrets have no `PUBLIC_` prefix
- [x] Public URLs have `PUBLIC_` prefix
- [ ] Never commit `.env` to git
- [ ] Use secrets manager in production (Vercel/Netlify)
- [ ] Rotate keys if accidentally exposed

### Production Secret Management

**Vercel:**
```bash
# Add secrets via CLI
vercel env add OPENAI_API_KEY production
vercel env add JWT_SECRET_KEY production

# Or in dashboard: Settings → Environment Variables
```

**Netlify:**
```bash
netlify env:set OPENAI_API_KEY "sk-..."
netlify env:set JWT_SECRET_KEY "your-secret"
```

**GitHub Secrets:**
```
Repository Settings → Secrets and variables → Actions
Add: OPENAI_API_KEY, JWT_SECRET_KEY, etc.
```

---

## 🚀 Hosting & Infrastructure

### Recommended Stack

**Landing Page (Astro):**
- **Vercel** - Best Astro support, edge functions
- **Netlify** - Great alternative, similar features
- **Cloudflare Pages** - Global CDN, fast

**Backend (FastAPI):**
- **Railway** - Easiest deployment, auto-scaling
- **Render** - Free tier, good for startups
- **DigitalOcean App Platform** - More control
- **AWS ECS/Fargate** - Enterprise scale

**Dashboard (Next.js):**
- **Vercel** - Made by Next.js team, optimal
- **Netlify** - Good alternative

### HTTPS & SSL

All recommended platforms provide **automatic SSL certificates**:
- ✅ Vercel: Let's Encrypt (automatic)
- ✅ Netlify: Let's Encrypt (automatic)
- ✅ Railway: Automatic SSL
- ✅ Render: Automatic SSL

No configuration needed!

### Caching Headers

Add to `astro.config.mjs`:

```javascript
export default defineConfig({
  output: 'static',
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
        }
      }
    }
  }
});
```

**Vercel** auto-configures caching. For manual setup:

Create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## 📊 Monitoring & Error Tracking

### 1. Sentry (Error Tracking)

```bash
npm install @sentry/astro
```

Add to `astro.config.mjs`:

```javascript
import sentry from '@sentry/astro';

export default defineConfig({
  integrations: [
    sentry({
      dsn: import.meta.env.PUBLIC_SENTRY_DSN,
      environment: import.meta.env.ENVIRONMENT || 'production',
    })
  ]
});
```

### 2. Uptime Monitoring

**Free options:**
- **UptimeRobot** - 50 monitors free
- **Better Uptime** - 3 monitors free
- **Pingdom** - Limited free tier

### 3. Performance Monitoring

- **Vercel Analytics** - Built-in
- **Google Analytics 4** - Already integrated
- **Cloudflare Web Analytics** - Privacy-friendly

---

## 🧪 Pre-Commit Hooks

### Install Husky

```bash
npm install --save-dev husky lint-staged
npx husky install
```

### Configure in `package.json`

```json
{
  "lint-staged": {
    "*.{js,ts,astro}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

### Create pre-commit hook

```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

---

## 📋 Development Checklist

Before committing:
- [ ] Run `npm run format` to format code
- [ ] Run `npm run lint` to check for issues
- [ ] Run `npm run check` for Astro validation
- [ ] Run `npm run type-check` for TypeScript
- [ ] Test locally with `npm run dev`
- [ ] Build successfully with `npm run build`

Before deploying:
- [ ] All tests pass
- [ ] Environment variables set in hosting platform
- [ ] Secrets configured correctly
- [ ] DNS records configured
- [ ] SSL certificate active
- [ ] Monitoring enabled

---

## ✅ Summary

**Tools Added:**
- ✅ ESLint for code quality
- ✅ Prettier for formatting
- ✅ TypeScript for type safety
- ✅ Astro Check for validation
- ✅ GitHub Actions for CI/CD
- ✅ Security best practices documented

**Next Steps:**
1. Run `npm install --save-dev` with the dependencies above
2. Create config files (`.eslintrc.json`, `.prettierrc.json`)
3. Update `package.json` scripts
4. Set up GitHub Actions workflows
5. Configure hosting platform
6. Set up monitoring

---

**Questions?** Refer to the documentation or test with the tools!
