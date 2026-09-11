import { SupabaseClient } from "@supabase/supabase-js"

/**
 * An in-flight fetch for one table. Callers that arrive in the same tick join it
 * (via `ids`) so their sibling resolutions collapse into a single query.
 */
interface PendingBatch {
  ids: Set<string>
  scheduled: boolean
  promise: Promise<void>
}

/**
 * BatchContext stores pre-fetched or cached data for the duration of a GraphQL request.
 */
export interface BatchContext {
  cache: Map<string, Map<string, Record<string, unknown>>> // tableName -> (id -> record)
  pending: Map<string, PendingBatch> // tableName -> in-flight batch
  supabase: SupabaseClient
}

/**
 * QueryPlanner analyzes GraphQL AST and manages batched data fetching.
 */
export class QueryPlanner {
  /**
   * Creates a fresh BatchContext for a request.
   */
  public static createBatchContext(supabase: SupabaseClient): BatchContext {
    return {
      cache: new Map(),
      pending: new Map(),
      supabase,
    }
  }

  /**
   * Fetches a batch of records if they are not already in the cache.
   *
   * Requests for the same table that arrive in the same tick are coalesced into
   * one query. GraphQL starts sibling field resolvers synchronously, so without
   * this every reference at the same level issued its own fetch — the N+1 the
   * planner exists to remove. The batch is drained on a microtask: callers that
   * arrive later (after the drain) start a fresh batch.
   *
   * @param context - The current BatchContext.
   * @param tableName - The table to fetch from.
   * @param ids - The IDs to fetch.
   */
  public static async ensureBatch(
    context: BatchContext,
    tableName: string,
    ids: string[]
  ): Promise<void> {
    if (!ids.length) return

    let tableCache = context.cache.get(tableName)
    if (!tableCache) {
      tableCache = new Map()
      context.cache.set(tableName, tableCache)
    }

    const missingIds = ids.filter((id) => !tableCache.has(id))
    if (!missingIds.length) return

    let batch = context.pending.get(tableName)
    if (!batch) {
      batch = { ids: new Set(), scheduled: false, promise: Promise.resolve() }
      context.pending.set(tableName, batch)
    }
    missingIds.forEach((id) => batch.ids.add(id))

    if (!batch.scheduled) {
      batch.scheduled = true
      const current = batch
      const cache = tableCache
      current.promise = Promise.resolve().then(async () => {
        // Drop it first, so callers arriving once the fetch is under way start a
        // fresh batch rather than joining a half-drained set.
        context.pending.delete(tableName)
        await QueryPlanner.fetchIds(context, tableName, cache, [...current.ids])
      })
    }

    await batch.promise
  }

  /** Runs one `in` query and fills the table cache. */
  private static async fetchIds(
    context: BatchContext,
    tableName: string,
    tableCache: Map<string, Record<string, unknown>>,
    ids: string[]
  ): Promise<void> {
    const { data, error } = await context.supabase
      .from(tableName)
      .select("*")
      .in("id", ids)

    if (error) {
      console.error(
        `QueryPlanner: Error fetching batch for ${tableName}`,
        error
      )
      return
    }

    data?.forEach((record: Record<string, unknown>) => {
      if (record.id && typeof record.id === "string") {
        tableCache.set(record.id, record)
      }
    })
  }

  /**
   * Gets a record from the cache.
   */
  public static getFromCache(
    context: BatchContext,
    tableName: string,
    id: string
  ): Record<string, unknown> | null {
    return context.cache.get(tableName)?.get(id) || null
  }
}
