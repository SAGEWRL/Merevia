export function originalApiUrl(request) {
  const requestUrl = new URL(request.url, `https://${request.headers.host || 'localhost'}`);
  const routePath = requestUrl.searchParams.get('path');
  if (!routePath) return requestUrl;

  requestUrl.searchParams.delete('path');
  const originalUrl = new URL(`/api/${routePath}`, requestUrl.origin);
  originalUrl.search = requestUrl.search;
  return originalUrl;
}