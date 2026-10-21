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
import tutDashboard from '../vendor/tut-dashboard.jpg';
import tutProduse from '../vendor/tut-produse.jpg';
import tutStoc from '../vendor/tut-stoc.jpg';
import tutReceptie from '../vendor/tut-receptie.jpg';
import tutComenzi from '../vendor/tut-comenzi.jpg';
import tutCutii from '../vendor/tut-cutii.jpg';
import tutCmrForm from '../vendor/tut-cmr-form.jpg';
import tutMiscari from '../vendor/tut-miscari.jpg';
import tutZebraHome from '../vendor/tut-zebra-home.jpg';
import tutZebraReceptie from '../vendor/tut-zebra-receptie.jpg';
import tutZebraCutii from '../vendor/tut-zebra-cutii.jpg';
import tutZebraComenzi from '../vendor/tut-zebra-comenzi.jpg';
import { corsHeaders } from '../lib/http.js';

const IMAGES = { 'login-bg': loginBg, 'site-hero': siteHero, 'site-1': site1, 'site-2': site2, 'logo': logo };
const JPEGS = {
  'tut-dashboard': tutDashboard, 'tut-produse': tutProduse, 'tut-stoc': tutStoc,
  'tut-receptie': tutReceptie, 'tut-comenzi': tutComenzi, 'tut-cutii': tutCutii,
  'tut-cmr-form': tutCmrForm, 'tut-miscari': tutMiscari,
  'tut-zebra-home': tutZebraHome, 'tut-zebra-receptie': tutZebraReceptie,
  'tut-zebra-cutii': tutZebraCutii, 'tut-zebra-comenzi': tutZebraComenzi,
};

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

export function imageJpeg(name) {
  const data = JPEGS[name];
  if (!data) return new Response('Not found', { status: 404, headers: corsHeaders });
  return new Response(data, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=604800', ...corsHeaders },
  });
}
