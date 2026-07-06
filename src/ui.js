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
    .then(function(d){ token=d.token; me=d.user; localStorage.setItem("wms_token",token); renderApp(); go("dashboard"); })
    .catch(function(err){ renderLogin(err.message); });
  return false;
};

/* ---------------- App shell ---------------- */
var NAV = [
  ["dashboard","Dashboard","viewer"], ["stock","Stoc","viewer"], ["products","Produse","viewer"],
  ["locations","Locații","viewer"], ["receive","Recepție","operator"], ["ship","Expediere","operator"],
  ["transfer","Transfer","operator"], ["movements","Mișcări","viewer"], ["users","Utilizatori","admin"]
];

function renderApp(){
  var nav = NAV.filter(function(n){ return can(n[2]); }).map(function(n){
    return '<a class="nav'+(view===n[0]?' active':'')+'" href="#" onclick="go(\\''+n[0]+'\\');return false">'+n[1]+'</a>';
  }).join("");
  document.getElementById("root").innerHTML =
    '<div id="app"><aside>'
    + '<div class="logo" style="padding:6px 12px 14px">W<b>MS</b></div>'
    + nav
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
    var kpis = '<div class="kpis">'
      + kpi(k.products,"Produse active")
      + kpi(k.locations,"Locații")
      + kpi(k.total_units,"Unități în stoc")
      + kpi(k.low_stock,"Sub prag stoc", k.low_stock>0?"bad":"good")
      + '</div>';
    var chart = '<div class="card" style="padding:18px"><h2>Activitate ultimele 7 zile</h2>'
      + '<canvas id="chart" height="220"></canvas>'
      + '<div class="row" style="gap:18px;margin-top:10px;font-size:12.5px">'
      + '<span><span class="pill good">■</span> Intrări</span><span><span class="pill bad">■</span> Ieșiri</span></div></div>';
    el("dash").innerHTML = kpis + chart;
    drawChart(d.activity||[]);
  }).catch(function(e){ el("dash").innerHTML='<div class="pill bad">'+esc(e.message)+'</div>'; });
};
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
        + '<td class="right">'+(can("operator")?'<button class="ghost sm" onclick="productForm('+p.id+')">Edit</button>':'')+'</td></tr>';
    }).join("");
    el("ptbl").innerHTML = '<table><thead><tr><th>SKU</th><th>Nume</th><th>Categorie</th><th class="right">Prag</th><th>UM</th><th>Status</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=7 class="muted center">Niciun produs</td></tr>')+'</tbody></table>';
  });
};
window.productForm = function(id){
  var p = id ? cache.products.find(function(x){return x.id===id;}) : {unit:"buc",reorder_point:0,active:1};
  modal((id?"Editează":"Adaugă")+" produs",
    field("SKU","p_sku",p.sku||"",id?"disabled":"")
    + field("Cod de bare","p_barcode",p.barcode||"")
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
        + '<td class="right">'+(can("operator")?'<button class="ghost sm" onclick="locationForm('+l.id+')">Edit</button>':'')+'</td></tr>';
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
    el("op_prod").innerHTML = prods.map(function(p){return '<option value="'+p.id+'">'+esc(p.sku+" — "+p.name)+'</option>';}).join("");
    var locOpts = locs.map(function(l){return '<option value="'+l.id+'">'+esc(l.code)+'</option>';}).join("");
    if(type==="transfer"){ el("op_from").innerHTML=locOpts; el("op_to").innerHTML=locOpts; }
    else el("op_loc").innerHTML=locOpts;
  });
}
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

/* ---------------- UI helpers ---------------- */
function field(label,id,val,attr,type){ return '<div class="field"><label>'+esc(label)+'</label><input id="'+id+'" type="'+(type||"text")+'" value="'+esc(val)+'" '+(attr||"")+'></div>'; }
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
window.closeModal=function(){ var m=el("modalBg"); if(m) m.remove(); };

/* ---------------- Boot ---------------- */
if(token){
  api("GET","/api/auth/me").then(function(d){ me=d.user; renderApp(); go("dashboard"); })
    .catch(function(){ logout(); });
} else { renderLogin(); }
</script>
</body>
</html>`;
}
