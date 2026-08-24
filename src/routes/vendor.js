// Servește biblioteci client împachetate în Worker (fără CDN)
import zxingSrc from '../vendor/zxing.txt';
import xlsxSrc from '../vendor/xlsx.txt';
import pdfSrc from '../vendor/pdf.txt';
import pdfWorkerSrc from '../vendor/pdfworker.txt';
import loginBg from '../vendor/login-bg.png';
import siteHero from '../vendor/site-hero.png';
import site1 from '../vendor/site-1.png';
import site2 from '../vendor/site-2.png';
import logo from '../vendor/logo.png';
import { corsHeaders } from '../lib/http.js';

const IMAGES = { 'login-bg': loginBg, 'site-hero': siteHero, 'site-1': site1, 'site-2': site2, 'logo': logo };

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
export function pdf() { return js(pdfSrc); }
export function pdfworker() { return js(pdfWorkerSrc); }
export function image(name) {
  const data = IMAGES[name];
  if (!data) return new Response('Not found', { status: 404, headers: corsHeaders });
  return new Response(data, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800', ...corsHeaders },
  });
}
