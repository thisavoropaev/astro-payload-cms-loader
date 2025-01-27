# astro-payload-loader

An Astro integration for loading content from Payload CMS.

## Features

- 🚀 Easy integration with Astro
- 📦 Type-safe content fetching with Zod schemas
- ⚡️ Fast and efficient data loading
- 🛠 Configurable caching options

## Installation

```bash
# Using npm
npm install astro-payload-loader

# Using yarn
yarn add astro-payload-loader

# Using pnpm
pnpm add astro-payload-loader

# Using bun
bun add astro-payload-loader
```

Create `.env` file in your project root:

```env
PAYLOAD_BASE_URL=https://your-payload-cms.com
```

## Fetching Content

### Basic Usage

```typescript
import { defineCollection, z } from "astro:content"
import { payloadLoader } from "astro-payload-loader"

export const postSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
  })
  .transform((data) => ({
    ...data,
    urlPath: `/posts/${data.slug}`,
  }))

const posts = defineCollection({
  loader: payloadLoader({ apiPath: "posts" }),
  schema: postSchema,
})

export const collections = { posts }
```

### Advanced Configuration

```typescript
const posts = defineCollection({
  loader: payloadLoader({
    apiPath: "posts",
    syncInterval: 300000, // Cache data for 5 minutes
    // or
    syncInterval: 0, // Disable caching, fetch fresh data on every request
    depth: 3, // Deep nested relationships
  }),
  schema: postSchema,
})
```
