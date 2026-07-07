// Interfața web (SPA vanilla, fără dependențe externe) servită de Worker.
// Notă: în scriptul client evităm template literals ca să nu intre în conflict
// cu template literal-ul exterior din acest fișier.

export function renderUI() {
  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WMS — Gestiune Depozit</title>
<style>
  :root{
    --bg:#f4f6fb; --panel:#ffffff; --panel-2:#f9fafc; --text:#1a2233; --muted:#6b7688;
    --border:#e3e8f0; --brand:#2f6df6; --brand-2:#1e51d6; --good:#12a150; --warn:#e0902a; --bad:#d64545;
    --shadow:0 1px 3px rgba(20,30,60,.08),0 8px 24px rgba(20,30,60,.06);
  }
  @media (prefers-color-scheme:dark){
    :root{ --bg:#0f141c; --panel:#161d29; --panel-2:#1b2430; --text:#e7ecf5; --muted:#93a0b5;
      --border:#26313f; --brand:#4d84ff; --brand-2:#3a6df0; --shadow:0 1px 3px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35); }
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);font-size:14px}
  a{color:var(--brand);text-decoration:none}
  button{font:inherit;cursor:pointer;border:none;border-radius:8px;padding:9px 14px;background:var(--brand);color:#fff;font-weight:600}
  button.ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
  button.sm{padding:5px 10px;font-size:12.5px}
  button.danger{background:var(--bad)}
  button:disabled{opacity:.5;cursor:not-allowed}
  input,select,textarea{font:inherit;width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--panel-2);color:var(--text)}
  label{display:block;font-size:12.5px;color:var(--muted);margin:0 0 4px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--border);white-space:nowrap}
  th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  tr:hover td{background:var(--panel-2)}
  .card{background:var(--panel);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow)}
  .pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:600}
  .pill.good{background:rgba(18,161,80,.14);color:var(--good)} .pill.bad{background:rgba(214,69,69,.14);color:var(--bad)}
  .pill.warn{background:rgba(224,144,42,.16);color:var(--warn)} .pill.mut{background:var(--panel-2);color:var(--muted)}
  .row{display:flex;gap:14px;flex-wrap:wrap} .grid{display:grid;gap:14px}
  .field{margin-bottom:12px}
  /* Login */
  #login{min-height:100vh;display:grid;place-items:center;padding:20px}
  #login .card{padding:30px;width:100%;max-width:380px}
  .logo{font-weight:800;font-size:20px;letter-spacing:-.02em}
  .logo b{color:var(--brand)}
  /* App shell */
  #app{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
  aside{background:var(--panel);border-right:1px solid var(--border);padding:16px 12px;display:flex;flex-direction:column;gap:4px}
  aside .nav{display:block;padding:9px 12px;border-radius:8px;color:var(--text);font-weight:500}
  aside .nav:hover{background:var(--panel-2)}
  aside .nav.active{background:var(--brand);color:#fff}
  main{padding:22px 26px;overflow:auto}
  .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
  h1{font-size:20px;margin:0} h2{font-size:15px;margin:0 0 12px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
  .kpi{padding:16px 18px} .kpi .n{font-size:28px;font-weight:800;letter-spacing:-.02em} .kpi .l{color:var(--muted);font-size:12.5px;margin-top:2px}
  .toolbar{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
  .toolbar .spacer{flex:1}
  .muted{color:var(--muted)} .right{text-align:right} .center{text-align:center}
  .modal-bg{position:fixed;inset:0;background:rgba(10,15,25,.5);display:grid;place-items:center;padding:20px;z-index:50}
  .modal{width:100%;max-width:440px;padding:22px}
  .toast{position:fixed;bottom:20px;right:20px;padding:12px 16px;border-radius:10px;color:#fff;box-shadow:var(--shadow);z-index:99;font-weight:600}
  @media(max-width:820px){ #app{grid-template-columns:1fr} aside{flex-direction:row;overflow:auto} .kpis{grid-template-columns:repeat(2,1fr)} }
</style>
</head>
<body>
<div id="root"></div>
<script>
"use strict";
var API = "";
var token = localStorage.getItem("wms_token") || null;
var me = null;
var view = "dashboard";
var cache = {};

var el = function(id){ return document.getElementById(id); };
var esc = function(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };

function toast(msg, kind){
  var t = document.createElement("div");
  t.className = "toast"; t.style.background = kind==="bad" ? "var(--bad)" : "var(--good)";
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 2600);
}

function api(method, path, body){
  var opts = { method: method, headers: {} };
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (body){ opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  return fetch(API + path, opts).then(function(r){
    if (r.status === 401){ logout(); throw new Error("Sesiune expirată"); }
    var ct = r.headers.get("Content-Type") || "";
    if (ct.indexOf("application/json") < 0) return r;
    return r.json().then(function(d){ if(!r.ok) throw new Error(d.error||("HTTP "+r.status)); return d; });
  });
}

function can(min){ var o={viewer:1,operator:2,admin:3}; return me && o[me.role] >= o[min]; }

/* ---------------- Auth ---------------- */
function logout(){ token=null; me=null; localStorage.removeItem("wms_token"); renderLogin(); }

function renderLogin(err){
  el("root") ; document.getElementById("root").innerHTML =
    '<div id="login"><form class="card" onsubmit="return doLogin(event)">'
    + '<div class="logo" style="margin-bottom:6px">W<b>MS</b></div>'
    + '<div class="muted" style="margin-bottom:20px">Gestiune depozit</div>'
    + '<div class="field"><label>Email</label><input id="li_email" type="email" autofocus required></div>'
    + '<div class="field"><label>Parolă</label><input id="li_pass" type="password" required></div>'
    + (err?'<div class="pill bad" style="margin-bottom:12px">'+esc(err)+'</div>':'')
    + '<button style="width:100%" type="submit">Autentificare</button>'
    + '<div class="muted center" style="margin-top:14px;font-size:12px">admin@wms.local / admin123 (seed)</div>'
    + '</form></div>';
}
window.doLogin = function(e){
  e.preventDefault();
  api("POST","/api/auth/login",{ email: el("li_email").value, password: el("li_pass").value })
    .then(function(d){ token=d.token; me=d.user; localStorage.setItem("wms_token",token); renderApp(); if(!handleHash()) go("dashboard"); })
    .catch(function(err){ renderLogin(err.message); });
  return false;
};

/* ---------------- App shell ---------------- */
var NAV = [
  ["dashboard","Dashboard","viewer"], ["stock","Stoc","viewer"], ["products","Produse","viewer"],
  ["locations","Locații","viewer"], ["receive","Recepție","operator"], ["ship","Expediere","operator"],
  ["transfer","Transfer","operator"], ["orders","Comenzi","viewer"], ["partners","Parteneri","viewer"],
  ["movements","Mișcări","viewer"], ["reports","Rapoarte","viewer"], ["users","Utilizatori","admin"]
];

function renderApp(){
  var nav = NAV.filter(function(n){ return can(n[2]); }).map(function(n){
    return '<a class="nav'+(view===n[0]?' active':'')+'" href="#" onclick="go(\\''+n[0]+'\\');return false">'+n[1]+'</a>';
  }).join("");
  document.getElementById("root").innerHTML =
    '<div id="app"><aside>'
    + '<div class="logo" style="padding:6px 12px 14px">W<b>MS</b></div>'
    + nav
    + '<button class="ghost sm" style="margin:8px 6px 2px" onclick="scanCamera(handleScanResult)">📷 Scanează</button>'
    + '<div style="flex:1"></div>'
    + '<div class="muted" style="padding:8px 12px;font-size:12px">'+esc(me.name)+'<br><span class="pill mut">'+esc(me.role)+'</span></div>'
    + '<button class="ghost sm" onclick="logout()">Ieșire</button>'
    + '</aside><main id="main"></main></div>';
}

window.go = function(v){ view=v; renderApp(); var f=VIEWS[v]; if(f) f(); };

function setMain(html){ document.getElementById("main").innerHTML = html; }
function topbar(title, right){ return '<div class="topbar"><h1>'+esc(title)+'</h1><div class="row">'+(right||"")+'</div></div>'; }

/* ---------------- Views ---------------- */
var VIEWS = {};

VIEWS.dashboard = function(){
  setMain(topbar("Dashboard") + '<div id="dash">Se încarcă…</div>');
  api("GET","/api/dashboard").then(function(d){
    var k=d.kpis;
    var kpis = '<div class="kpis" style="grid-template-columns:repeat(5,1fr)">'
      + kpi(k.products,"Produse active")
      + kpi(k.locations,"Locații")
      + kpi(k.total_units,"Unități în stoc")
      + kpi(k.open_orders||0,"Comenzi deschise")
      + kpi(k.low_stock,"Sub prag stoc", k.low_stock>0?"bad":"good")
      + '</div>';
    var chart = '<div class="card" style="padding:18px"><h2>Activitate ultimele 7 zile</h2>'
      + '<canvas id="chart" height="220"></canvas>'
      + '<div class="row" style="gap:18px;margin-top:10px;font-size:12.5px">'
      + '<span><span class="pill good">■</span> Intrări</span><span><span class="pill bad">■</span> Ieșiri</span></div></div>';
    var cat = '<div class="card" style="padding:18px"><h2>Stoc pe categorie</h2>'+catBars(d.by_category||[])+'</div>';
    var top = '<div class="grid" style="grid-template-columns:1fr 1fr">'+chart+cat+'</div>';

    var orders = '<div class="card" style="padding:18px"><h2>Comenzi recente</h2>'
      + ((d.recent_orders&&d.recent_orders.length)
        ? '<table><tbody>'+d.recent_orders.map(function(o){
            return '<tr><td><b>'+esc(o.code)+'</b></td><td><span class="pill mut">'+(o.type==="inbound"?"intrare":"ieșire")+'</span></td>'
              +'<td>'+esc(o.partner_name||"—")+'</td><td>'+orderStatusPill(o.status)+'</td></tr>';
          }).join("")+'</tbody></table>'
        : '<div class="muted">Nicio comandă încă</div>')+'</div>';
    var low = '<div class="card" style="padding:18px"><h2>Produse sub prag</h2>'
      + ((d.low_stock_list&&d.low_stock_list.length)
        ? '<table><tbody>'+d.low_stock_list.map(function(p){
            return '<tr><td><b>'+esc(p.sku)+'</b> '+esc(p.name)+'</td><td class="right"><span class="pill bad">'+esc(p.total)+' / '+esc(p.reorder_point)+'</span></td></tr>';
          }).join("")+'</tbody></table>'
        : '<div class="muted">Totul peste prag ✔</div>')+'</div>';
    var bottom = '<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px">'+orders+low+'</div>';

    el("dash").innerHTML = kpis + top + bottom;
    drawChart(d.activity||[]);
  }).catch(function(e){ el("dash").innerHTML='<div class="pill bad">'+esc(e.message)+'</div>'; });
};
function catBars(rows){
  if(!rows.length) return '<div class="muted">Fără stoc</div>';
  var max=1; rows.forEach(function(r){ max=Math.max(max,r.units); });
  return rows.map(function(r){
    var pct=Math.round((r.units/max)*100);
    return '<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:12.5px"><span>'+esc(r.category)+'</span><span class="muted">'+esc(r.units)+'</span></div>'
      +'<div style="height:8px;background:var(--panel-2);border-radius:6px;overflow:hidden;margin-top:3px"><div style="height:100%;width:'+pct+'%;background:var(--brand);border-radius:6px"></div></div></div>';
  }).join("");
}
function orderStatusPill(s){
  var m={draft:["mut","ciornă"],confirmed:["warn","confirmată"],completed:["good","finalizată"],cancelled:["bad","anulată"]};
  var x=m[s]||["mut",s]; return '<span class="pill '+x[0]+'">'+x[1]+'</span>';
}
function kpi(n,l,kind){ return '<div class="card kpi"><div class="n'+(kind?' ':'')+'" '+(kind==="bad"?'style="color:var(--bad)"':'')+'>'+esc(n)+'</div><div class="l">'+esc(l)+'</div></div>'; }

function drawChart(data){
  var c = el("chart"); if(!c) return;
  var ctx = c.getContext("2d"); var W = c.width = c.clientWidth; var H = c.height;
  ctx.clearRect(0,0,W,H);
  if(!data.length){ ctx.fillStyle="#889"; ctx.font="13px system-ui"; ctx.fillText("Nicio mișcare în ultimele 7 zile",10,30); return; }
  var pad=30, bw=(W-pad*2)/data.length, max=1;
  data.forEach(function(d){ max=Math.max(max,d.inbound||0,d.outbound||0); });
  var scale=(H-pad*2)/max;
  data.forEach(function(d,i){
    var x=pad+i*bw, gib=(d.inbound||0)*scale, gob=(d.outbound||0)*scale, w=bw*0.32;
    ctx.fillStyle="#12a150"; ctx.fillRect(x+bw*0.15, H-pad-gib, w, gib);
    ctx.fillStyle="#d64545"; ctx.fillRect(x+bw*0.52, H-pad-gob, w, gob);
    ctx.fillStyle="#889"; ctx.font="10px system-ui"; ctx.textAlign="center";
    ctx.fillText(String(d.day).slice(5), x+bw/2, H-pad+14);
  });
  ctx.strokeStyle="rgba(120,130,150,.3)"; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke();
}

VIEWS.products = function(){
  var addBtn = can("operator") ? '<button onclick="productForm()">+ Produs</button>' : '';
  var exp = '<button class="ghost" onclick="downloadCsv(\\'/api/products/export\\',\\'produse.csv\\')">Export CSV</button>';
  setMain(topbar("Produse", addBtn+exp) + '<div class="toolbar"><input id="pq" placeholder="Caută SKU / nume / cod bare" oninput="loadProducts()" style="max-width:320px"></div><div class="card" id="ptbl">…</div>');
  loadProducts();
};
window.loadProducts = function(){
  var q = el("pq") ? el("pq").value : "";
  api("GET","/api/products"+(q?("?q="+encodeURIComponent(q)):"")).then(function(d){
    cache.products = d.products;
    var rows = d.products.map(function(p){
      return '<tr><td><b>'+esc(p.sku)+'</b></td><td>'+esc(p.name)+'</td><td>'+esc(p.category||"—")+'</td>'
        + '<td class="right">'+esc(p.reorder_point)+'</td><td>'+esc(p.unit)+'</td>'
        + '<td>'+(p.active?'<span class="pill good">activ</span>':'<span class="pill mut">inactiv</span>')+'</td>'
        + '<td class="right"><button class="ghost sm" onclick="showBarcode(\\''+esc(p.barcode||p.sku)+'\\',\\''+esc(p.sku)+'\\')">⌗ Bare</button>'
        + ' <button class="ghost sm" onclick="showQR(appOrigin()+\\'/#sku=\\'+encodeURIComponent(\\''+esc(p.sku)+'\\'),\\''+esc(p.sku)+'\\')">▦ QR</button>'
        + (can("operator")?' <button class="ghost sm" onclick="productForm('+p.id+')">Edit</button>':'')+'</td></tr>';
    }).join("");
    el("ptbl").innerHTML = '<table><thead><tr><th>SKU</th><th>Nume</th><th>Categorie</th><th class="right">Prag</th><th>UM</th><th>Status</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=7 class="muted center">Niciun produs</td></tr>')+'</tbody></table>';
  });
};
window.productForm = function(id){
  var p = id ? cache.products.find(function(x){return x.id===id;}) : {unit:"buc",reorder_point:0,active:1};
  modal((id?"Editează":"Adaugă")+" produs",
    field("SKU","p_sku",p.sku||"",id?"disabled":"")
    + '<div class="field"><label>Cod de bare</label><div class="row"><input id="p_barcode" style="flex:1" value="'+esc(p.barcode||"")+'" placeholder="scanează sau tastează"><button type="button" class="ghost" title="Scanează" onclick="scanInto(\\'p_barcode\\',true)">📷</button><button type="button" class="ghost" title="Identifică online" onclick="barcodeLookup()">🔍</button></div></div>'
    + field("Nume","p_name",p.name||"")
    + field("Categorie","p_category",p.category||"")
    + '<div class="row"><div style="flex:1">'+field("UM","p_unit",p.unit||"buc")+'</div><div style="flex:1">'+field("Prag reorder","p_reorder",p.reorder_point||0,"","number")+'</div></div>',
    function(){
      var body={ sku:el("p_sku").value, barcode:el("p_barcode").value, name:el("p_name").value, category:el("p_category").value, unit:el("p_unit").value, reorder_point:Number(el("p_reorder").value) };
      var pr = id ? api("PUT","/api/products/"+id,body) : api("POST","/api/products",body);
      pr.then(function(){ closeModal(); toast("Salvat"); loadProducts(); }).catch(function(e){ toast(e.message,"bad"); });
    });
};

VIEWS.locations = function(){
  var addBtn = can("operator") ? '<button onclick="locationForm()">+ Locație</button>' : '';
  setMain(topbar("Locații", addBtn) + '<div class="card" id="ltbl">…</div>');
  api("GET","/api/locations").then(function(d){
    cache.locations = d.locations;
    var rows = d.locations.map(function(l){
      return '<tr><td><b>'+esc(l.code)+'</b></td><td>'+esc(l.name||"—")+'</td><td>'+esc(l.zone||"—")+'</td>'
        + '<td>'+(l.active?'<span class="pill good">activ</span>':'<span class="pill mut">inactiv</span>')+'</td>'
        + '<td class="right"><button class="ghost sm" onclick="showQR(appOrigin()+\\'/#loc=\\'+encodeURIComponent(\\''+esc(l.code)+'\\'),\\''+esc(l.code)+'\\')">▦ QR</button>'
        + ' <button class="ghost sm" onclick="locationView(\\''+esc(l.code)+'\\')">Vezi</button>'
        + (can("operator")?' <button class="ghost sm" onclick="locationForm('+l.id+')">Edit</button>':'')+'</td></tr>';
    }).join("");
    el("ltbl").innerHTML='<table><thead><tr><th>Cod</th><th>Nume</th><th>Zonă</th><th>Status</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=5 class="muted center">Nicio locație</td></tr>')+'</tbody></table>';
  });
};
window.locationForm = function(id){
  var l = id ? cache.locations.find(function(x){return x.id===id;}) : {};
  modal((id?"Editează":"Adaugă")+" locație",
    field("Cod (ex: A-01-03)","l_code",l.code||"",id?"disabled":"") + field("Nume","l_name",l.name||"") + field("Zonă","l_zone",l.zone||""),
    function(){
      var body={ code:el("l_code").value, name:el("l_name").value, zone:el("l_zone").value };
      var pr = id ? api("PUT","/api/locations/"+id,body) : api("POST","/api/locations",body);
      pr.then(function(){ closeModal(); toast("Salvat"); go("locations"); }).catch(function(e){ toast(e.message,"bad"); });
    });
};

VIEWS.stock = function(){
  var exp = '<button class="ghost" onclick="downloadCsv(\\'/api/inventory/export\\',\\'stoc.csv\\')">Export CSV</button>';
  setMain(topbar("Stoc", exp) + '<h2 style="margin-top:6px">Total per produs</h2><div class="card" id="sumtbl" style="margin-bottom:18px">…</div><h2>Detaliu pe locație</h2><div class="card" id="stbl">…</div>');
  api("GET","/api/inventory/summary").then(function(d){
    var rows=d.summary.map(function(s){
      return '<tr><td><b>'+esc(s.sku)+'</b></td><td>'+esc(s.name)+'</td><td class="right">'+esc(s.total)+' '+esc(s.unit)+'</td>'
        +'<td>'+(s.low?'<span class="pill bad">sub prag</span>':'<span class="pill good">ok</span>')+'</td></tr>';
    }).join("");
    el("sumtbl").innerHTML='<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">Total</th><th>Status</th></tr></thead><tbody>'+(rows||'<tr><td colspan=4 class="muted center">Fără stoc</td></tr>')+'</tbody></table>';
  });
  api("GET","/api/inventory/stock").then(function(d){
    var rows=d.stock.map(function(s){
      return '<tr><td><b>'+esc(s.sku)+'</b></td><td>'+esc(s.product_name)+'</td><td>'+esc(s.location_code)+'</td><td class="right">'+esc(s.quantity)+'</td><td class="muted">'+esc(s.updated_at)+'</td></tr>';
    }).join("");
    el("stbl").innerHTML='<table><thead><tr><th>SKU</th><th>Produs</th><th>Locație</th><th class="right">Cant.</th><th>Actualizat</th></tr></thead><tbody>'+(rows||'<tr><td colspan=5 class="muted center">Fără stoc</td></tr>')+'</tbody></table>';
  });
};

function opForm(title, type){
  setMain(topbar(title) + '<div class="card" style="padding:20px;max-width:520px">'
    + '<div id="opmsg"></div>'
    + '<div class="field"><label>⌗ Scanează cod de bare / SKU</label><div class="row"><input id="op_scan" style="flex:1" placeholder="Scanează sau tastează, apoi Enter" onkeydown="if(event.key===\\'Enter\\'){event.preventDefault();opScan();}"><button type="button" class="ghost" onclick="scanCamera(function(t){el(\\'op_scan\\').value=t;opScan();})">📷</button></div></div>'
    + '<div class="field"><label>Produs</label><select id="op_prod"></select></div>'
    + (type==="transfer"
        ? '<div class="row"><div style="flex:1"><label>Din locația</label><select id="op_from"></select></div><div style="flex:1"><label>În locația</label><select id="op_to"></select></div></div>'
        : '<div class="field"><label>Locație</label><select id="op_loc"></select></div>')
    + '<div class="row"><div style="flex:1"><label>Cantitate</label><input id="op_qty" type="number" min="1" value="1"></div><div style="flex:1"><label>Referință (opțional)</label><input id="op_ref"></div></div>'
    + '<div class="field"><label>Notă</label><input id="op_note"></div>'
    + '<button onclick="submitOp(\\''+type+'\\')">'+esc(title)+'</button>'
    + '</div>');
  Promise.all([api("GET","/api/products"),api("GET","/api/locations")]).then(function(r){
    var prods=r[0].products.filter(function(p){return p.active;}), locs=r[1].locations.filter(function(l){return l.active;});
    cache.opProducts=prods;
    el("op_prod").innerHTML = prods.map(function(p){return '<option value="'+p.id+'">'+esc(p.sku+" — "+p.name)+'</option>';}).join("");
    var locOpts = locs.map(function(l){return '<option value="'+l.id+'">'+esc(l.code)+'</option>';}).join("");
    if(type==="transfer"){ el("op_from").innerHTML=locOpts; el("op_to").innerHTML=locOpts; }
    else {
      el("op_loc").innerHTML=locOpts;
      if(window._opPresetLoc){ var pl=locs.find(function(l){return l.code===window._opPresetLoc;}); if(pl) el("op_loc").value=pl.id; window._opPresetLoc=null; }
    }
  });
}
window.opFrom = function(type, locCode){
  window._opPresetLoc = locCode;
  opForm(type==="receive"?"Recepție marfă":"Expediere", type);
};
window.opScan = function(){
  var inp=el("op_scan"); if(!inp) return;
  var raw=String(inp.value||"").trim();
  var mm=raw.match(/[#&?]sku=([^&]+)/); if(mm){ raw=decodeURIComponent(mm[1]); }
  var q=raw.toLowerCase(); if(!q) return;
  var prods=cache.opProducts||[];
  var found=prods.find(function(p){ return String(p.barcode||"").toLowerCase()===q || String(p.sku||"").toLowerCase()===q; });
  if(found){ el("op_prod").value=found.id; toast("Găsit: "+found.sku); inp.value=""; var qt=el("op_qty"); if(qt) qt.focus(); }
  else { toast("Cod negăsit: "+q,"bad"); inp.select(); }
};
VIEWS.receive = function(){ opForm("Recepție marfă","receive"); };
VIEWS.ship = function(){ opForm("Expediere","ship"); };
VIEWS.transfer = function(){ opForm("Transfer între locații","transfer"); };
window.submitOp = function(type){
  var body={ product_id:Number(el("op_prod").value), quantity:Number(el("op_qty").value), reference:el("op_ref").value, note:el("op_note").value };
  var path;
  if(type==="transfer"){ path="/api/inventory/transfer"; body.from_location_id=Number(el("op_from").value); body.to_location_id=Number(el("op_to").value); }
  else { path="/api/inventory/"+(type==="receive"?"receive":"ship"); body.location_id=Number(el("op_loc").value); }
  api("POST",path,body).then(function(){ toast("Operațiune înregistrată"); el("op_qty").value=1; el("op_ref").value=""; el("op_note").value=""; })
    .catch(function(e){ el("opmsg").innerHTML='<div class="pill bad" style="margin-bottom:12px">'+esc(e.message)+'</div>'; });
};

VIEWS.movements = function(){
  setMain(topbar("Mișcări de stoc") + '<div class="card" id="mtbl">…</div>');
  api("GET","/api/inventory/movements?limit=200").then(function(d){
    var rows=d.movements.map(function(m){
      var q=m.quantity, pill = q>0?'<span class="pill good">+'+q+'</span>':'<span class="pill bad">'+q+'</span>';
      return '<tr><td class="muted">'+esc(m.created_at)+'</td><td><span class="pill mut">'+esc(m.type)+'</span></td>'
        +'<td><b>'+esc(m.sku)+'</b> '+esc(m.product_name)+'</td><td>'+esc(m.location_code)+'</td><td class="right">'+pill+'</td>'
        +'<td>'+esc(m.reference||"—")+'</td><td class="muted">'+esc(m.user_name||"—")+'</td></tr>';
    }).join("");
    el("mtbl").innerHTML='<table><thead><tr><th>Data</th><th>Tip</th><th>Produs</th><th>Locație</th><th class="right">Cant.</th><th>Ref.</th><th>User</th></tr></thead><tbody>'+(rows||'<tr><td colspan=7 class="muted center">Nicio mișcare</td></tr>')+'</tbody></table>';
  });
};

VIEWS.users = function(){
  setMain(topbar("Utilizatori", '<button onclick="userForm()">+ Utilizator</button>') + '<div class="card" id="utbl">…</div>');
  api("GET","/api/users").then(function(d){
    cache.users=d.users;
    var rows=d.users.map(function(u){
      return '<tr><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td><span class="pill mut">'+esc(u.role)+'</span></td>'
        +'<td>'+(u.active?'<span class="pill good">activ</span>':'<span class="pill bad">inactiv</span>')+'</td>'
        +'<td class="right"><button class="ghost sm" onclick="userForm('+u.id+')">Edit</button></td></tr>';
    }).join("");
    el("utbl").innerHTML='<table><thead><tr><th>Nume</th><th>Email</th><th>Rol</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
  });
};
window.userForm = function(id){
  var u = id ? cache.users.find(function(x){return x.id===id;}) : {role:"operator",active:1};
  var roleSel='<div class="field"><label>Rol</label><select id="u_role">'
    + ["admin","operator","viewer"].map(function(r){return '<option value="'+r+'"'+(u.role===r?' selected':'')+'>'+r+'</option>';}).join("")
    + '</select></div>';
  modal((id?"Editează":"Adaugă")+" utilizator",
    field("Nume","u_name",u.name||"") + field("Email","u_email",u.email||"",id?"disabled":"","email") + roleSel
    + field(id?"Parolă nouă (opțional)":"Parolă","u_pass","","","password"),
    function(){
      var body={ name:el("u_name").value, email:el("u_email").value, role:el("u_role").value, password:el("u_pass").value||undefined };
      var pr = id ? api("PUT","/api/users/"+id,body) : api("POST","/api/users",body);
      pr.then(function(){ closeModal(); toast("Salvat"); go("users"); }).catch(function(e){ toast(e.message,"bad"); });
    });
};

/* ---------------- Parteneri ---------------- */
var partnerFilter = "";
VIEWS.partners = function(){
  var addBtn = can("operator") ? '<button onclick="partnerForm()">+ Partener</button>' : '';
  var tabs = '<div class="toolbar">'+filterTab("partnerFilter","","Toți","loadPartners")
    + filterTab("partnerFilter","supplier","Furnizori","loadPartners")
    + filterTab("partnerFilter","customer","Clienți","loadPartners")+'</div>';
  setMain(topbar("Parteneri", addBtn) + tabs + '<div class="card" id="ptn">…</div>');
  loadPartners();
};
window.loadPartners = function(){
  api("GET","/api/partners"+(partnerFilter?("?type="+partnerFilter):"")).then(function(d){
    cache.partners=d.partners;
    var rows=d.partners.map(function(p){
      return '<tr><td><b>'+esc(p.name)+'</b></td><td><span class="pill mut">'+(p.type==="supplier"?"furnizor":"client")+'</span></td>'
        +'<td>'+esc(p.email||"—")+'</td><td>'+esc(p.phone||"—")+'</td>'
        +'<td class="right">'+(can("operator")?'<button class="ghost sm" onclick="partnerForm('+p.id+')">Edit</button>':'')+'</td></tr>';
    }).join("");
    el("ptn").innerHTML='<table><thead><tr><th>Nume</th><th>Tip</th><th>Email</th><th>Telefon</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=5 class="muted center">Niciun partener</td></tr>')+'</tbody></table>';
  });
};
window.partnerForm = function(id){
  var p = id ? cache.partners.find(function(x){return x.id===id;}) : {type:"supplier"};
  var typeSel='<div class="field"><label>Tip</label><select id="pt_type">'
    +'<option value="supplier"'+(p.type==="supplier"?' selected':'')+'>Furnizor</option>'
    +'<option value="customer"'+(p.type==="customer"?' selected':'')+'>Client</option></select></div>';
  modal((id?"Editează":"Adaugă")+" partener",
    typeSel + field("Nume","pt_name",p.name||"") + field("Email","pt_email",p.email||"","","email")
    + field("Telefon","pt_phone",p.phone||"") + field("Adresă","pt_addr",p.address||""),
    function(){
      var body={ type:el("pt_type").value, name:el("pt_name").value, email:el("pt_email").value, phone:el("pt_phone").value, address:el("pt_addr").value };
      var pr = id ? api("PUT","/api/partners/"+id,body) : api("POST","/api/partners",body);
      pr.then(function(){ closeModal(); toast("Salvat"); loadPartners(); }).catch(function(e){ toast(e.message,"bad"); });
    });
};

/* ---------------- Comenzi ---------------- */
var orderFilter = "";
VIEWS.orders = function(){
  var addBtn = can("operator") ? '<button onclick="orderForm()">+ Comandă</button>' : '';
  var tabs = '<div class="toolbar">'+filterTab("orderFilter","","Toate","loadOrders")
    + filterTab("orderFilter","inbound","Intrări","loadOrders")
    + filterTab("orderFilter","outbound","Ieșiri","loadOrders")+'</div>';
  setMain(topbar("Comenzi", addBtn) + tabs + '<div class="card" id="ord">…</div>');
  loadOrders();
};
window.loadOrders = function(){
  api("GET","/api/orders"+(orderFilter?("?type="+orderFilter):"")).then(function(d){
    var rows=d.orders.map(function(o){
      return '<tr><td><b>'+esc(o.code)+'</b></td><td><span class="pill mut">'+(o.type==="inbound"?"intrare":"ieșire")+'</span></td>'
        +'<td>'+esc(o.partner_name||"—")+'</td><td class="right">'+esc(o.total_qty)+'</td><td>'+orderStatusPill(o.status)+'</td>'
        +'<td class="muted">'+esc(String(o.created_at).slice(0,10))+'</td>'
        +'<td class="right"><button class="ghost sm" onclick="orderDetail('+o.id+')">Vezi</button></td></tr>';
    }).join("");
    el("ord").innerHTML='<table><thead><tr><th>Cod</th><th>Tip</th><th>Partener</th><th class="right">Cant.</th><th>Status</th><th>Data</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=7 class="muted center">Nicio comandă</td></tr>')+'</tbody></table>';
  });
};
window.orderDetail = function(id){
  api("GET","/api/orders/"+id).then(function(d){
    var o=d.order;
    var lines='<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">Cant.</th><th class="right">Făcut</th></tr></thead><tbody>'
      + d.lines.map(function(l){ return '<tr><td><b>'+esc(l.sku)+'</b></td><td>'+esc(l.product_name)+'</td><td class="right">'+esc(l.quantity)+'</td><td class="right">'+esc(l.qty_done)+'</td></tr>'; }).join("")
      + '</tbody></table>';
    var actions='';
    if(can("operator") && o.status!=="completed" && o.status!=="cancelled"){
      actions='<div class="field" style="margin-top:14px"><label>Finalizează în locația</label>'
        + '<div class="row"><select id="od_loc" style="flex:1"></select>'
        + '<button onclick="completeOrder('+o.id+')">'+(o.type==="inbound"?"Recepționează":"Expediază (picking)")+'</button></div></div>'
        + '<div class="row" style="margin-top:8px">'
        + (o.status==="draft"?'<button class="ghost sm" onclick="orderStatus('+o.id+',\\'confirmed\\')">Confirmă</button>':'')
        + '<button class="ghost sm" onclick="orderStatus('+o.id+',\\'cancelled\\')">Anulează</button>'
        + '<button class="danger sm" onclick="deleteOrder('+o.id+')">Șterge</button></div>';
    }
    modal("Comanda "+esc(o.code)+" — "+orderStatusPill(o.status),
      '<div class="muted" style="margin-bottom:10px">'+(o.type==="inbound"?"Intrare de la furnizor":"Ieșire către client")+(o.partner_name?(" · "+esc(o.partner_name)):"")+'</div>'
      + lines + actions, null);
    // ascunde butonul default de salvare al modalului
    var sv=el("modalSave"); if(sv) sv.style.display="none";
    if(el("od_loc")){
      api("GET","/api/locations").then(function(r){
        el("od_loc").innerHTML=r.locations.filter(function(l){return l.active;}).map(function(l){return '<option value="'+l.id+'">'+esc(l.code)+'</option>';}).join("");
      });
    }
  });
};
window.completeOrder = function(id){
  var loc=el("od_loc"); if(!loc) return;
  api("POST","/api/orders/"+id+"/complete",{ location_id:Number(loc.value) })
    .then(function(){ closeModal(); toast("Comandă finalizată — stoc actualizat"); loadOrders(); })
    .catch(function(e){ toast(e.message,"bad"); });
};
window.orderStatus = function(id,status){
  api("PUT","/api/orders/"+id+"/status",{status:status}).then(function(){ closeModal(); toast("Actualizat"); loadOrders(); }).catch(function(e){ toast(e.message,"bad"); });
};
window.deleteOrder = function(id){
  api("DELETE","/api/orders/"+id).then(function(){ closeModal(); toast("Ștearsă"); loadOrders(); }).catch(function(e){ toast(e.message,"bad"); });
};
var orderLines=[];
window.orderForm = function(){
  orderLines=[{product_id:"",quantity:1}];
  setMain(topbar("Comandă nouă")
    + '<div class="card" style="padding:20px;max-width:640px"><div id="ofmsg"></div>'
    + '<div class="row"><div style="flex:1"><label>Tip</label><select id="of_type" onchange="ofLoadPartners()"><option value="inbound">Intrare (de la furnizor)</option><option value="outbound">Ieșire (către client)</option></select></div>'
    + '<div style="flex:1"><label>Partener</label><select id="of_partner"></select></div></div>'
    + '<div class="field" style="margin-top:12px"><label>Notă</label><input id="of_note"></div>'
    + '<h2 style="margin-top:8px">Linii comandă</h2><div id="of_lines"></div>'
    + '<button class="ghost sm" onclick="ofAddLine()" style="margin-top:8px">+ Adaugă linie</button>'
    + '<div style="margin-top:16px"><button onclick="ofSubmit()">Creează comanda</button></div></div>');
  Promise.all([api("GET","/api/products"),ofLoadPartners()]).then(function(r){ cache.ofProducts=r[0].products.filter(function(p){return p.active;}); ofRenderLines(); });
};
window.ofLoadPartners = function(){
  var type=el("of_type")?el("of_type").value:"inbound";
  var want = type==="inbound"?"supplier":"customer";
  return api("GET","/api/partners?type="+want).then(function(d){
    if(el("of_partner")) el("of_partner").innerHTML='<option value="">— fără —</option>'+d.partners.map(function(p){return '<option value="'+p.id+'">'+esc(p.name)+'</option>';}).join("");
  });
};
window.ofAddLine = function(){ orderLines.push({product_id:"",quantity:1}); ofRenderLines(); };
window.ofRemoveLine = function(i){ orderLines.splice(i,1); if(!orderLines.length) orderLines.push({product_id:"",quantity:1}); ofRenderLines(); };
function ofRenderLines(){
  var prods=cache.ofProducts||[];
  el("of_lines").innerHTML=orderLines.map(function(l,i){
    var opts=prods.map(function(p){return '<option value="'+p.id+'"'+(String(l.product_id)===String(p.id)?' selected':'')+'>'+esc(p.sku+" — "+p.name)+'</option>';}).join("");
    return '<div class="row" style="margin-bottom:8px;align-items:flex-end">'
      +'<div style="flex:3"><select onchange="orderLines['+i+'].product_id=this.value"><option value="">— produs —</option>'+opts+'</select></div>'
      +'<div style="flex:1"><input type="number" min="1" value="'+esc(l.quantity)+'" onchange="orderLines['+i+'].quantity=Number(this.value)"></div>'
      +'<button class="ghost sm" onclick="ofRemoveLine('+i+')">✕</button></div>';
  }).join("");
}
window.ofSubmit = function(){
  var type=el("of_type").value;
  var lines=orderLines.filter(function(l){return l.product_id && Number(l.quantity)>0;}).map(function(l){return {product_id:Number(l.product_id),quantity:Number(l.quantity)};});
  if(!lines.length){ el("ofmsg").innerHTML='<div class="pill bad" style="margin-bottom:12px">Adaugă cel puțin o linie validă</div>'; return; }
  var body={ type:type, partner_id:el("of_partner").value?Number(el("of_partner").value):null, note:el("of_note").value, lines:lines };
  api("POST","/api/orders",body).then(function(){ toast("Comandă creată"); go("orders"); }).catch(function(e){ el("ofmsg").innerHTML='<div class="pill bad" style="margin-bottom:12px">'+esc(e.message)+'</div>'; });
};

/* ---------------- Rapoarte ---------------- */
VIEWS.reports = function(){
  setMain(topbar("Rapoarte")
    + '<div class="grid" style="grid-template-columns:1fr 1fr">'
    + '<div class="card" style="padding:18px"><h2>Stoc pe categorie</h2><div id="r_cat">…</div></div>'
    + '<div class="card" style="padding:18px"><h2>Top produse (rulaj 30 zile)</h2><div id="r_top">…</div></div>'
    + '</div>'
    + '<div class="card" style="padding:18px;margin-top:16px"><div class="toolbar"><h2 style="margin:0;flex:1">Produse sub prag</h2><button class="ghost sm" onclick="downloadCsv(\\'/api/reports/low-stock/export\\',\\'sub-prag.csv\\')">Export CSV</button></div><div id="r_low">…</div></div>'
    + '<div class="card" style="padding:18px;margin-top:16px"><h2>Mișcări pe zi (30 zile)</h2><div id="r_mov">…</div></div>');
  api("GET","/api/reports/stock-by-category").then(function(d){ el("r_cat").innerHTML=catBars(d.rows.map(function(r){return {category:r.category,units:r.units};})); });
  api("GET","/api/reports/top-products").then(function(d){
    el("r_top").innerHTML = d.rows.length ? '<table><tbody>'+d.rows.map(function(r){return '<tr><td><b>'+esc(r.sku)+'</b> '+esc(r.name)+'</td><td class="right">'+esc(r.volume)+'</td></tr>';}).join("")+'</tbody></table>' : '<div class="muted">Nicio mișcare</div>';
  });
  api("GET","/api/reports/low-stock").then(function(d){
    el("r_low").innerHTML = d.rows.length ? '<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">Stoc</th><th class="right">Prag</th></tr></thead><tbody>'+d.rows.map(function(r){return '<tr><td><b>'+esc(r.sku)+'</b></td><td>'+esc(r.name)+'</td><td class="right"><span class="pill bad">'+esc(r.total)+'</span></td><td class="right">'+esc(r.reorder_point)+'</td></tr>';}).join("")+'</tbody></table>' : '<div class="muted">Totul peste prag ✔</div>';
  });
  api("GET","/api/reports/movements-by-period?days=30").then(function(d){
    el("r_mov").innerHTML = d.rows.length ? '<table><thead><tr><th>Zi</th><th>Tip</th><th class="right">Intrări</th><th class="right">Ieșiri</th><th class="right">Mișcări</th></tr></thead><tbody>'+d.rows.map(function(r){return '<tr><td>'+esc(r.day)+'</td><td><span class="pill mut">'+esc(r.type)+'</span></td><td class="right">'+esc(r.qty_in)+'</td><td class="right">'+esc(r.qty_out)+'</td><td class="right">'+esc(r.moves)+'</td></tr>';}).join("")+'</tbody></table>' : '<div class="muted">Nicio mișcare</div>';
  });
};

/* ---------------- Coduri de bare (Code128B) ---------------- */
var C128 = ["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];
function drawBarcode(canvas,text){
  var codes=[104], sum=104;
  for(var i=0;i<text.length;i++){ var v=text.charCodeAt(i)-32; if(v<0||v>94) v=0; codes.push(v); sum+=v*(i+1); }
  codes.push(sum%103); codes.push(106);
  var pat=""; codes.forEach(function(c){ pat+=C128[c]; });
  var mod=2, quiet=10, H=70;
  var W=quiet*2; for(var j=0;j<pat.length;j++) W+=parseInt(pat[j],10)*mod;
  canvas.width=W; canvas.height=H+18;
  var ctx=canvas.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H+18);
  var x=quiet, bar=true;
  for(var k=0;k<pat.length;k++){ var w=parseInt(pat[k],10)*mod; if(bar){ ctx.fillStyle="#000"; ctx.fillRect(x,0,w,H); } x+=w; bar=!bar; }
  ctx.fillStyle="#000"; ctx.font="12px monospace"; ctx.textAlign="center"; ctx.fillText(text, W/2, H+14);
}
window.showBarcode = function(code,label){
  modal("Cod de bare — "+esc(label||code),
    '<div class="center" style="background:#fff;padding:12px;border-radius:8px"><canvas id="bc_canvas"></canvas></div>'
    +'<div class="row" style="justify-content:center;margin-top:10px"><button class="ghost sm" onclick="printBarcode()">Printează</button></div>', null);
  var sv=el("modalSave"); if(sv) sv.style.display="none";
  setTimeout(function(){ var c=el("bc_canvas"); if(c) drawBarcode(c, String(code)); }, 30);
};
window.printBarcode = function(){
  var c=el("bc_canvas"); if(!c) return;
  var w=window.open("","_blank"); w.document.write('<img src="'+c.toDataURL()+'" onload="window.print();window.close()">'); w.document.close();
};

/* ---------------- Coduri QR + scanare cameră (Etapa 3) ---------------- */
function appOrigin(){ return location.origin + location.pathname.replace(/\\/$/,""); }

window.showQR = function(data, label){
  modal("Cod QR — "+esc(label||""),
    '<div class="center" id="qr_box" style="background:#fff;padding:14px;border-radius:8px;min-height:140px;display:flex;align-items:center;justify-content:center">Se generează…</div>'
    + '<div class="muted center" style="margin-top:8px;font-size:11.5px;word-break:break-all">'+esc(data)+'</div>'
    + '<div class="row" style="justify-content:center;margin-top:10px"><button class="ghost sm" onclick="printEl(\\'qr_box\\')">Printează</button></div>', null);
  var sv=el("modalSave"); if(sv) sv.style.display="none";
  fetch(API+"/api/qr?data="+encodeURIComponent(data), { headers: token?{Authorization:"Bearer "+token}:{} })
    .then(function(r){ if(!r.ok) throw new Error("qr"); return r.text(); })
    .then(function(svg){ var b=el("qr_box"); if(b){ b.innerHTML=svg; var s=b.querySelector("svg"); if(s){ s.style.width="220px"; s.style.height="220px"; s.removeAttribute("width"); s.removeAttribute("height"); } } })
    .catch(function(){ var b=el("qr_box"); if(b) b.textContent="Eroare la generarea codului QR"; });
};
window.printEl = function(id){
  var e=el(id); if(!e) return;
  var w=window.open("","_blank"); if(!w) return;
  w.document.write('<div style="text-align:center;margin-top:40px">'+e.innerHTML+'</div>');
  w.document.write('<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();window.close();},150)}</scr'+'ipt>');
  w.document.close();
};

// Încarcă biblioteca ZXing (o singură dată, lazy)
function ensureZXing(){
  return new Promise(function(resolve,reject){
    if(window.ZXing) return resolve();
    var s=document.createElement("script"); s.src=API+"/vendor/zxing.js";
    s.onload=function(){ window.ZXing ? resolve() : reject(new Error("zxing")); };
    s.onerror=function(){ reject(new Error("zxing")); };
    document.head.appendChild(s);
  });
}
// Scanare cu camera — universal (ZXing), overlay propriu (poate sta și peste alt modal)
window.scanCamera = function(onResult){
  var ov=document.createElement("div"); ov.className="modal-bg"; ov.id="scanOverlay"; ov.style.zIndex="60";
  ov.innerHTML='<div class="card modal"><h2>📷 Scanează cod</h2>'
    + '<video id="scanvid" style="width:100%;border-radius:8px;background:#000;max-height:60vh" muted autoplay playsinline></video>'
    + '<div class="muted center" id="scanmsg" style="margin-top:8px">Se încarcă scannerul…</div>'
    + '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="ghost" onclick="closeScan()">Închide</button></div></div>';
  document.body.appendChild(ov);
  ov.onclick=function(e){ if(e.target===ov) closeScan(); };
  ensureZXing().then(function(){
    var v=el("scanvid"); if(!v) return;
    var msg=el("scanmsg"); if(msg) msg.textContent="Îndreaptă camera spre codul de bare sau QR";
    var reader=new ZXing.BrowserMultiFormatReader(); window._zxingReader=reader;
    var done=false;
    var cb=function(result){ if(done||!result) return; done=true; var val=result.getText(); closeScan(); if(onResult) onResult(val); };
    var p = reader.decodeFromConstraints({ video:{ facingMode:"environment" } }, v, cb);
    if(p && p.catch) p.catch(function(){ closeScan(); toast("Nu am acces la cameră","bad"); });
  }).catch(function(){ closeScan(); toast("Nu s-a putut încărca scannerul","bad"); });
};
window.closeScan = function(){
  if(window._zxingReader){ try{ window._zxingReader.reset(); }catch(e){} window._zxingReader=null; }
  if(window._scanStream){ try{ window._scanStream.getTracks().forEach(function(t){t.stop();}); }catch(e){} window._scanStream=null; }
  var o=el("scanOverlay"); if(o) o.remove();
};

// Scanează un cod și îl pune într-un câmp (ex: cod de bare la adăugare produs)
window.scanInto = function(fieldId, thenLookup){
  scanCamera(function(t){
    var m=String(t).match(/[#&?]sku=([^&]+)/);
    var val=m?decodeURIComponent(m[1]):String(t);
    var e=el(fieldId); if(e){ e.value=val; }
    toast("Scanat: "+val);
    if(thenLookup && fieldId==="p_barcode") barcodeLookup();
  });
};

// Identifică produsul după codul de bare, din baze de date online
window.barcodeLookup = function(){
  var inp=el("p_barcode"); if(!inp) return;
  var code=(inp.value||"").trim();
  if(!code){ toast("Scanează sau tastează un cod de bare întâi","bad"); return; }
  toast("Caut produsul online…");
  api("GET","/api/barcode-lookup?code="+encodeURIComponent(code)).then(function(d){
    if(d.found){
      if(el("p_name")) el("p_name").value=d.name;
      if(d.category && el("p_category") && !el("p_category").value) el("p_category").value=d.category;
      toast("Identificat: "+d.name+(d.source?(" ("+d.source+")"):""));
    } else {
      toast("Produsul nu a fost găsit în bazele online","bad");
    }
  }).catch(function(e){ toast(e.message||"Eroare la căutare","bad"); });
};

// Interpretează un cod scanat: URL cu loc=/sku=, altfel caută produs
function handleScanResult(text){
  var t=String(text||"");
  var m=t.match(/[#&?]loc=([^&]+)/); if(m){ locationView(decodeURIComponent(m[1])); return; }
  m=t.match(/[#&?]sku=([^&]+)/); if(m){ productView(decodeURIComponent(m[1])); return; }
  productView(t); // caută după SKU / cod de bare
}

// Deep-link din hash (#loc=... / #sku=...)
function handleHash(){
  var h=(location.hash||"").replace(/^#/,"");
  var m=h.match(/(?:^|&)loc=([^&]+)/); if(m){ locationView(decodeURIComponent(m[1])); return true; }
  m=h.match(/(?:^|&)sku=([^&]+)/); if(m){ productView(decodeURIComponent(m[1])); return true; }
  return false;
}

/* ---------------- Vederi deep-link: locație & produs ---------------- */
window.locationView = function(code){
  view=""; renderApp();
  var actions = can("operator")
    ? '<button class="ghost" onclick="opFrom(\\'receive\\',\\''+esc(code)+'\\')">Recepție aici</button> <button class="ghost" onclick="opFrom(\\'ship\\',\\''+esc(code)+'\\')">Expediere aici</button>'
    : '';
  setMain(topbar("📍 Locație "+esc(code), actions + ' <button class="ghost" onclick="go(\\'stock\\')">Tot stocul</button>')
    + '<div class="card" id="lv">…</div>');
  api("GET","/api/inventory/stock").then(function(d){
    var rows=d.stock.filter(function(s){ return s.location_code===code; });
    var body=rows.map(function(s){
      return '<tr><td><b>'+esc(s.sku)+'</b></td><td>'+esc(s.product_name)+'</td><td class="right">'+esc(s.quantity)+' '+esc(s.unit||"")+'</td>'
        +'<td class="right"><button class="ghost sm" onclick="productView(\\''+esc(s.sku)+'\\')">Vezi</button></td></tr>';
    }).join("");
    el("lv").innerHTML='<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">Stoc</th><th></th></tr></thead><tbody>'+(body||'<tr><td colspan=4 class="muted center">Nicio marfă în această locație</td></tr>')+'</tbody></table>';
  });
};
window.productView = function(query){
  view=""; renderApp();
  setMain(topbar("🔎 Produs "+esc(query)) + '<div id="pv">…</div>');
  api("GET","/api/products?q="+encodeURIComponent(query)).then(function(d){
    var q=String(query).toLowerCase();
    var p=(d.products||[]).find(function(x){ return String(x.sku).toLowerCase()===q || String(x.barcode||"").toLowerCase()===q; }) || d.products[0];
    if(!p){ el("pv").innerHTML='<div class="card" style="padding:18px"><div class="pill bad">Produs negăsit: '+esc(query)+'</div></div>'; return; }
    var head='<div class="card" style="padding:18px;margin-bottom:16px"><div class="row" style="justify-content:space-between;align-items:center">'
      +'<div><div style="font-size:18px;font-weight:700">'+esc(p.name)+'</div><div class="muted">SKU '+esc(p.sku)+(p.category?(" · "+esc(p.category)):"")+'</div></div>'
      +'<div class="row"><button class="ghost sm" onclick="showBarcode(\\''+esc(p.barcode||p.sku)+'\\',\\''+esc(p.sku)+'\\')">⌗ Bare</button>'
      +'<button class="ghost sm" onclick="showQR(appOrigin()+\\'/#sku=\\'+encodeURIComponent(\\''+esc(p.sku)+'\\'),\\''+esc(p.sku)+'\\')">▦ QR</button></div></div></div>';
    el("pv").innerHTML=head+'<div class="grid" style="grid-template-columns:1fr 1fr"><div class="card" style="padding:18px"><h2>Stoc pe locație</h2><div id="pv_stock">…</div></div><div class="card" style="padding:18px"><h2>Ultimele mișcări</h2><div id="pv_mov">…</div></div></div>';
    api("GET","/api/inventory/stock?product_id="+p.id).then(function(s){
      el("pv_stock").innerHTML = s.stock.length ? '<table><tbody>'+s.stock.map(function(x){return '<tr><td><b>'+esc(x.location_code)+'</b></td><td class="right">'+esc(x.quantity)+'</td></tr>';}).join("")+'</tbody></table>' : '<div class="muted">Fără stoc</div>';
    });
    api("GET","/api/inventory/movements?limit=200").then(function(mv){
      var rows=mv.movements.filter(function(m){return m.sku===p.sku;}).slice(0,10);
      el("pv_mov").innerHTML = rows.length ? '<table><tbody>'+rows.map(function(m){return '<tr><td class="muted">'+esc(String(m.created_at).slice(0,16))+'</td><td>'+esc(m.location_code)+'</td><td class="right">'+(m.quantity>0?'<span class="pill good">+'+m.quantity+'</span>':'<span class="pill bad">'+m.quantity+'</span>')+'</td></tr>';}).join("")+'</tbody></table>' : '<div class="muted">Nicio mișcare</div>';
    });
  });
};

/* ---------------- UI helpers ---------------- */
function field(label,id,val,attr,type){ return '<div class="field"><label>'+esc(label)+'</label><input id="'+id+'" type="'+(type||"text")+'" value="'+esc(val)+'" '+(attr||"")+'></div>'; }
function filterTab(varName,value,label){
  var active=(window[varName]||"")===value;
  var viewName=varName.replace("Filter","")+"s";
  return '<button class="sm'+(active?'':' ghost')+'" onclick="window.'+varName+'=\\''+value+'\\';go(\\''+viewName+'\\')">'+esc(label)+'</button>';
}
window.downloadCsv = function(path, filename){
  fetch(API+path,{ headers: token?{Authorization:"Bearer "+token}:{} }).then(function(r){
    if(!r.ok) throw new Error("Export eșuat"); return r.blob();
  }).then(function(blob){
    var url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }).catch(function(e){ toast(e.message,"bad"); });
};
function modal(title, inner, onSave){
  var bg=document.createElement("div"); bg.className="modal-bg"; bg.id="modalBg";
  bg.innerHTML='<div class="card modal"><h2>'+esc(title)+'</h2><div id="modalBody">'+inner+'</div>'
    +'<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="ghost" onclick="closeModal()">Anulează</button><button id="modalSave">Salvează</button></div></div>';
  document.body.appendChild(bg);
  document.getElementById("modalSave").onclick=onSave;
  bg.onclick=function(e){ if(e.target===bg) closeModal(); };
}
window.closeModal=function(){
  if(window._scanStream){ try{ window._scanStream.getTracks().forEach(function(t){t.stop();}); }catch(e){} window._scanStream=null; }
  if(window._zxingReader){ try{ window._zxingReader.reset(); }catch(e){} window._zxingReader=null; }
  var m=el("modalBg"); if(m) m.remove();
};

/* ---------------- Boot ---------------- */
window.onhashchange=function(){ if(me) handleHash(); };
if(token){
  api("GET","/api/auth/me").then(function(d){ me=d.user; renderApp(); if(!handleHash()) go("dashboard"); })
    .catch(function(){ logout(); });
} else { renderLogin(); }
</script>
</body>
</html>`;
}
