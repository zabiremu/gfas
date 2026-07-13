/**
 * Recursively converts object keys from snake_case to camelCase.
 *
 * The Amovix backend serializes TypeORM entities with snake_case columns
 * (e.g. `shipment_number`), while the frontend types are camelCase. This
 * normalizes API responses so consumers always see camelCase keys.
 *
 * Only plain objects and arrays are transformed; Blobs, Dates, strings, etc.
 * pass through untouched. The transform is idempotent — keys already in
 * camelCase have no underscores, so re-running it is a no-op (safe if the
 * backend later adds its own camelCase serialization).
 */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

export function keysToCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => keysToCamel(item)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[snakeToCamel(key)] = keysToCamel(value);
    }
    return result as T;
  }
  return input as T;
}
