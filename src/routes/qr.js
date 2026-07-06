// Generare cod QR ca SVG (server-side, cu qrcode-generator — pur JS, rulează în Workers)
import qrcode from 'qrcode-generator';
import { corsHeaders, error } from '../lib/http.js';

export async function svg(request, env) {
  const url = new URL(request.url);
  const data = url.searchParams.get('data');
  if (!data) return error('Parametrul data e obligatoriu', 400);
  if (data.length > 800) return error('Conținut prea lung pentru QR', 400);

  const qr = qrcode(0, 'M'); // versiune auto, corecție erori nivel M
  qr.addData(data);
  qr.make();
  const svgStr = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });

  return new Response(svgStr, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      ...corsHeaders,
    },
  });
}
