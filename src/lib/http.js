// Helper-e HTTP: CORS + răspunsuri JSON

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders, ...extraHeaders },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function csv(rows, filename = 'export.csv') {
  const body = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...corsHeaders,
    },
  });
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Citește body JSON în siguranță
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
