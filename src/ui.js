// Interfața web (SPA vanilla, fără dependențe externe) servită de Worker.
// Notă: în scriptul client evităm template literals ca să nu intre în conflict
// cu template literal-ul exterior din acest fișier.

export function renderUI() {
  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#2f6df6">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="icon" href="/icon-192.png">
<link rel="apple-touch-icon" href="/icon-192.png">
<title>WSD Logistics — Depozitare & Transport Marfă</title>
<style>
  /* Temă fixă, fundal alb (nu urmează dark mode-ul sistemului) */
  :root{
    color-scheme: light;
    --bg:#ffffff; --panel:#ffffff; --panel-2:#f4f6fb; --text:#1a2233; --muted:#6b7688;
    --border:#e3e8f0; --brand:#2f6df6; --brand-2:#1e51d6; --good:#12a150; --warn:#e0902a; --bad:#d64545;
    --shadow:0 1px 3px rgba(20,30,60,.08),0 8px 24px rgba(20,30,60,.06);
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
  #login{min-height:100vh;display:grid;grid-template-columns:1.1fr .9fr}
  .login-hero{position:relative;display:flex;align-items:center;padding:48px;color:#fff;overflow:hidden;
    background:linear-gradient(130deg, rgba(9,20,34,.86) 0%, rgba(13,35,80,.62) 55%, rgba(24,52,110,.40) 100%), url('/assets/login-bg.png') center/cover no-repeat, #0b1a2b;}
  .login-hero::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:38px 38px;opacity:.5;pointer-events:none}
  .login-hero-inner{position:relative;max-width:460px;z-index:1}
  .login-hero h1{font-size:34px;line-height:1.15;margin:16px 0 12px;letter-spacing:-.02em;color:#fff}
  .login-hero p{font-size:16px;line-height:1.6;opacity:.92;margin:0}
  .login-feats{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:13px}
  .login-feats li{display:flex;gap:11px;align-items:center;font-size:15px;opacity:.95}
  .login-feats .ic{width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto}
  .login-form{display:grid;place-items:center;padding:24px;background:var(--bg)}
  .login-form .card{padding:32px;width:100%;max-width:380px}
  @media(max-width:860px){ #login{grid-template-columns:1fr} .login-hero{display:none} }
  .site-hero{position:relative;color:#fff;border-radius:16px;overflow:hidden;margin:6px 0 8px;text-align:center;padding:66px 30px;
    background:linear-gradient(120deg, rgba(9,20,34,.80), rgba(15,40,95,.52)), url('/assets/site-hero.png') center/cover no-repeat, #0b1a2b;}
  .site-hero h1{color:#fff} .site-hero p{color:rgba(255,255,255,.92)}
  .gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
  .gallery figure{margin:0;border-radius:12px;overflow:hidden;position:relative;box-shadow:var(--shadow)}
  .gallery img{width:100%;height:190px;object-fit:cover;display:block}
  .gallery figcaption{position:absolute;left:0;right:0;bottom:0;padding:10px 12px;color:#fff;font-size:13px;font-weight:600;background:linear-gradient(transparent, rgba(0,0,0,.65))}
  /* Navbar flotant (site public) — logo + iconițe SVG + buton login integrate */
  .fnav-wrap{padding:6px 0 0}
  .fnav-band{background:#e7eafb;border-radius:30px;padding:32px 16px 16px;display:flex}
  .fnav{display:flex;align-items:center;justify-content:space-between;gap:4px;flex:1;background:#fff;border-radius:46px;box-shadow:0 10px 26px rgba(20,30,60,.10),0 2px 8px rgba(20,30,60,.06);padding:9px 16px;max-width:100%}
  .fnav-logo{display:flex;align-items:center;padding:0 12px 0 8px;margin-right:4px;border-right:1px solid var(--border);cursor:pointer}
  .fnav-logo img{height:30px;display:block}
  .fitem{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 14px;color:var(--muted);font-weight:600;font-size:12px;text-decoration:none;cursor:pointer}
  .fitem .fic{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:transparent;transition:transform .28s cubic-bezier(.34,1.56,.64,1),background .25s,color .25s,box-shadow .25s}
  .fitem .fic svg{width:22px;height:22px}
  .fitem .flbl{transition:transform .28s cubic-bezier(.34,1.56,.64,1)}
  .fitem.active{color:var(--brand)}
  .fitem.active .fic{transform:translateY(-34px);background:#fff;color:var(--brand);box-shadow:0 0 0 8px #e7eafb,0 12px 22px rgba(20,30,60,.18)}
  .fitem.active .flbl{transform:translateY(-10px)}
  .flogin{display:flex;align-items:center;gap:8px;background:var(--brand);color:#fff;border-radius:30px;padding:11px 18px;font-weight:600;font-size:13px;cursor:pointer;margin-left:6px}
  .flogin svg{width:18px;height:18px}
  .flogin:hover{background:var(--brand-2)}
  @media(max-width:720px){ .fitem .flbl,.flogin span{display:none} .fnav-logo img{height:26px} .fitem{padding:6px 10px} .flogin{padding:11px 13px} .fitem .fic{width:40px;height:40px} .fitem.active .fic{transform:translateY(-30px)} }
  /* Trust bar sub hero */
  .trustbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:20px 0 6px}
  .trust{display:flex;align-items:center;gap:13px;padding:15px 16px}
  .trust .ti{width:46px;height:46px;border-radius:13px;background:rgba(47,109,246,.10);color:var(--brand);display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .trust .ti svg{width:24px;height:24px}
  .trust b{display:block;font-size:14px;line-height:1.2}
  .trust small{font-size:12px;color:var(--muted)}
  /* Optimizări mobil (site public) */
  @media(max-width:640px){
    .site-hero{padding:40px 18px !important}
    .site-hero h1{font-size:26px !important;line-height:1.22 !important}
    .site-hero p{font-size:14.5px !important}
    .fnav-band{padding:30px 8px 12px !important;border-radius:24px}
    .fnav{padding:8px 8px !important;gap:2px !important;border-radius:40px}
    .fnav-logo{padding:0 6px 0 4px !important;margin-right:2px !important;border-right:none !important}
    .fnav .fic{width:38px !important;height:38px !important}
    .fnav .fic svg{width:20px;height:20px}
    .flogin{padding:10px 12px !important;margin-left:2px !important}
    .trust{padding:13px 14px}
    .gallery img{height:160px}
  }
  .logo{font-weight:800;font-size:20px;letter-spacing:-.02em}
  .logo b{color:var(--brand)}
  /* App shell */
  #app{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
  aside{background:var(--panel);border-right:1px solid var(--border);padding:16px 12px;display:flex;flex-direction:column;gap:4px}
  aside .nav{display:block;padding:9px 12px;border-radius:8px;color:var(--text);font-weight:500}
  aside .nav:hover{background:var(--panel-2)}
  aside .nav.active{background:var(--brand);color:#fff}
  aside details.navgroup{margin:0}
  aside details.navgroup>summary{list-style:none;cursor:pointer;padding:9px 12px;border-radius:8px;color:var(--text);font-weight:500;user-select:none}
  aside details.navgroup>summary::-webkit-details-marker{display:none}
  aside details.navgroup>summary::after{content:"\\25B8";float:right;color:var(--muted);font-size:11px;margin-top:3px}
  aside details.navgroup[open]>summary::after{content:"\\25BE"}
  aside details.navgroup>summary:hover{background:var(--panel-2)}
  aside details.navgroup .nav{padding-left:26px;font-size:13.5px}
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
  details.help{background:var(--panel);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;overflow:hidden}
  details.help summary{cursor:pointer;padding:10px 14px;font-weight:600;font-size:13px;color:var(--brand);list-style:none;user-select:none}
  details.help summary::-webkit-details-marker{display:none}
  details.help summary::before{content:"\\25B8  "}
  details.help[open] summary::before{content:"\\25BE  "}
  details.help .help-body{padding:2px 14px 14px;font-size:13px;color:var(--text);line-height:1.6}
  details.help .help-body ol,details.help .help-body ul{margin:6px 0;padding-left:20px}
  details.help .help-body li{margin:3px 0}
  details.help .help-body b{color:var(--text)}
  @media(max-width:820px){ #app{grid-template-columns:1fr} aside{flex-direction:row;overflow:auto} .kpis{grid-template-columns:repeat(2,1fr)} }
</style>
</head>
<body>
<div id="root"></div>
<script>
"use strict";
if("serviceWorker" in navigator){ window.addEventListener("load", function(){ navigator.serviceWorker.register("/sw.js").catch(function(){}); }); }
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
function logout(){ token=null; me=null; localStorage.removeItem("wms_token"); renderLanding(); }

// După autentificare: portal pentru clienți, aplicația de operare pentru staff
function enterApp(){
  if(me && (me.kind==="client" || me.role==="client")) renderPortal();
  else { renderApp(); if(!handleHash()) go("dashboard"); }
}

window.renderLogin = function(err){
  document.getElementById("root").innerHTML =
    '<div id="login">'
    + '<div class="login-hero"><div class="login-hero-inner">'
    + '<div style="color:#fff;font-size:28px;font-weight:800;letter-spacing:.03em">WSD <span style="font-weight:600;opacity:.85">LOGISTICS</span></div>'
    + '<h1>Depozitare & transport marfă<br>pentru afacerea ta</h1>'
    + '<p>Îți gestionăm și transportăm marfa în siguranță, iar tu vezi stocul online, în timp real.</p>'
    + '<ul class="login-feats">'
    + '<li><span class="ic">📦</span> Depozitare pe paleți, cu locații dedicate</li>'
    + '<li><span class="ic">🔎</span> Vizibilitate în timp real asupra stocului tău</li>'
    + '<li><span class="ic">🚚</span> Recepție, expediere și transport marfă</li>'
    + '</ul></div></div>'
    + '<div class="login-form"><form class="card" onsubmit="return doLogin(event)">'
    + '<img src="/assets/logo.png" alt="WSD Logistics" style="height:52px;margin-bottom:14px">'
    + '<div class="muted" style="margin-bottom:20px">Autentificare în cont</div>'
    + '<div class="field"><label>Email</label><input id="li_email" type="email" autofocus required></div>'
    + '<div class="field"><label>Parolă</label><input id="li_pass" type="password" required></div>'
    + (err?'<div class="pill bad" style="margin-bottom:12px">'+esc(err)+'</div>':'')
    + '<button style="width:100%" type="submit">Intră în cont</button>'
    + '<div class="center" style="margin-top:14px;font-size:12.5px"><a href="#" onclick="renderLanding();return false">← Înapoi la site</a></div>'
    + '</form></div></div>';
};
window.doLogin = function(e){
  e.preventDefault();
  api("POST","/api/auth/login",{ email: el("li_email").value, password: el("li_pass").value })
    .then(function(d){ token=d.token; me=d.user; localStorage.setItem("wms_token",token); enterApp(); })
    .catch(function(err){ renderLogin(err.message); });
  return false;
};

/* ---------------- Site de prezentare (public, multi-pagină) ---------------- */
function svgIcon(n){
  var p={
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    about:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6"/>',
    services:'<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    contact:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    login:'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    shield:'<path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    route:'<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  }[n]||'';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
}
function siteHeader(active){
  var items=[["home","Acasă","home"],["about","Despre noi","about"],["services","Servicii","services"],["contact","Contact","contact"]];
  var nav=items.map(function(it){ return '<a class="fitem'+(active===it[0]?' active':'')+'" onclick="siteGo(\\''+it[0]+'\\');return false"><span class="fic">'+svgIcon(it[2])+'</span><span class="flbl">'+esc(it[1])+'</span></a>'; }).join('');
  return '<div class="fnav-wrap"><div class="fnav-band"><nav class="fnav">'
    +'<div class="fnav-logo" onclick="siteGo(\\'home\\')"><img src="/assets/logo.png" alt="WSD Logistics"></div>'
    + nav
    +'<a class="flogin" onclick="renderLogin()">'+svgIcon("login")+'<span>Autentificare</span></a>'
    +'</nav></div></div>';
}
function siteFooter(){
  return '<footer class="muted center" style="padding:24px 0;font-size:12.5px;border-top:1px solid var(--border)">© WSD Logistics — Depozitare & Transport Marfă · <a href="#" onclick="siteGo(\\'contact\\');return false">Contact</a> · <a href="#" onclick="renderLogin();return false">Autentificare client</a></footer>';
}
function sitePage(active, content){
  document.getElementById("root").innerHTML='<div style="max-width:1080px;margin:0 auto;padding:0 20px">'+siteHeader(active)+content+siteFooter()+'</div>';
  window.scrollTo(0,0);
}
window.siteGo = function(p){ if(p==="about") renderAbout(); else if(p==="services") renderServices(); else if(p==="contact") renderContact(); else renderLanding(); };
function valueCard(ic,t,d){ return '<div class="card" style="padding:20px"><div style="font-size:26px">'+ic+'</div><h3 style="margin:8px 0 5px;font-size:15px">'+esc(t)+'</h3><div class="muted" style="font-size:13px;line-height:1.5">'+esc(d)+'</div></div>'; }
function trustItem(ic,t,s){ return '<div class="card trust"><div class="ti">'+svgIcon(ic)+'</div><div><b>'+esc(t)+'</b><small>'+esc(s)+'</small></div></div>'; }

window.renderAbout = function(){
  sitePage("about",
    '<section class="site-hero" style="padding:56px 30px"><h1 style="font-size:36px;margin:0">Despre WSD Logistics</h1><p style="max-width:680px;margin:14px auto 0">Partenerul tău de încredere în depozitare și transport marfă.</p></section>'
    + '<section style="padding:38px 0"><div class="grid" style="grid-template-columns:1.15fr 1fr;gap:30px;align-items:center">'
    + '<div><h2 style="font-size:26px;margin:0 0 14px">Cine suntem</h2>'
    + '<p class="muted" style="line-height:1.75;font-size:15px">WSD Logistics este un partener de <b>depozitare și transport marfă</b> pentru companiile care vor să-și externalizeze logistica fără compromisuri. Preluăm marfa, o depozităm în siguranță pe paleți în locații dedicate și o livrăm la destinație — rapid și corect.</p>'
    + '<p class="muted" style="line-height:1.75;font-size:15px">Combinăm un depozit bine organizat cu servicii de transport și cu tehnologie modernă: fiecare client are acces la un <b>portal online</b> unde vede în timp real ce stoc are, pe ce locații și ce mișcări s-au făcut cu marfa lui.</p>'
    + '<p class="muted" style="line-height:1.75;font-size:15px">Fie că ai nevoie de spațiu de depozitare pe termen scurt sau de un partener logistic permanent, ne adaptăm nevoilor afacerii tale — de la câțiva paleți până la operațiuni complexe.</p></div>'
    + '<figure style="margin:0;border-radius:14px;overflow:hidden;box-shadow:var(--shadow)"><img src="/assets/site-1.png" style="width:100%;display:block" alt="Depozit WSD Logistics" loading="lazy"></figure>'
    + '</div></section>'
    + '<section class="card" style="padding:30px;margin:12px 0;text-align:center"><h2 style="font-size:22px;margin:0 0 10px">Misiunea noastră</h2><p class="muted" style="max-width:720px;margin:0 auto;line-height:1.7;font-size:15.5px">Îți simplificăm logistica: tu te concentrezi pe vânzări și pe clienții tăi, noi ne ocupăm de depozitare, manipulare și transport — cu <b>transparență totală</b> și marfa mereu sub control.</p></section>'
    + '<section style="padding:26px 0"><h2 style="text-align:center;font-size:24px;margin:0 0 24px">Valorile noastre</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">'
    + valueCard("🛡️","Siguranță","Spații securizate și marfă gestionată cu grijă, de la recepție la livrare.")
    + valueCard("🔎","Transparență","Acces online la stocul tău — vezi oricând ce ai și unde.")
    + valueCard("⏱️","Punctualitate","Recepții, expedieri și transport la timp, de fiecare dată.")
    + valueCard("🤝","Flexibilitate","Soluții adaptate volumului și ritmului afacerii tale.")
    + valueCard("💻","Tehnologie","Sistem WMS modern, coduri de bare și trasabilitate completă.")
    + valueCard("📦","Grijă pentru marfă","Manipulare corectă și organizare riguroasă pe paleți.")
    + '</div></section>');
};
window.renderServices = function(){
  var svc=[
    ["📦","Depozitare pe paleți","Spațiu securizat cu locații dedicate pe rafturi și zone. Fiecare palet e etichetat și urmărit individual, cu evidență exactă a cantităților."],
    ["⬇️","Recepție marfă","Preluăm și verificăm marfa la sosire, o înregistrăm în sistem și o depozităm rapid pe locații — cu confirmare pe cantități."],
    ["⬆️","Expediere & picking","Pregătim comenzile tale (picking de pe paleți), le verificăm și le expediem corect și la timp."],
    ["🚚","Transport marfă","Livrăm marfa la destinație cu flotă proprie/parteneri — de la ultimul kilometru până la transport pe distanțe lungi."],
    ["🔎","Portal client","Cont online unde vezi în timp real stocul tău, pe ce locații se află și fiecare mișcare a mărfii."],
    ["📊","Rapoarte & inventar","Stocuri, mișcări, produse sub prag și export — control complet asupra mărfii tale."],
    ["🏷️","Coduri de bare & trasabilitate","Identificare rapidă prin scanare (EAN/QR) și istoric complet: cine, ce, când."],
    ["🧩","Soluții personalizate","Ne adaptăm fluxul la nevoile tale — de la câțiva paleți la operațiuni complexe."]
  ].map(function(s){ return '<div class="card" style="padding:24px"><div style="font-size:28px">'+s[0]+'</div><h3 style="margin:10px 0 6px;font-size:16px">'+esc(s[1])+'</h3><div class="muted" style="font-size:13.5px;line-height:1.55">'+esc(s[2])+'</div></div>'; }).join("");
  var proc=[
    ["1","Recepție","Primim și verificăm marfa ta."],
    ["2","Depozitare","O așezăm pe paleți, în locații dedicate."],
    ["3","Management stoc","O urmărim în timp real în sistem."],
    ["4","Picking & expediere","Pregătim comenzile la cerere."],
    ["5","Transport & livrare","Ducem marfa la destinație."]
  ].map(function(p){ return '<div class="card" style="padding:18px;text-align:center"><div class="pill" style="background:var(--brand);color:#fff;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;font-weight:700">'+p[0]+'</div><h4 style="margin:10px 0 5px;font-size:14px">'+esc(p[1])+'</h4><div class="muted" style="font-size:12.5px;line-height:1.5">'+esc(p[2])+'</div></div>'; }).join("");
  var ind=["🛒 E-commerce","🏬 Retail & distribuție","🏭 Producători","🌍 Importatori","🍽️ FMCG"].map(function(x){ return '<span class="pill mut" style="padding:8px 14px;font-size:13.5px">'+esc(x)+'</span>'; }).join(" ");
  sitePage("services",
    '<section class="site-hero" style="padding:56px 30px"><h1 style="font-size:36px;margin:0">Serviciile noastre</h1><p style="max-width:680px;margin:14px auto 0">Depozitare, transport marfă și vizibilitate online — logistica ta, completă.</p></section>'
    + '<section style="padding:38px 0"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">'+svc+'</div></section>'
    + '<section style="padding:14px 0 8px"><h2 style="text-align:center;font-size:24px;margin:0 0 24px">Cum funcționează procesul</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">'+proc+'</div></section>'
    + '<section style="padding:26px 0;text-align:center"><h2 style="font-size:22px;margin:0 0 16px">Pentru cine lucrăm</h2><div class="row" style="justify-content:center;flex-wrap:wrap;gap:10px">'+ind+'</div></section>'
    + '<section class="card" style="padding:30px;margin:16px 0;text-align:center"><h2 style="font-size:22px;margin:0 0 8px">Pregătit să externalizezi logistica?</h2><p class="muted" style="margin:0 0 16px">Îți facem o ofertă adaptată nevoilor tale.</p><button onclick="siteGo(\\'contact\\')" style="padding:12px 26px">Cere o ofertă</button></section>');
};
window.renderContact = function(){
  sitePage("contact",
    '<section class="site-hero" style="padding:52px 30px"><h1 style="font-size:34px;margin:0">Contact</h1><p style="max-width:640px;margin:12px auto 0">Scrie-ne și îți facem o ofertă de depozitare.</p></section>'
    + '<section style="padding:34px 0"><div class="grid" style="grid-template-columns:1fr 1.1fr;gap:26px">'
    + '<div class="card" style="padding:24px"><h2 style="font-size:18px;margin:0 0 14px">Date de contact</h2><div style="display:grid;gap:12px;font-size:15px">'
    + '<div>✉️ <a href="mailto:contact@depozit.ro">contact@depozit.ro</a></div>'
    + '<div>📞 <a href="tel:+40700000000">0700 000 000</a></div>'
    + '<div>📍 Adresă depozit (de completat)</div>'
    + '<div>🕒 Luni–Vineri, 08:00–18:00</div>'
    + '</div></div>'
    + '<form class="card" style="padding:24px" onsubmit="return sendContact(event)"><h2 style="font-size:18px;margin:0 0 14px">Trimite-ne un mesaj</h2>'
    + field("Nume","ct_name","")+field("Email","ct_email","","","email")
    + '<div class="field"><label>Mesaj</label><textarea id="ct_msg" rows="4"></textarea></div>'
    + '<button type="submit" style="width:100%">Trimite mesajul</button></form>'
    + '</div></section>');
};
window.sendContact = function(e){
  e.preventDefault();
  var n=el("ct_name").value, em=el("ct_email").value, msg=el("ct_msg").value;
  var subject=encodeURIComponent("Cerere depozitare - "+n);
  var body=encodeURIComponent("Nume: "+n+"\\nEmail: "+em+"\\n\\n"+msg);
  window.location.href="mailto:contact@depozit.ro?subject="+subject+"&body="+body;
  return false;
};

window.renderLanding = function(){
  var svc = [
    ["📦","Depozitare pe paleți","Spațiu securizat, cu locații dedicate și evidență exactă pentru fiecare palet."],
    ["🚚","Transport marfă","Livrăm marfa la destinație — de la ultimul kilometru la distanțe lungi."],
    ["🔄","Recepție & expediere","Preluăm, depozităm și pregătim comenzile tale rapid și corect."],
    ["🔎","Portal online","Vezi în timp real, oricând, fiecare produs pe care îl ai la noi."]
  ].map(function(s){
    return '<div class="card" style="padding:22px"><div style="font-size:30px">'+s[0]+'</div><h3 style="margin:10px 0 6px;font-size:16px">'+s[1]+'</h3><div class="muted" style="font-size:13.5px;line-height:1.5">'+s[2]+'</div></div>';
  }).join("");
  document.getElementById("root").innerHTML =
    '<div style="max-width:1080px;margin:0 auto;padding:0 20px">'
    + siteHeader("home")
    // hero (cu poză de fundal)
    + '<section class="site-hero">'
    + '<h1 style="font-size:40px;line-height:1.15;margin:0 0 14px;letter-spacing:-.02em">Depozitare & transport marfă<br>pentru afacerea ta</h1>'
    + '<p style="font-size:17px;max-width:640px;margin:0 auto 22px;line-height:1.6">WSD Logistics îți gestionează și transportă marfa în siguranță, iar tu vezi stocul online, în timp real. Tu vinzi — de restul ne ocupăm noi.</p>'
    + '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:22px"><span class="pill" style="background:rgba(255,255,255,.16);color:#fff">✓ Vizibilitate 24/7</span><span class="pill" style="background:rgba(255,255,255,.16);color:#fff">✓ Trasabilitate completă</span><span class="pill" style="background:rgba(255,255,255,.16);color:#fff">✓ Fără investiție în spațiu</span></div>'
    + '<div class="row" style="justify-content:center"><button onclick="renderLogin()" style="padding:12px 22px">Autentificare client</button><button class="ghost" style="padding:12px 22px;color:#fff;border-color:rgba(255,255,255,.55)" onclick="siteGo(\\'contact\\')">Cere o ofertă</button></div>'
    + '</section>'
    // trust icons sub hero
    + '<section style="padding:8px 0 0"><div class="trustbar">'
    + trustItem("shield","Marfă în siguranță","Depozit securizat")
    + trustItem("eye","Vizibilitate 24/7","Stoc online, în timp real")
    + trustItem("route","Trasabilitate completă","Fiecare mișcare, urmărită")
    + trustItem("clock","Livrare la timp","Transport rapid și corect")
    + '</div></section>'
    // servicii
    + '<section style="padding:36px 0"><h2 style="text-align:center;font-size:24px;margin:0 0 8px">Serviciile noastre</h2><p class="muted center" style="margin:0 auto 24px;max-width:560px">Tot ce-ți trebuie ca să-ți externalizezi logistica, într-un singur loc.</p>'
    + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">'+svc+'</div></section>'
    // cum functioneaza
    + '<section style="padding:34px 0"><h2 style="text-align:center;font-size:24px;margin:0 0 24px">Cum funcționează</h2>'
    + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">'
    + step(1,"Ne trimiți marfa","O recepționăm și o depozităm pe locații dedicate.")
    + step(2,"O vezi online","Primești un cont și vezi fiecare produs, în timp real.")
    + step(3,"Pregătim comenzile","Facem picking-ul și verificăm marfa la cerere.")
    + step(4,"Transportăm & livrăm","Ducem marfa la destinație, rapid și în siguranță.")
    + '</div></section>'
    // galerie
    + '<section style="padding:20px 0"><h2 style="text-align:center;font-size:24px;margin:0 0 22px">Depozitul nostru</h2>'
    + '<div class="gallery">'
    + '<figure><img src="/assets/login-bg.png" alt="Culoar depozit" loading="lazy"><figcaption>Rafturi & culoare</figcaption></figure>'
    + '<figure><img src="/assets/site-1.png" alt="Marfă pe paleți" loading="lazy"><figcaption>Marfă pe paleți</figcaption></figure>'
    + '<figure><img src="/assets/site-2.png" alt="Recepție marfă" loading="lazy"><figcaption>Recepție & expediere</figcaption></figure>'
    + '</div></section>'
    // contact
    + '<section class="card" style="padding:34px;margin:30px 0;text-align:center">'
    + '<h2 style="font-size:24px;margin:0 0 10px">Externalizează-ți logistica cu WSD Logistics</h2>'
    + '<p class="muted" style="margin:0 0 18px;max-width:560px;margin-left:auto;margin-right:auto">Depozitare, management de stoc și transport marfă — cu marfa ta mereu sub control. Scrie-ne și îți facem o ofertă adaptată.</p>'
    + '<button onclick="siteGo(\\'contact\\')" style="padding:12px 28px">Cere o ofertă</button></section>'
    + siteFooter()
    + '</div>';
};
function step(n,t,d){
  return '<div class="card" style="padding:20px"><div class="pill" style="background:var(--brand);color:#fff;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px">'+n+'</div><h3 style="margin:10px 0 6px;font-size:15px">'+esc(t)+'</h3><div class="muted" style="font-size:13px;line-height:1.5">'+esc(d)+'</div></div>';
}

/* ---------------- Portal client ---------------- */
var pview = "stock";
window.renderPortal = function(){
  var nav = [["stock","Stocul meu"],["pallets","Paleții mei"],["movements","Mișcări"]].map(function(n){
    return '<a class="nav'+(pview===n[0]?' active':'')+'" href="#" onclick="pgo(\\''+n[0]+'\\');return false">'+n[1]+'</a>';
  }).join("");
  document.getElementById("root").innerHTML =
    '<div id="app"><aside>'
    + '<div style="padding:10px 12px 6px"><img src="/assets/logo.png" alt="WSD Logistics" style="width:100%;max-width:150px;display:block"></div>'
    + '<div class="muted" style="padding:0 12px 12px;font-size:12px">Portal client</div>'
    + nav
    + '<div style="flex:1"></div>'
    + '<div class="muted" style="padding:8px 12px;font-size:12px">'+esc(me.name)+'<br><span class="pill mut">client</span></div>'
    + '<button class="ghost sm" onclick="logout()">Ieșire</button>'
    + '</aside><main id="main"></main></div>';
  pgo(pview);
};
window.pgo = function(v){ pview=v; renderPortal(); if(v==="movements") portalMovements(); else if(v==="pallets") portalPallets(); else portalStock(); };

function portalPallets(){
  setMain(topbar("Paleții mei") + '<div id="ppal">…</div>');
  api("GET","/api/portal/pallets").then(function(d){
    if(!d.pallets.length){ el("ppal").innerHTML='<div class="card" style="padding:18px" class="muted">Nu ai paleți în depozit.</div>'; return; }
    el("ppal").innerHTML = d.pallets.map(function(p){
      var items=(p.items||[]).map(function(it){return '<tr><td><b>'+esc(it.sku)+'</b></td><td>'+esc(it.product_name)+'</td><td class="right">'+esc(it.quantity)+' '+esc(it.unit||"")+'</td></tr>';}).join("")
        || '<tr><td colspan=3 class="muted center">Palet gol</td></tr>';
      return '<div class="card" style="padding:16px;margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">'
        +'<div><b style="font-size:15px">📦 '+esc(p.code)+'</b> <span class="muted">'+(p.location_code?('· '+esc(p.location_code)):'· neplasat')+'</span></div>'
        +'<span class="pill mut">'+esc(p.status)+'</span></div>'
        +'<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">Cant.</th></tr></thead><tbody>'+items+'</tbody></table></div>';
    }).join("");
  });
}

function portalStock(){
  var exp = '<button class="ghost" onclick="downloadCsv(\\'/api/portal/export\\',\\'stocul-meu.csv\\')">Export CSV</button>';
  setMain(topbar("Stocul meu", exp) + '<div id="pkpi"></div><div class="card" id="pstock" style="margin-top:14px">…</div>');
  api("GET","/api/portal/summary").then(function(d){
    var s=d.summary;
    el("pkpi").innerHTML='<div class="kpis" style="grid-template-columns:repeat(3,1fr)">'
      + kpi(s.products,"Produse") + kpi(s.units,"Unități în stoc") + kpi(s.locations,"Locații ocupate") + '</div>';
  });
  api("GET","/api/portal/products").then(function(d){
    var rows=d.products.map(function(p){
      var locs=(p.locations||[]).map(function(l){return esc(l.location)+': '+esc(l.qty);}).join(" · ")||'<span class="muted">—</span>';
      return '<tr><td><b>'+esc(p.barcode||p.sku)+'</b></td><td>'+esc(p.name)+'</td><td>'+esc(p.category||"—")+'</td>'
        +'<td class="right"><b>'+esc(p.total)+'</b> '+esc(p.unit||"")+'</td><td style="font-size:12.5px">'+locs+'</td></tr>';
    }).join("");
    el("pstock").innerHTML='<table><thead><tr><th>EAN</th><th>Produs</th><th>Categorie</th><th class="right">Total</th><th>Locații</th></tr></thead><tbody>'+(rows||'<tr><td colspan=5 class="muted center">Nu ai încă marfă în depozit</td></tr>')+'</tbody></table>';
  });
}
function portalMovements(){
  setMain(topbar("Mișcările mărfii mele") + '<div class="card" id="pmov">…</div>');
  api("GET","/api/portal/movements").then(function(d){
    var rows=d.movements.map(function(m){
      return '<tr><td class="muted">'+esc(String(m.created_at).slice(0,16))+'</td><td><span class="pill mut">'+esc(m.type)+'</span></td>'
        +'<td><b>'+esc(m.sku)+'</b> '+esc(m.product_name)+'</td><td>'+esc(m.location_code)+'</td>'
        +'<td class="right">'+(m.quantity>0?'<span class="pill good">+'+m.quantity+'</span>':'<span class="pill bad">'+m.quantity+'</span>')+'</td></tr>';
    }).join("");
    el("pmov").innerHTML='<table><thead><tr><th>Data</th><th>Tip</th><th>Produs</th><th>Locație</th><th class="right">Cant.</th></tr></thead><tbody>'+(rows||'<tr><td colspan=5 class="muted center">Nicio mișcare</td></tr>')+'</tbody></table>';
  });
}

/* ---------------- App shell ---------------- */
var NAV = [
  ["dashboard","Dashboard","viewer"],
  ["stock","Stoc","viewer"],
  { label:"Gestiuni", items:[ ["products","Toate produsele","viewer"], ["products_clients","Produse clienți","viewer"], ["products_consumabile","Consumabile depozit","viewer"] ] },
  { label:"Depozit", items:[ ["locations","Locații","viewer"], ["pallets","Paleți","viewer"] ] },
  { label:"Operațiuni", items:[ ["receive","Recepție","operator"], ["ship","Expediere","operator"], ["transfer","Transfer","operator"] ] },
  ["orders","Comenzi","viewer"],
  { label:"Clienți & parteneri", items:[ ["clients","Clienți","operator"], ["partners","Parteneri","viewer"] ] },
  ["movements","Mișcări","viewer"],
  ["reports","Rapoarte","viewer"],
  ["users","Utilizatori","admin"]
];

function navLink(item){
  return '<a class="nav'+(view===item[0]?' active':'')+'" href="#" onclick="go(\\''+item[0]+'\\');return false">'+esc(item[1])+'</a>';
}
function renderApp(){
  var nav = NAV.map(function(n){
    if(Array.isArray(n)){ return can(n[2]) ? navLink(n) : ""; }
    var kids = n.items.filter(function(it){ return can(it[2]); });
    if(!kids.length) return "";
    var open = kids.some(function(it){ return it[0]===view; });
    return '<details class="navgroup"'+(open?' open':'')+'><summary>'+esc(n.label)+'</summary>'+kids.map(navLink).join("")+'</details>';
  }).join("");
  document.getElementById("root").innerHTML =
    '<div id="app"><aside>'
    + '<div style="padding:10px 12px 14px"><img src="/assets/logo.png" alt="WSD Logistics" style="width:100%;max-width:150px;display:block"></div>'
    + nav
    + '<button class="ghost sm" style="margin:8px 6px 2px" onclick="scanCamera(handleScanResult)">📷 Scanează</button>'
    + '<div style="flex:1"></div>'
    + '<div class="muted" style="padding:8px 12px;font-size:12px">'+esc(me.name)+'<br><span class="pill mut">'+esc(me.role)+'</span></div>'
    + '<button class="ghost sm" onclick="logout()">Ieșire</button>'
    + '</aside><main id="main"></main></div>';
}

var HELP = {
  dashboard: ["Ce vezi aici", "<p>Panoul general al depozitului.</p><ul><li><b>Cardurile de sus</b>: produse active, locații, unități în stoc, comenzi deschise și câte produse sunt sub prag.</li><li><b>Graficul</b>: intrările (verde) și ieșirile (roșu) din ultimele 7 zile.</li><li><b>Jos</b>: comenzi recente și produsele care trebuie reaprovizionate.</li></ul>"],
  stock: ["Ce vezi și cum modifici", "<p>Stocul curent.</p><ul><li><b>Sus</b>: total per produs, cu eticheta «sub prag» dacă e sub nivelul de reaprovizionare.</li><li><b>Jos</b>: detaliu pe fiecare locație.</li><li><b>Export CSV</b>: descarcă stocul.</li></ul><p>Stocul <b>nu</b> se editează direct aici — folosește <b>Recepție</b> (intrare), <b>Expediere</b> (ieșire) sau <b>Transfer</b>.</p>"],
  products: ["Toate produsele", "<p>Catalogul complet (marfă clienți + consumabile interne). Codul principal e <b>EAN-ul</b>; SKU-ul e opțional (auto din EAN).</p><ol><li><b>+ Produs</b> — scanezi/tastezi EAN-ul + numele; la «Client» alegi proprietarul (sau lași «intern»).</li><li><b>⬆ Import Excel</b> — mulți produse deodată dintr-un .xlsx/.csv.</li></ol><p>Sub «Gestiuni» ai și liste separate: <b>Produse clienți</b> și <b>Consumabile depozit</b>.</p>"],
  products_clients: ["Produsele clienților", "<p>Marfa care aparține clienților tăi (are un <b>proprietar</b> setat). Le adaugi la fel ca orice produs, dar la «Client» alegi firma căreia îi aparțin.</p><p>Fiecare client își vede doar produsele lui în portal.</p>"],
  products_consumabile: ["Consumabilele depozitului", "<p>Materialele interne ale depozitului (fără proprietar client): ambalaje, folie, bandă, mănuși etc.</p><p>La adăugare lași câmpul «Client» pe <b>intern (al companiei)</b>.</p>"],
  locations: ["La ce folosesc locațiile", "<p>Rafturile/zonele din depozit (ex: <b>A-01-03</b> = zonă-raft-nivel).</p><ol><li><b>+ Locație</b> — pui un cod unic și <b>Capacitatea</b> (câte spații/paleți încap).</li><li><b>Ocupare</b> — bara arată câți paleți sunt față de capacitate (verde/portocaliu/roșu).</li><li><b>▦ QR</b> = etichetă de raft (o scanezi cu telefonul → vezi stocul din raft).</li></ol>"],
  pallets: ["Paleți: spații, produse și client", "<p>Fiecare palet ocupă un <b>spațiu</b> într-o locație, aparține unui <b>client</b> și conține <b>produse</b>.</p><ol><li><b>+ Palet</b> — pui codul paletului, alegi clientul (proprietar) și locația (spațiul). Adaugi produsele + cantitățile.</li><li>Dacă locația e plină (fără spații libere), plasarea e respinsă.</li><li><b>Vezi</b> — adaugi/scoți produse, muți paletul în altă locație sau îl ștergi.</li></ol><p>Clientul își vede paleții și conținutul lor în portalul lui.</p>"],
  receive: ["Recepție marfă (intrare)", "<p>Adaugă marfă în stoc.</p><ol><li>Scanezi <b>📷</b> sau alegi produsul.</li><li>Alegi <b>locația</b> unde pui marfa.</li><li>Pui <b>cantitatea</b> (opțional o referință, ex: nr. aviz).</li><li>Apeși <b>Recepție</b>.</li></ol><p>Stocul crește și se înregistrează în <b>Mișcări</b>.</p>"],
  ship: ["Expediere (ieșire)", "<p>Scoate marfă din stoc.</p><ol><li>Scanezi <b>📷</b> sau alegi produsul.</li><li>Alegi <b>locația</b> din care iese marfa.</li><li>Pui <b>cantitatea</b> → <b>Expediază</b>.</li></ol><p>Dacă nu e stoc suficient în locație, operațiunea e <b>respinsă</b>.</p>"],
  transfer: ["Transfer între locații", "<p>Mută marfă dintr-o locație în alta (stocul total rămâne același).</p><ol><li>Alegi produsul.</li><li>Alegi locația <b>sursă</b> și cea <b>destinație</b>.</li><li>Pui cantitatea → <b>Transfer</b>.</li></ol>"],
  orders: ["Comenzi și finalizare", "<p>Comenzi de la <b>furnizori</b> (intrare) și către <b>clienți</b> (ieșire).</p><ol><li><b>+ Comandă</b>: alegi tipul, partenerul și adaugi linii de produse.</li><li>La <b>Vezi</b> o poți <b>Confirma</b>.</li><li><b>Finalizezi</b> alegând o locație — atunci stocul se mișcă automat: recepție (intrare) sau picking (ieșire).</li></ol>"],
  partners: ["Furnizori și clienți", "<p>Aici gestionezi partenerii.</p><ol><li><b>+ Partener</b> → alegi tipul (furnizor/client) și completezi datele.</li></ol><p>Îi folosești când creezi <b>Comenzi</b>. Filtrează cu butoanele de sus.</p>"],
  movements: ["Istoricul mișcărilor", "<p>Jurnalul complet al tuturor mișcărilor de stoc: <b>cine</b>, <b>ce</b>, <b>când</b> și <b>cât</b> (intrare, ieșire, transfer, ajustare).</p><p>Este doar pentru <b>consultare și audit</b> — nu se modifică nimic de aici.</p>"],
  reports: ["Rapoarte disponibile", "<ul><li><b>Stoc pe categorie</b> — cât ai pe fiecare categorie.</li><li><b>Top produse</b> — cele cu cel mai mare rulaj (30 zile).</li><li><b>Sub prag</b> — ce trebuie reaprovizionat (cu <b>Export CSV</b>).</li><li><b>Mișcări pe zi</b> — activitatea zilnică.</li></ul>"],
  clients: ["Clienți de depozitare + conturi portal", "<p>Aici gestionezi clienții pentru care depozitezi marfă (model 3PL).</p><ol><li><b>+ Client</b> — adaugi firma client.</li><li><b>Conturi</b> — creezi login-uri de portal pentru client (nume, email, parolă). Clientul se loghează cu ele și își vede <b>doar marfa lui</b>.</li></ol><p>Ca marfa să apară la un client, la <b>Produse</b> setezi câmpul «Client (proprietar marfă)». Recepția/expedierea funcționează la fel ca pentru marfa internă.</p>"],
  users: ["Utilizatori și roluri (doar admin)", "<ol><li><b>+ Utilizator</b> → nume, email, rol, parolă.</li></ol><p>Roluri: <b>viewer</b> (doar citește), <b>operator</b> (operează stocul și comenzile), <b>admin</b> (tot + gestionează utilizatori).</p><p>💡 Schimbă-ți parola implicită de admin de aici, la prima folosire.</p>"]
};
function viewHelp(v){
  var h=HELP[v]; if(!h) return "";
  return '<details class="help"><summary>ℹ️ Cum funcționează — '+esc(h[0])+'</summary><div class="help-body">'+h[1]+'</div></details>';
}
window.go = function(v){
  view=v; renderApp(); var f=VIEWS[v]; if(f) f();
  if(HELP[v]){
    var m=el("main"), tb=m&&m.querySelector(".topbar");
    if(tb){ var wrap=document.createElement("div"); wrap.innerHTML=viewHelp(v); var node=wrap.firstChild; if(node) tb.insertAdjacentElement("afterend", node); }
  }
};

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

var prodScope = "all";
function productsView(scope, title){
  prodScope = scope;
  var addBtn = can("operator") ? '<button onclick="productForm()">+ Produs</button>' : '';
  var impBtn = can("operator") ? '<button class="ghost" onclick="importUI()">⬆ Import Excel</button>' : '';
  var exp = '<button class="ghost" onclick="downloadCsv(\\'/api/products/export\\',\\'produse.csv\\')">Export CSV</button>';
  setMain(topbar(title, addBtn+impBtn+exp) + '<div class="toolbar"><input id="pq" placeholder="Caută EAN / SKU / nume" oninput="loadProducts()" style="max-width:320px"></div><div class="card" id="ptbl">…</div>');
  loadProducts();
}
VIEWS.products = function(){ productsView("all","Toate produsele"); };
VIEWS.products_clients = function(){ productsView("client","Produse clienți"); };
VIEWS.products_consumabile = function(){ productsView("internal","Consumabile depozit"); };
function ensureXLSX(){
  return new Promise(function(res,rej){
    if(window.XLSX) return res();
    var s=document.createElement("script"); s.src=API+"/vendor/xlsx.js";
    s.onload=function(){ window.XLSX?res():rej(new Error("xlsx")); }; s.onerror=function(){ rej(new Error("xlsx")); };
    document.head.appendChild(s);
  });
}
var _impRows=[];
window.importUI = function(){
  _impRows=[];
  modal("Import produse din Excel / CSV",
    '<div class="muted" style="margin-bottom:10px;font-size:12.5px">Coloane recunoscute (prima linie = antet): <b>cod_bare (EAN)</b>, <b>nume</b>, categorie, um, prag, sku (opțional). EAN-ul e codul principal.</div>'
    + '<div class="field"><label>Fișier (.xlsx / .xls / .csv)</label><input id="imp_file" type="file" accept=".xlsx,.xls,.csv"></div>'
    + '<div class="field"><label>Atribuie toate unui client (opțional)</label><select id="imp_client"><option value="">— intern (al companiei) —</option></select></div>'
    + '<div style="margin-bottom:10px"><button class="ghost sm" onclick="downloadTemplate()">⬇ Descarcă șablon</button></div>'
    + '<div id="imp_preview" class="muted">Alege un fișier ca să vezi previzualizarea.</div>',
    function(){ importDoImport(); });
  var sv=el("modalSave"); if(sv){ sv.textContent="Importă"; sv.disabled=true; }
  api("GET","/api/clients").then(function(d){ if(el("imp_client")) el("imp_client").innerHTML='<option value="">— intern (al companiei) —</option>'+d.clients.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join(""); }).catch(function(){});
  if(el("imp_file")) el("imp_file").onchange=importParseFile;
};
function impGet(row, keys){ for(var k in row){ if(keys.indexOf(String(k).toLowerCase().trim())>=0) return row[k]; } return ""; }
function mapRow(r){
  var barcode = String(impGet(r,["cod_bare","cod bare","cod de bare","barcode","ean","cod ean"])).trim();
  var sku = String(impGet(r,["sku","cod","cod produs","cod_produs"])).trim() || barcode; // SKU auto din EAN
  return {
    sku: sku,
    barcode: barcode,
    name: String(impGet(r,["nume","name","denumire","produs","descriere"])).trim(),
    category: String(impGet(r,["categorie","category"])).trim(),
    unit: String(impGet(r,["um","unit","unitate","unitate de masura"])).trim() || "buc",
    reorder_point: Number(impGet(r,["prag","reorder","reorder_point","stoc minim","prag reorder"]))||0
  };
}
window.importParseFile = function(){
  var f=el("imp_file").files[0]; if(!f) return;
  el("imp_preview").textContent="Se citește fișierul…";
  ensureXLSX().then(function(){
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});
        var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});
        _impRows=rows.map(mapRow).filter(function(r){ return (r.barcode||r.sku) && r.name; });
        var head=_impRows.slice(0,5).map(function(r){ return '<tr><td><b>'+esc(r.barcode||r.sku)+'</b></td><td>'+esc(r.name)+'</td><td>'+esc(r.category)+'</td></tr>'; }).join("");
        if(!_impRows.length){ el("imp_preview").innerHTML='<div class="pill bad">Niciun rând valid — verifică să existe coloanele «cod_bare» (EAN) și «nume»</div>'; var s=el("modalSave"); if(s) s.disabled=true; return; }
        el("imp_preview").innerHTML='<div style="margin-bottom:6px"><b>'+_impRows.length+'</b> produse valide (din '+rows.length+' rânduri)</div>'
          +'<div style="max-height:200px;overflow:auto"><table><thead><tr><th>EAN</th><th>Nume</th><th>Categorie</th></tr></thead><tbody>'+head+'</tbody></table></div>'
          +(_impRows.length>5?'<div class="muted" style="margin-top:4px">…și încă '+(_impRows.length-5)+'</div>':'');
        var s2=el("modalSave"); if(s2) s2.disabled=false;
      }catch(err){ el("imp_preview").innerHTML='<div class="pill bad">Nu am putut citi fișierul</div>'; }
    };
    reader.readAsArrayBuffer(f);
  }).catch(function(){ el("imp_preview").innerHTML='<div class="pill bad">Nu s-a putut încărca cititorul Excel</div>'; });
};
window.importDoImport = function(){
  if(!_impRows.length) return;
  var sv=el("modalSave"); if(sv) sv.disabled=true;
  toast("Se importă "+_impRows.length+" produse…");
  api("POST","/api/products/import",{ products:_impRows, client_id: el("imp_client").value?Number(el("imp_client").value):null })
    .then(function(d){ closeModal(); toast("Importat: "+d.created+" adăugate · "+d.skipped+" sărite"); loadProducts(); })
    .catch(function(e){ var s=el("modalSave"); if(s) s.disabled=false; toast(e.message,"bad"); });
};
window.downloadTemplate = function(){
  var csv="cod_bare,nume,categorie,um,prag,sku\\r\\n5941234567890,Exemplu produs,Ambalaje,buc,10,\\r\\n";
  var blob=new Blob([csv],{type:"text/csv;charset=utf-8"}), url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download="sablon-produse.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};
window.deleteProduct = function(id){
  var p=(cache.products||[]).find(function(x){return x.id===id;});
  var name=p?p.name:("#"+id);
  var code=p?(p.barcode||p.sku):"";
  modal("Confirmă ștergerea definitivă",
    '<p>Sigur vrei să ștergi <b>definitiv</b> produsul <b>'+esc(name)+'</b>'+(code?(' <span class="muted">('+esc(code)+')</span>'):'')+'?</p>'
    +'<p class="pill bad" style="font-size:12.5px;display:block;padding:8px 10px">⚠️ Ștergere permanentă și ireversibilă. Se șterg și stocul, mișcările, liniile de comandă și prezența pe paleți ale acestui produs.</p>',
    function(){
      api("DELETE","/api/products/"+id).then(function(){ closeModal(); toast("Produs șters definitiv"); loadProducts(); }).catch(function(e){ toast(e.message,"bad"); });
    });
  var sv=el("modalSave"); if(sv){ sv.textContent="Da, șterge definitiv"; sv.className="danger"; }
};
window.loadProducts = function(){
  var q = el("pq") ? el("pq").value : "";
  var params=[];
  if(q) params.push("q="+encodeURIComponent(q));
  if(prodScope==="client") params.push("owner=client");
  else if(prodScope==="internal") params.push("owner=internal");
  api("GET","/api/products"+(params.length?("?"+params.join("&")):"")).then(function(d){
    cache.products = d.products;
    var rows = d.products.map(function(p){
      var ean = p.barcode || '<span class="muted">— fără EAN —</span>';
      var skuLine = (p.sku && p.sku!==p.barcode) ? '<div class="muted" style="font-size:11.5px">SKU: '+esc(p.sku)+'</div>' : '';
      var owner = p.client_name ? esc(p.client_name) : '<span class="muted">intern</span>';
      return '<tr><td><b>'+ean+'</b>'+skuLine+'</td><td>'+esc(p.name)+'</td><td>'+owner+'</td><td>'+esc(p.category||"—")+'</td>'
        + '<td class="right">'+esc(p.reorder_point)+'</td><td>'+esc(p.unit)+'</td>'
        + '<td>'+(p.active?'<span class="pill good">activ</span>':'<span class="pill mut">inactiv</span>')+'</td>'
        + '<td class="right"><button class="ghost sm" onclick="showBarcode(\\''+esc(p.barcode||p.sku)+'\\',\\''+esc(p.barcode||p.sku)+'\\')">⌗ Bare</button>'
        + ' <button class="ghost sm" onclick="showQR(appOrigin()+\\'/#sku=\\'+encodeURIComponent(\\''+esc(p.sku)+'\\'),\\''+esc(p.barcode||p.sku)+'\\')">▦ QR</button>'
        + (can("operator")?' <button class="ghost sm" onclick="productForm('+p.id+')">Edit</button>':'')
        + (can("admin")?' <button class="danger sm" onclick="deleteProduct('+p.id+')">Șterge</button>':'')
        + '</td></tr>';
    }).join("");
    el("ptbl").innerHTML = '<table><thead><tr><th>EAN (cod bare)</th><th>Nume</th><th>Client</th><th>Categorie</th><th class="right">Prag</th><th>UM</th><th>Status</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=8 class="muted center">Niciun produs</td></tr>')+'</tbody></table>';
  });
};
window.productForm = function(id){
  var p = id ? cache.products.find(function(x){return x.id===id;}) : {unit:"buc",reorder_point:0,active:1};
  modal((id?"Editează":"Adaugă")+" produs",
    '<div class="field"><label>Cod de bare (EAN) — cod principal</label><div class="row"><input id="p_barcode" style="flex:1" value="'+esc(p.barcode||"")+'" placeholder="scanează sau tastează EAN-ul" oninput="bcInfo()"><button type="button" class="ghost" title="Scanează" onclick="scanInto(\\'p_barcode\\',true)">📷</button><button type="button" class="ghost" title="Identifică online" onclick="barcodeLookup()">🔍</button></div><div id="p_bc_info" class="muted" style="font-size:11.5px;margin-top:4px"></div></div>'
    + field("SKU (opțional — auto din EAN)","p_sku",p.sku||"",id?"disabled":"")
    + field("Nume","p_name",p.name||"")
    + field("Categorie","p_category",p.category||"")
    + '<div class="field"><label>Client (proprietar marfă)</label><select id="p_client"><option value="">— intern (al companiei) —</option></select></div>'
    + '<div class="row"><div style="flex:1">'+field("UM","p_unit",p.unit||"buc")+'</div><div style="flex:1">'+field("Prag reorder","p_reorder",p.reorder_point||0,"","number")+'</div></div>',
    function(){
      var body={ sku:el("p_sku").value, barcode:el("p_barcode").value, name:el("p_name").value, category:el("p_category").value, unit:el("p_unit").value, reorder_point:Number(el("p_reorder").value), client_id: el("p_client").value?Number(el("p_client").value):null };
      var pr = id ? api("PUT","/api/products/"+id,body) : api("POST","/api/products",body);
      pr.then(function(){ closeModal(); toast("Salvat"); loadProducts(); }).catch(function(e){ toast(e.message,"bad"); });
    });
  setTimeout(function(){ if(el("p_barcode")) bcInfo(); }, 20);
  api("GET","/api/clients").then(function(d){
    var sel=el("p_client"); if(!sel) return;
    sel.innerHTML='<option value="">— intern (al companiei) —</option>'+d.clients.map(function(c){return '<option value="'+c.id+'"'+(String(p.client_id||"")===String(c.id)?' selected':'')+'>'+esc(c.name)+'</option>';}).join("");
  }).catch(function(){});
};

VIEWS.locations = function(){
  var addBtn = can("operator") ? '<button onclick="locationForm()">+ Locație</button>' : '';
  setMain(topbar("Locații", addBtn) + '<div class="card" id="ltbl">…</div>');
  api("GET","/api/locations").then(function(d){
    cache.locations = d.locations;
    var rows = d.locations.map(function(l){
      return '<tr><td><b>'+esc(l.code)+'</b></td><td>'+esc(l.name||"—")+'</td><td>'+esc(l.zone||"—")+'</td>'
        + '<td>'+fillBar(l.used, l.capacity)+'</td>'
        + '<td>'+(l.active?'<span class="pill good">activ</span>':'<span class="pill mut">inactiv</span>')+'</td>'
        + '<td class="right"><button class="ghost sm" onclick="showQR(appOrigin()+\\'/#loc=\\'+encodeURIComponent(\\''+esc(l.code)+'\\'),\\''+esc(l.code)+'\\')">▦ QR</button>'
        + ' <button class="ghost sm" onclick="locationView(\\''+esc(l.code)+'\\')">Vezi</button>'
        + (can("operator")?' <button class="ghost sm" onclick="locationForm('+l.id+')">Edit</button>':'')+'</td></tr>';
    }).join("");
    el("ltbl").innerHTML='<table><thead><tr><th>Cod</th><th>Nume</th><th>Zonă</th><th>Ocupare</th><th>Status</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=6 class="muted center">Nicio locație</td></tr>')+'</tbody></table>';
  });
};
window.locationForm = function(id){
  var l = id ? cache.locations.find(function(x){return x.id===id;}) : {};
  modal((id?"Editează":"Adaugă")+" locație",
    field("Cod (ex: A-01-03)","l_code",l.code||"",id?"disabled":"") + field("Nume","l_name",l.name||"") + field("Zonă","l_zone",l.zone||"")
    + field("Capacitate (nr. spații / paleți)","l_cap",l.capacity||0,"","number"),
    function(){
      var body={ code:el("l_code").value, name:el("l_name").value, zone:el("l_zone").value, capacity:Number(el("l_cap").value)||0 };
      var pr = id ? api("PUT","/api/locations/"+id,body) : api("POST","/api/locations",body);
      pr.then(function(){ closeModal(); toast("Salvat"); go("locations"); }).catch(function(e){ toast(e.message,"bad"); });
    });
};
function fillBar(used, cap){
  used=Number(used)||0; cap=Number(cap)||0;
  if(cap<=0) return '<span class="muted" style="font-size:12px">'+used+' paleți · fără capacitate</span>';
  var pct=Math.min(100, Math.round(used/cap*100));
  var col = pct>=90?'var(--bad)':(pct>=70?'var(--warn)':'var(--good)');
  return '<div style="min-width:150px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px"><span>'+used+' / '+cap+' spații</span><span class="muted">'+pct+'%'+(used>cap?' ⚠':'')+'</span></div>'
    +'<div style="height:9px;background:var(--panel-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+col+';border-radius:6px"></div></div></div>';
}

VIEWS.stock = function(){
  var exp = '<button class="ghost" onclick="downloadCsv(\\'/api/inventory/export\\',\\'stoc.csv\\')">Export CSV</button>';
  setMain(topbar("Stoc", exp)
    + '<h2 style="margin-top:6px">Ocupare rafturi</h2><div class="card" id="occ" style="margin-bottom:18px;padding:8px 4px">…</div>'
    + '<h2>Total per produs</h2><div class="card" id="sumtbl" style="margin-bottom:18px">…</div><h2>Detaliu pe locație</h2><div class="card" id="stbl">…</div>');
  api("GET","/api/locations").then(function(d){
    var locs=d.locations.filter(function(l){return l.active;});
    var rows=locs.map(function(l){
      return '<tr><td style="padding-left:14px"><b>'+esc(l.code)+'</b> <span class="muted">'+esc(l.zone||"")+'</span></td><td style="width:200px">'+fillBar(l.used,l.capacity)+'</td></tr>';
    }).join("");
    el("occ").innerHTML=rows?('<table><tbody>'+rows+'</tbody></table>'):'<div class="muted center" style="padding:10px">Nicio locație</div>';
  });
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

/* ---------------- Paleți (staff) ---------------- */
VIEWS.pallets = function(){
  var addBtn = can("operator") ? '<button onclick="palletForm()">+ Palet</button>' : '';
  setMain(topbar("Paleți", addBtn) + '<div class="card" id="pal">…</div>');
  api("GET","/api/pallets").then(function(d){
    var rows=d.pallets.map(function(p){
      return '<tr><td><b>'+esc(p.code)+'</b></td><td>'+esc(p.client_name||"—")+'</td>'
        +'<td>'+(p.location_code?esc(p.location_code):'<span class="pill warn">neplasat</span>')+'</td>'
        +'<td class="right">'+esc(p.item_count)+'</td><td class="right">'+esc(p.total_qty)+'</td>'
        +'<td class="right"><button class="ghost sm" onclick="showQR(\\''+esc(p.code)+'\\',\\''+esc(p.code)+'\\')">▦ QR</button> <button class="ghost sm" onclick="palletDetail('+p.id+')">Vezi</button></td></tr>';
    }).join("");
    el("pal").innerHTML='<table><thead><tr><th>Cod palet</th><th>Client</th><th>Locație</th><th class="right">Produse</th><th class="right">Cant.</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=6 class="muted center">Niciun palet</td></tr>')+'</tbody></table>';
  });
};
var palLines=[];
window.palletForm = function(){
  palLines=[{product_id:"",quantity:1}];
  setMain(topbar("Palet nou")
    + '<div class="card" style="padding:20px;max-width:640px"><div id="plmsg"></div>'
    + '<div class="row"><div style="flex:1">'+field("Cod palet","pl_code","")+'</div>'
    + '<div style="flex:1"><label>Client (proprietar)</label><select id="pl_client"><option value="">— fără —</option></select></div></div>'
    + '<div class="field"><label>Locație (spațiu)</label><select id="pl_loc"><option value="">— neplasat (draft) —</option></select></div>'
    + '<h2 style="margin-top:8px">Produse pe palet</h2><div id="pl_lines"></div>'
    + '<button class="ghost sm" onclick="palAddLine()" style="margin-top:8px">+ Adaugă produs</button>'
    + '<div style="margin-top:16px"><button onclick="palSubmit()">Creează paletul</button></div></div>');
  Promise.all([api("GET","/api/products"),api("GET","/api/clients"),api("GET","/api/locations")]).then(function(r){
    cache.palProducts=r[0].products.filter(function(p){return p.active;});
    el("pl_client").innerHTML='<option value="">— fără —</option>'+r[1].clients.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join("");
    el("pl_loc").innerHTML='<option value="">— neplasat (draft) —</option>'+r[2].locations.filter(function(l){return l.active;}).map(function(l){
      var full=(l.capacity>0 && l.used>=l.capacity);
      return '<option value="'+l.id+'"'+(full?' disabled':'')+'>'+esc(l.code)+(l.capacity>0?(' ('+l.used+'/'+l.capacity+')'):'')+(full?' — plin':'')+'</option>';
    }).join("");
    palRenderLines();
  });
};
window.palAddLine = function(){ palLines.push({product_id:"",quantity:1}); palRenderLines(); };
window.palRemoveLine = function(i){ palLines.splice(i,1); if(!palLines.length) palLines.push({product_id:"",quantity:1}); palRenderLines(); };
function palRenderLines(){
  var prods=cache.palProducts||[];
  el("pl_lines").innerHTML=palLines.map(function(l,i){
    var opts=prods.map(function(p){return '<option value="'+p.id+'"'+(String(l.product_id)===String(p.id)?' selected':'')+'>'+esc(p.sku+" — "+p.name)+'</option>';}).join("");
    return '<div class="row" style="margin-bottom:8px;align-items:flex-end"><div style="flex:3"><select onchange="palLines['+i+'].product_id=this.value"><option value="">— produs —</option>'+opts+'</select></div>'
      +'<div style="flex:1"><input type="number" min="1" value="'+esc(l.quantity)+'" onchange="palLines['+i+'].quantity=Number(this.value)"></div>'
      +'<button class="ghost sm" onclick="palRemoveLine('+i+')">✕</button></div>';
  }).join("");
}
window.palSubmit = function(){
  var items=palLines.filter(function(l){return l.product_id && Number(l.quantity)>0;}).map(function(l){return {product_id:Number(l.product_id),quantity:Number(l.quantity)};});
  var body={ code:el("pl_code").value, client_id:el("pl_client").value?Number(el("pl_client").value):null, location_id:el("pl_loc").value?Number(el("pl_loc").value):null, items:items };
  if(!body.code){ el("plmsg").innerHTML='<div class="pill bad" style="margin-bottom:12px">Codul paletului e obligatoriu</div>'; return; }
  api("POST","/api/pallets",body).then(function(){ toast("Palet creat"); go("pallets"); }).catch(function(e){ el("plmsg").innerHTML='<div class="pill bad" style="margin-bottom:12px">'+esc(e.message)+'</div>'; });
};
window.palletDetail = function(id){
  api("GET","/api/pallets/"+id).then(function(d){
    var p=d.pallet;
    var items='<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">Cant.</th>'+(can("operator")?'<th></th>':'')+'</tr></thead><tbody>'
      + d.items.map(function(it){ return '<tr><td><b>'+esc(it.sku)+'</b></td><td>'+esc(it.product_name)+'</td><td class="right">'+esc(it.quantity)+'</td>'+(can("operator")?'<td class="right"><button class="ghost sm" onclick="palDelItem('+id+','+it.id+')">✕</button></td>':'')+'</tr>'; }).join("")
      + '</tbody></table>';
    var actions='';
    if(can("operator")){
      actions='<div class="field" style="margin-top:14px"><label>Mută în locația</label><div class="row"><select id="pd_loc" style="flex:1"></select><button onclick="palMove('+id+')">Mută</button></div></div>'
        + '<h2 style="margin-top:10px;font-size:14px">Adaugă produs</h2><div class="row"><select id="pd_prod" style="flex:3"></select><input id="pd_qty" type="number" min="1" value="1" style="flex:1"><button onclick="palAddItem('+id+')">+</button></div>'
        + '<div class="row" style="margin-top:12px"><button class="danger sm" onclick="palDelete('+id+')">Șterge paletul</button></div>';
    }
    modal("Palet "+esc(p.code)+(p.location_code?(" · "+esc(p.location_code)):" · neplasat"),
      '<div class="muted" style="margin-bottom:10px">Client: <b>'+esc(p.client_name||"—")+'</b> · status: '+esc(p.status)+'</div>'+items+actions, null);
    var sv=el("modalSave"); if(sv) sv.style.display="none";
    if(can("operator")){
      Promise.all([api("GET","/api/locations"),api("GET","/api/products")]).then(function(r){
        if(el("pd_loc")) el("pd_loc").innerHTML='<option value="">— scoate din locație —</option>'+r[0].locations.filter(function(l){return l.active;}).map(function(l){return '<option value="'+l.id+'"'+(l.id===p.location_id?' selected':'')+'>'+esc(l.code)+(l.capacity>0?(' ('+l.used+'/'+l.capacity+')'):'')+'</option>';}).join("");
        if(el("pd_prod")) el("pd_prod").innerHTML=r[1].products.filter(function(x){return x.active;}).map(function(x){return '<option value="'+x.id+'">'+esc(x.sku+" — "+x.name)+'</option>';}).join("");
      });
    }
  });
};
window.palMove = function(id){ api("PUT","/api/pallets/"+id,{location_id:el("pd_loc").value?Number(el("pd_loc").value):null}).then(function(){ closeModal(); toast("Palet mutat"); go("pallets"); }).catch(function(e){ toast(e.message,"bad"); }); };
window.palAddItem = function(id){ api("POST","/api/pallets/"+id+"/items",{product_id:Number(el("pd_prod").value),quantity:Number(el("pd_qty").value)}).then(function(){ toast("Adăugat"); palletDetail(id); }).catch(function(e){ toast(e.message,"bad"); }); };
window.palDelItem = function(id,itemId){ api("DELETE","/api/pallets/"+id+"/items/"+itemId).then(function(){ palletDetail(id); }).catch(function(e){ toast(e.message,"bad"); }); };
window.palDelete = function(id){ api("DELETE","/api/pallets/"+id).then(function(){ closeModal(); toast("Palet șters"); go("pallets"); }).catch(function(e){ toast(e.message,"bad"); }); };

/* ---------------- Clienți de depozitare (staff) ---------------- */
VIEWS.clients = function(){
  var addBtn = can("admin") ? '<button onclick="clientForm()">+ Client</button>' : '';
  setMain(topbar("Clienți de depozitare", addBtn) + '<div class="card" id="cln">…</div>');
  api("GET","/api/clients").then(function(d){
    cache.clients=d.clients;
    var rows=d.clients.map(function(c){
      return '<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.email||"—")+'</td><td>'+esc(c.phone||"—")+'</td>'
        +'<td class="right">'+esc(c.product_count)+'</td><td class="right">'+esc(c.user_count)+'</td>'
        +'<td class="right">'+(can("admin")?'<button class="ghost sm" onclick="clientUsers('+c.id+')">Conturi</button> <button class="ghost sm" onclick="clientForm('+c.id+')">Edit</button>':'')+'</td></tr>';
    }).join("");
    el("cln").innerHTML='<table><thead><tr><th>Client</th><th>Email</th><th>Telefon</th><th class="right">Produse</th><th class="right">Conturi</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=6 class="muted center">Niciun client</td></tr>')+'</tbody></table>';
  });
};
window.clientForm = function(id){
  var c = id ? cache.clients.find(function(x){return x.id===id;}) : {};
  modal((id?"Editează":"Adaugă")+" client",
    field("Nume firmă","cl_name",c.name||"") + field("Email","cl_email",c.email||"","","email") + field("Telefon","cl_phone",c.phone||""),
    function(){
      var body={ name:el("cl_name").value, email:el("cl_email").value, phone:el("cl_phone").value };
      var pr = id ? api("PUT","/api/clients/"+id,body) : api("POST","/api/clients",body);
      pr.then(function(){ closeModal(); toast("Salvat"); go("clients"); }).catch(function(e){ toast(e.message,"bad"); });
    });
};
window.clientUsers = function(id){
  var c = cache.clients.find(function(x){return x.id===id;});
  modal("Conturi portal — "+esc(c?c.name:""),
    '<div id="cu_list" class="muted">Se încarcă…</div>'
    + '<h2 style="margin:16px 0 8px;font-size:14px">Adaugă cont nou</h2>'
    + field("Nume persoană","cu_name","") + field("Email (login)","cu_email","","","email") + field("Parolă","cu_pass","","","password"),
    function(){
      var body={ name:el("cu_name").value, email:el("cu_email").value, password:el("cu_pass").value };
      api("POST","/api/clients/"+id+"/users",body).then(function(){ toast("Cont creat"); clientUsers(id); }).catch(function(e){ toast(e.message,"bad"); });
    });
  el("modalSave").textContent="Creează cont";
  api("GET","/api/clients/"+id+"/users").then(function(d){
    el("cu_list").innerHTML = d.users.length
      ? '<table><tbody>'+d.users.map(function(u){return '<tr><td>'+esc(u.name)+'</td><td class="muted">'+esc(u.email)+'</td><td>'+(u.active?'<span class="pill good">activ</span>':'<span class="pill bad">inactiv</span>')+'</td></tr>';}).join("")+'</tbody></table>'
      : '<div class="muted">Niciun cont încă. Creează unul mai jos ca clientul să se poată loga.</div>';
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

// Decodare prefix GS1 -> țara unde e înregistrat codul (offline, primele 3 cifre)
var GS1 = [
  [0,19,"SUA / Canada"],[30,39,"SUA"],[50,59,"SUA (cupoane)"],[60,139,"SUA / Canada"],
  [300,379,"Franța"],[380,380,"Bulgaria"],[383,383,"Slovenia"],[385,385,"Croația"],[387,387,"Bosnia și Herțegovina"],[389,389,"Muntenegru"],[390,390,"Kosovo"],
  [400,440,"Germania"],[450,459,"Japonia"],[460,469,"Rusia"],[470,470,"Kârgâzstan"],[471,471,"Taiwan"],[474,474,"Estonia"],[475,475,"Letonia"],[476,476,"Azerbaidjan"],[477,477,"Lituania"],[478,478,"Uzbekistan"],[479,479,"Sri Lanka"],[480,480,"Filipine"],[481,481,"Belarus"],[482,482,"Ucraina"],[484,484,"Moldova"],[485,485,"Armenia"],[486,486,"Georgia"],[487,487,"Kazahstan"],[489,489,"Hong Kong"],[490,499,"Japonia"],
  [500,509,"Regatul Unit"],[520,521,"Grecia"],[528,528,"Liban"],[529,529,"Cipru"],[530,530,"Albania"],[531,531,"Macedonia de Nord"],[535,535,"Malta"],[539,539,"Irlanda"],[540,549,"Belgia / Luxemburg"],[560,560,"Portugalia"],[569,569,"Islanda"],[570,579,"Danemarca"],[590,590,"Polonia"],[594,594,"România"],[599,599,"Ungaria"],
  [600,601,"Africa de Sud"],[608,608,"Bahrain"],[609,609,"Mauritius"],[611,611,"Maroc"],[613,613,"Algeria"],[615,615,"Nigeria"],[616,616,"Kenya"],[619,619,"Tunisia"],[621,621,"Siria"],[622,622,"Egipt"],[625,625,"Iordania"],[626,626,"Iran"],[627,627,"Kuwait"],[628,628,"Arabia Saudită"],[629,629,"Emiratele Arabe Unite"],[640,649,"Finlanda"],[690,699,"China"],
  [700,709,"Norvegia"],[729,729,"Israel"],[730,739,"Suedia"],[740,745,"America Centrală"],[746,746,"Rep. Dominicană"],[750,750,"Mexic"],[754,755,"Canada"],[759,759,"Venezuela"],[760,769,"Elveția"],[770,771,"Columbia"],[773,773,"Uruguay"],[775,775,"Peru"],[777,777,"Bolivia"],[778,779,"Argentina"],[780,780,"Chile"],[784,784,"Paraguay"],[786,786,"Ecuador"],[789,790,"Brazilia"],
  [800,839,"Italia"],[840,849,"Spania"],[850,850,"Cuba"],[858,858,"Slovacia"],[859,859,"Cehia"],[860,860,"Serbia"],[865,865,"Mongolia"],[867,867,"Coreea de Nord"],[868,869,"Turcia"],[870,879,"Țările de Jos"],[880,880,"Coreea de Sud"],[884,884,"Cambodgia"],[885,885,"Thailanda"],[888,888,"Singapore"],[890,890,"India"],[893,893,"Vietnam"],[896,896,"Pakistan"],[899,899,"Indonezia"],
  [900,919,"Austria"],[930,939,"Australia"],[940,949,"Noua Zeelandă"],[955,955,"Malaysia"],[958,958,"Macau"],[977,977,"presă (ISSN)"],[978,979,"carte (ISBN)"]
];
function gs1Country(code){
  var digits=String(code||"").replace(/\\D/g,""); if(digits.length<8) return null;
  var p=parseInt(digits.slice(0,3),10); if(isNaN(p)) return null;
  for(var i=0;i<GS1.length;i++){ if(p>=GS1[i][0] && p<=GS1[i][1]) return GS1[i][2]; }
  if(p>=200 && p<=299) return "cod intern (magazin)";
  return null;
}
window.bcInfo = function(){
  var box=el("p_bc_info"); if(!box) return;
  var code=(el("p_barcode")&&el("p_barcode").value||"").trim();
  var c=gs1Country(code);
  box.innerHTML = c ? ('🌍 Cod înregistrat în: <b>'+esc(c)+'</b>') : '';
};

// Scanează un cod și îl pune într-un câmp (ex: cod de bare la adăugare produs)
window.scanInto = function(fieldId, thenLookup){
  scanCamera(function(t){
    var m=String(t).match(/[#&?]sku=([^&]+)/);
    var val=m?decodeURIComponent(m[1]):String(t);
    var e=el(fieldId); if(e){ e.value=val; }
    toast("Scanat: "+val);
    if(fieldId==="p_barcode") bcInfo();
    if(thenLookup && fieldId==="p_barcode") barcodeLookup();
  });
};

// Identifică produsul după codul de bare, din baze de date online
window.barcodeLookup = function(){
  var inp=el("p_barcode"); if(!inp) return;
  var code=(inp.value||"").trim();
  if(!code){ toast("Scanează sau tastează un cod de bare întâi","bad"); return; }
  bcInfo();
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
window.onhashchange=function(){ if(me && me.kind!=="client") handleHash(); };
if(token){
  api("GET","/api/auth/me").then(function(d){ me=d.user; enterApp(); })
    .catch(function(){ token=null; me=null; localStorage.removeItem("wms_token"); renderLanding(); });
} else { renderLanding(); }
</script>
</body>
</html>`;
}
