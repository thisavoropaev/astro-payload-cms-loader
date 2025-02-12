import type { Loader } from "astro/loaders"

/**
 * Configuration options for the Payload CMS loader
 */
type PayloadLoaderOptions = {
  /** The API endpoint path (e.g., 'posts', 'users') */
  apiPath: string
  /** Interval in milliseconds between content syncs (default: 60000) */
  syncInterval?: number
  /** Depth level for nested relationships */
  depth?: number
}

/**
 * Payload CMS API response format
 */
type PayloadResponse = {
  /** Array of content entries */
  docs: Array<{ [key: string]: unknown }>
}

const PAYLOAD_BASE_URL = import.meta.env.PAYLOAD_BASE_URL as string

if (!PAYLOAD_BASE_URL) {
  throw new Error("PAYLOAD_BASE_URL environment variable is not set")
}

/**
 * Creates a Payload CMS content loader for Astro
 *
 * @since 0.1.0
 * @param options - Configuration options for the loader
 * @param options.apiPath - The path segment for the API endpoint (e.g., 'posts', 'users')
 * @param options.syncInterval - Fetches only if syncInterval elapsed; else returns cached data (default: 60000ms)
 * @param options.depth - Depth level for nested relationships
 * @returns An Astro loader function for the specified collection
 * @throws {Error} When apiPath is empty or syncInterval is invalid
 */
export function payloadLoader({
  apiPath,
  syncInterval = 60 * 1000,
  depth,
}: PayloadLoaderOptions): Omit<Loader, "load"> & {
  // Using 'any' type for context to maintain compatibility with older Astro versions
  load: (context: any) => Promise<void>
} {
  if (!apiPath?.trim()) {
    throw new Error("apiPath is required and cannot be empty")
  }

  const isSyncIntervalValid = typeof syncInterval === "number" && syncInterval >= 0

  if (!isSyncIntervalValid) {
    throw new Error("syncInterval must be a non-negative number")
  }

  return {
    name: `payload-${apiPath}`,
    load: async function ({ store, meta, parseData, generateDigest, logger }) {
      const lastSynced = meta.get("lastSynced")

      // Avoid frequent syncs
      if (lastSynced && Date.now() - Number(lastSynced) < syncInterval) {
        logger.info("Skipping Payload sync")
        return
      }

      logger.info(`Attempting to fetch posts from ${apiPath} at ${new Date().toISOString()}`)

      try {
        const { docs: entries } = await fetchFromPayload(`api/${apiPath}`, {
          depth: depth?.toString(),
        })

        if (!Array.isArray(entries)) {
          throw new Error("Invalid response format: entries is not an array")
        }

        // Sequential processing of entries
        for (const entry of entries) {
          const parsedEntry = await parseData({
            id: String(entry.id),
            data: entry,
          })

          const digest = generateDigest(parsedEntry)
          store.set({ id: String(entry.id), data: parsedEntry, digest })
        }

        meta.set("lastSynced", String(Date.now()))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        logger.error(`Error loading Payload content: ${errorMessage}`)
        throw error
      }
    },
  }
}

/**
 * Fetches data from the Payload API
 * @param path The API endpoint path
 * @param params Optional query parameters
 * @returns The JSON response from the API
 */
async function fetchFromPayload(
  path: string,
  params?: { [key: string]: string | undefined }
): Promise<PayloadResponse> {
  const url = createUrl(path, params)

  try {
    const response = await fetch(url.href)

    if (!response.ok) {
      throw new Error(`Failed to fetch from Payload: ${response.statusText}`)
    }

    return response.json() as Promise<PayloadResponse>
  } catch (error) {
    console.error(`Error fetching from Payload: ${(error as Error).message}`)
    throw error // Re-throw the error for the caller to handle
  }
}

/**
 * Creates a URL object by combining the base URL with a path and optional query parameters
 *
 * @param path The path segment to append to the base URL
 * @param params Optional query parameters to add to the URL
 * @returns A complete URL object with the specified path and parameters
 */
function createUrl(path: string, params?: { [key: string]: string | undefined }): URL {
  const url = new URL(
    path,
    PAYLOAD_BASE_URL.endsWith("/") ? PAYLOAD_BASE_URL : `${PAYLOAD_BASE_URL}/`
  )

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value)
      }
    })
  }

  return url
}
