export const getApiError = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null || !('error' in data)) return undefined
  return typeof data.error === 'string' ? data.error : undefined
}
