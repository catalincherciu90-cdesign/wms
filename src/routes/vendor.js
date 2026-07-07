// Servește biblioteci client împachetate în Worker (fără CDN)
import zxingSrc from '../vendor/zxing.txt';
import { corsHeaders } from '../lib/http.js';

export function zxing() {
  return new Response(zxingSrc, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=604800',
      ...corsHeaders,
    },
  });
}
