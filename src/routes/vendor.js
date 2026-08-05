// Servește biblioteci client împachetate în Worker (fără CDN)
import zxingSrc from '../vendor/zxing.txt';
import xlsxSrc from '../vendor/xlsx.txt';
import { corsHeaders } from '../lib/http.js';

function js(src) {
  return new Response(src, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=604800',
      ...corsHeaders,
    },
  });
}

export function zxing() { return js(zxingSrc); }
export function xlsx() { return js(xlsxSrc); }
