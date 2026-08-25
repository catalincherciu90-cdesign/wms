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
  .fhint{font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.4}
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
  @media(max-width:720px){ .fitem .flbl{display:none} .fnav-logo img{height:26px} .fitem{padding:6px 10px} .fitem .fic{width:40px;height:40px} .fitem.active .fic{transform:translateY(-30px)} }
  /* Trust bar sub hero */
  .trustbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:20px 0 6px}
  .trust{display:flex;align-items:center;gap:13px;padding:15px 16px}
  .trust .ti{width:46px;height:46px;border-radius:13px;background:rgba(47,109,246,.10);color:var(--brand);display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .trust .ti svg{width:24px;height:24px}
  .trust b{display:block;font-size:14px;line-height:1.2}
  .trust small{font-size:12px;color:var(--muted)}
  /* Secțiuni landing suplimentare */
  .eyebrow{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);background:rgba(47,75,255,.09);padding:5px 13px;border-radius:999px;margin-bottom:12px}
  .stat-strip{background:linear-gradient(135deg,#2f4bff 0%,#1e33c4 100%);border-radius:22px;color:#fff;display:grid;grid-template-columns:repeat(4,1fr);padding:34px 18px;margin:26px 0;box-shadow:0 16px 34px -12px rgba(47,75,255,.5)}
  .stat-item{text-align:center;padding:6px 12px;border-right:1px solid rgba(255,255,255,.2)}
  .stat-item:last-child{border-right:none}
  .stat-num{font-size:34px;font-weight:800;line-height:1;letter-spacing:-.02em}
  .stat-num span{font-size:19px;font-weight:700;opacity:.9}
  .stat-lbl{margin-top:9px;font-size:12px;font-weight:500;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.03em}
  .checkwrap{display:grid;grid-template-columns:1fr 1fr;gap:14px 28px}
  .checkitem{display:flex;gap:11px;align-items:flex-start}
  .checkitem .ci{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:#e8fff2;color:#16a34a;display:flex;align-items:center;justify-content:center;margin-top:1px}
  .checkitem .ci svg{width:15px;height:15px;stroke-width:2.6}
  .checkitem b{display:block;font-size:14.5px;margin-bottom:2px}
  .checkitem small{color:var(--muted);font-size:13px;line-height:1.5}
  .lcard{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
  .lcard:hover{transform:translateY(-4px);box-shadow:0 12px 24px -8px rgba(47,75,255,.18);border-color:rgba(47,75,255,.35)}
  .icircle{width:46px;height:46px;border-radius:12px;background:rgba(47,75,255,.09);color:var(--brand);display:flex;align-items:center;justify-content:center}
  .icircle svg{width:24px;height:24px}
  .tcard{display:flex;flex-direction:column;gap:10px}
  .tquote{font-size:40px;line-height:.6;color:var(--brand);opacity:.28;font-weight:800;height:20px}
  .stars{color:#f59e0b;font-size:13px;letter-spacing:2px}
  .faq{max-width:820px;margin:0 auto}
  .faq-item{border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;background:#fff}
  .faq-q{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 18px;cursor:pointer;font-weight:600;font-size:14.5px}
  .faq-q .fqi{flex:0 0 auto;width:20px;height:20px;transition:transform .25s;color:var(--brand)}
  .faq-item.open .fqi{transform:rotate(45deg)}
  .faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease;color:var(--muted);font-size:13.5px;line-height:1.6}
  .faq-item.open .faq-a{max-height:360px}
  .faq-a div{padding:0 18px 16px}
  /* Footer site */
  .sfooter{margin-top:44px;border-top:1px solid var(--border);padding:40px 0 0}
  .sfooter-grid{display:grid;grid-template-columns:1.6fr 1fr 1.1fr 1.3fr;gap:30px}
  .sfooter h4{font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 14px;color:var(--muted);font-weight:700}
  .sfooter a{display:block;color:var(--text);text-decoration:none;font-size:13.5px;padding:4px 0;cursor:pointer}
  .sfooter a:hover{color:var(--brand)}
  .sfooter img{height:34px;display:block}
  .sfooter .fdesc{font-size:13px;color:var(--muted);line-height:1.6;max-width:290px;margin:14px 0 0}
  .sfoot-social{display:flex;gap:10px;margin-top:16px}
  .sfoot-social a{width:34px;height:34px;border:1px solid var(--border);border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--muted);padding:0}
  .sfoot-social a:hover{color:var(--brand);border-color:var(--brand)}
  .sfoot-social svg{width:17px;height:17px}
  .sfoot-contact{font-size:13.5px;color:var(--muted);line-height:1.55}
  .sfoot-contact a{color:var(--muted);padding:5px 0}
  .sfoot-bottom{border-top:1px solid var(--border);margin-top:30px;padding:16px 0 22px;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12.5px;color:var(--muted);flex-wrap:wrap}
  .sfoot-bottom a{color:var(--brand);cursor:pointer;text-decoration:none;font-weight:600}
  /* Optimizări mobil (site public) */
  @media(max-width:640px){
    .site-hero{padding:40px 18px !important}
    .site-hero h1{font-size:26px !important;line-height:1.22 !important}
    .site-hero p{font-size:14.5px !important}
    .fnav-band{padding:30px 6px 12px !important;border-radius:24px}
    .fnav{padding:7px 6px !important;gap:0 !important;border-radius:40px;min-width:0}
    .fnav-logo{padding:0 4px 0 2px !important;margin-right:0 !important;border-right:none !important}
    .fnav-logo img{height:22px !important}
    .fnav .fitem{padding:4px 4px !important}
    .fnav .fic{width:36px !important;height:36px !important}
    .fnav .fic svg{width:19px;height:19px}
    .trust{padding:13px 14px}
    .gallery img{height:160px}
    .stat-strip{grid-template-columns:1fr 1fr;gap:22px 0;padding:26px 12px}
    .stat-item:nth-child(2){border-right:none}
    .stat-num{font-size:28px}
    .checkwrap{grid-template-columns:1fr;gap:13px}
    .sfooter-grid{grid-template-columns:1fr 1fr;gap:26px 20px}
    .sfoot-bottom{flex-direction:column;align-items:flex-start;gap:8px}
  }
  /* Telefoane foarte înguste */
  @media(max-width:380px){
    .fnav-logo img{height:20px !important}
    .fnav .fitem{padding:4px 2px !important}
    .fnav .fic{width:33px !important;height:33px !important}
    .fnav .fic svg{width:18px;height:18px}
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
  /* Bara mobilă + drawer (ascunse pe desktop) */
  .mtop{display:none}
  .drawer-bg{display:none}
  @media(max-width:820px){
    #app{grid-template-columns:1fr}
    .mtop{display:flex;align-items:center;gap:12px;position:fixed;top:0;left:0;right:0;height:54px;padding:0 14px;background:var(--panel);border-bottom:1px solid var(--border);z-index:45}
    .mtop img{height:26px;display:block}
    .burger{background:transparent;color:var(--text);padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border)}
    .burger svg{width:22px;height:22px}
    main{padding:70px 14px 24px}
    aside{position:fixed;top:0;left:0;bottom:0;width:258px;transform:translateX(-100%);transition:transform .25s ease;z-index:60;overflow-y:auto;box-shadow:0 0 46px rgba(10,15,25,.28)}
    #app.menu-open aside{transform:translateX(0)}
    .drawer-bg{display:block;position:fixed;inset:0;background:rgba(10,15,25,.45);z-index:55;opacity:0;pointer-events:none;transition:opacity .25s}
    #app.menu-open .drawer-bg{opacity:1;pointer-events:auto}
    .kpis{grid-template-columns:repeat(2,1fr)}
    main .card{overflow-x:auto}
    .topbar{flex-wrap:wrap;gap:10px}
    .toolbar input{max-width:none !important}
    .modal{max-width:100%}
  }
  @media(max-width:420px){
    .kpis{grid-template-columns:1fr}
    main{padding:68px 11px 24px}
  }
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

var APP_VERSION = "v26";
try{ console.log("WMS build "+APP_VERSION); }catch(e){}
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
    + '<div class="field"><label>Email</label><input id="li_email" type="email" autofocus required>'+fhint("Emailul contului tău (ex: nume@wsd.ro).")+'</div>'
    + '<div class="field"><label>Parolă</label><input id="li_pass" type="password" required>'+fhint("Parola contului; nu o partaja cu nimeni.")+'</div>'
    + (err?'<div class="pill bad" style="margin-bottom:12px">'+esc(err)+'</div>':'')
    + '<button style="width:100%" type="submit">Intră în cont</button>'
    + '<div class="center" style="margin-top:14px;font-size:12.5px"><a href="#" onclick="renderLanding();return false">← Înapoi la site</a></div>'
    + '<div class="center muted" style="margin-top:10px;font-size:11px">versiune '+APP_VERSION+'</div>'
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
    login:'<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
    shield:'<path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    route:'<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    chart:'<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M8 15v-3M12 15V8M16 15v-5"/>',
    headset:'<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M20 19v1a2 2 0 0 1-2 2h-3"/>',
    factory:'<path d="M3 20.5V11l5 3.5V11l5 3.5V11l5 3.5v6"/><path d="M3 20.5h18M6 20.5v-3M18 8.5V6M18 6h3"/>',
    cart:'<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.8L20 7H6"/>',
    boxes:'<rect x="3" y="9" width="8" height="8" rx="1"/><rect x="13" y="9" width="8" height="8" rx="1"/><path d="M5 9V6h6v3M15 9V6h4v3"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    phone:'<path d="M4 5c0 8.3 6.7 15 15 15v-3.5l-4-1.5-2 2a12 12 0 0 1-5-5l2-2L8.5 5H4Z"/>',
    pin:'<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    facebook:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15 8h-2a2 2 0 0 0-2 2v8M9 13h5"/>',
    instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1"/>',
    linkedin:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 17v-7"/>',
    truck:'<rect x="1.5" y="6.5" width="13" height="9" rx="1"/><path d="M14.5 9.5h3l2.5 3v3h-5.5"/><circle cx="6" cy="17.5" r="1.7"/><circle cx="16.5" cy="17.5" r="1.7"/>',
    receive:'<path d="M12 3v9M12 12l3.5-3.5M12 12 8.5 8.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    ship:'<path d="M12 12V3M12 3l3.5 3.5M12 3 8.5 6.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    tag:'<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.3"/>',
    puzzle:'<path d="M10 4.5a2 2 0 0 1 4 0c0 .9.6 1.5 1.5 1.5H17a1 1 0 0 1 1 1v1.5c0 .9.6 1.5 1.5 1.5a2 2 0 0 1 0 4c-.9 0-1.5.6-1.5 1.5V17a1 1 0 0 1-1 1h-1.5c-.9 0-1.5.6-1.5 1.5a2 2 0 0 1-4 0c0-.9-.6-1.5-1.5-1.5H7a1 1 0 0 1-1-1v-1.5c0-.9-.6-1.5-1.5-1.5a2 2 0 0 1 0-4c.9 0 1.5-.6 1.5-1.5V7a1 1 0 0 1 1-1h1.5c.9 0 1.5-.6 1.5-1.5Z"/>',
    handshake:'<path d="m11 17-2.5 2.5a1.8 1.8 0 0 1-2.5-2.5L10 13"/><path d="M13 7l2-2a1.8 1.8 0 0 1 2.5 2.5L14 11l-2 2a1.8 1.8 0 0 1-2.5-2.5L11 9"/><path d="M3 13l2 2M19 11l2-2"/>',
    monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.7"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'
  }[n]||'';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
}
function siteHeader(active){
  var items=[["home","Acasă","home"],["about","Despre noi","about"],["services","Servicii","services"],["contact","Contact","contact"]];
  var nav=items.map(function(it){ return '<a class="fitem'+(active===it[0]?' active':'')+'" onclick="siteGo(\\''+it[0]+'\\');return false"><span class="fic">'+svgIcon(it[2])+'</span><span class="flbl">'+esc(it[1])+'</span></a>'; }).join('');
  return '<div class="fnav-wrap"><div class="fnav-band"><nav class="fnav">'
    +'<div class="fnav-logo" onclick="siteGo(\\'home\\')"><img src="/assets/logo.png" alt="WSD Logistics"></div>'
    + nav
    +'<a class="fitem" onclick="renderLogin();return false"><span class="fic">'+svgIcon("login")+'</span><span class="flbl">Autentificare</span></a>'
    +'</nav></div></div>';
}
function siteFooter(){
  var lnk=function(p,t){ return '<a onclick="siteGo(\\''+p+'\\')">'+esc(t)+'</a>'; };
  var soc=function(ic){ return '<a href="#" onclick="return false" title="'+ic+'">'+svgIcon(ic)+'</a>'; };
  return '<footer class="sfooter">'
    +'<div class="sfooter-grid">'
    +'<div><img src="/assets/logo.png" alt="WSD Logistics">'
      +'<p class="fdesc">Depozitare securizată și transport marfă pentru afacerea ta. Tu vinzi — de restul ne ocupăm noi.</p>'
      +'<div class="sfoot-social">'+soc("facebook")+soc("instagram")+soc("linkedin")+'</div></div>'
    +'<div><h4>Navigare</h4>'+lnk("home","Acasă")+lnk("about","Despre noi")+lnk("services","Servicii")+lnk("contact","Contact")+'</div>'
    +'<div><h4>Servicii</h4>'+lnk("services","Depozitare pe paleți")+lnk("services","Transport marfă")+lnk("services","Recepție & expediere")+'<a onclick="renderLogin()">Portal client</a></div>'
    +'<div><h4>Contact</h4><div class="sfoot-contact">'
      +'<a href="mailto:contact@depozit.ro">contact@depozit.ro</a>'
      +'<a href="tel:0700000000">0700 000 000</a>'
      +'<div style="padding:5px 0">Adresă de completat</div>'
      +'<div style="padding:5px 0">Luni–Vineri, 09:00–18:00</div>'
    +'</div></div>'
    +'</div>'
    +'<div class="sfoot-bottom"><span>© '+new Date().getFullYear()+' WSD Logistics — Depozitare & Transport Marfă. Toate drepturile rezervate.</span><a onclick="renderLogin()">Autentificare client</a></div>'
    +'</footer>';
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
    '<section class="site-hero" style="padding:56px 30px"><span class="eyebrow" style="background:rgba(255,255,255,.16);color:#fff">Despre noi</span><h1 style="font-size:36px;margin:0">Despre WSD Logistics</h1><p style="max-width:680px;margin:14px auto 0">Partenerul tău de încredere în depozitare și transport marfă.</p></section>'
    + '<section style="padding:40px 0 26px"><div class="grid" style="grid-template-columns:1.15fr 1fr;gap:30px;align-items:center">'
    + '<div><span class="eyebrow">Cine suntem</span><h2 style="font-size:26px;margin:0 0 14px">Un partener logistic complet</h2>'
    + '<p class="muted" style="line-height:1.75;font-size:15px">WSD Logistics este un partener de <b>depozitare și transport marfă</b> pentru companiile care vor să-și externalizeze logistica fără compromisuri. Preluăm marfa, o depozităm în siguranță pe paleți în locații dedicate și o livrăm la destinație — rapid și corect.</p>'
    + '<p class="muted" style="line-height:1.75;font-size:15px">Combinăm un depozit bine organizat cu servicii de transport și cu tehnologie modernă: fiecare client are acces la un <b>portal online</b> unde vede în timp real ce stoc are, pe ce locații și ce mișcări s-au făcut cu marfa lui.</p>'
    + '<p class="muted" style="line-height:1.75;font-size:15px">Fie că ai nevoie de spațiu de depozitare pe termen scurt sau de un partener logistic permanent, ne adaptăm nevoilor afacerii tale — de la câțiva paleți până la operațiuni complexe.</p></div>'
    + '<figure style="margin:0;border-radius:14px;overflow:hidden;box-shadow:var(--shadow)"><img src="/assets/site-1.png" style="width:100%;display:block" alt="Depozit WSD Logistics" loading="lazy"></figure>'
    + '</div></section>'
    // bandă statistici
    + '<section style="padding:6px 0"><div class="stat-strip">'
    + statItem("12.000","m²","Spațiu de depozitare")
    + statItem("8.500","+ paleți","Gestionați lunar")
    + statItem("300","+ livrări","Expediate lunar")
    + statItem("99,2","%","Comenzi la timp")
    + '</div><p class="muted center" style="font-size:11.5px;margin:8px 0 0">* cifre orientative — se înlocuiesc cu datele reale WSD Logistics</p></section>'
    + '<section class="card" style="padding:32px;margin:26px 0;text-align:center"><span class="eyebrow">Misiunea noastră</span><h2 style="font-size:22px;margin:0 0 10px">De ce facem asta</h2><p class="muted" style="max-width:720px;margin:0 auto;line-height:1.7;font-size:15.5px">Îți simplificăm logistica: tu te concentrezi pe vânzări și pe clienții tăi, noi ne ocupăm de depozitare, manipulare și transport — cu <b>transparență totală</b> și marfa mereu sub control.</p></section>'
    + '<section style="padding:26px 0;text-align:center"><span class="eyebrow">Valori</span><h2 style="font-size:24px;margin:0 0 24px">Valorile noastre</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));text-align:left">'
    + whoCard("shield","Siguranță","Spații securizate și marfă gestionată cu grijă, de la recepție la livrare.")
    + whoCard("eye","Transparență","Acces online la stocul tău — vezi oricând ce ai și unde.")
    + whoCard("clock","Punctualitate","Recepții, expedieri și transport la timp, de fiecare dată.")
    + whoCard("handshake","Flexibilitate","Soluții adaptate volumului și ritmului afacerii tale.")
    + whoCard("monitor","Tehnologie","Sistem WMS modern, coduri de bare și trasabilitate completă.")
    + whoCard("boxes","Grijă pentru marfă","Manipulare corectă și organizare riguroasă pe paleți.")
    + '</div></section>'
    + '<section class="card" style="padding:32px;margin:20px 0;text-align:center"><h2 style="font-size:22px;margin:0 0 8px">Hai să lucrăm împreună</h2><p class="muted" style="margin:0 0 16px">Spune-ne ce marfă ai și îți facem o ofertă adaptată.</p><button onclick="siteGo(\\'contact\\')" style="padding:12px 26px">Cere o ofertă</button></section>');
};
window.renderServices = function(){
  var svc=[
    ["boxes","Depozitare pe paleți","Spațiu securizat cu locații dedicate pe rafturi și zone. Fiecare palet e etichetat și urmărit individual, cu evidență exactă a cantităților."],
    ["receive","Recepție marfă","Preluăm și verificăm marfa la sosire, o înregistrăm în sistem și o depozităm rapid pe locații — cu confirmare pe cantități."],
    ["ship","Expediere & picking","Pregătim comenzile tale (picking de pe paleți), le verificăm și le expediem corect și la timp."],
    ["truck","Transport marfă","Livrăm marfa la destinație cu flotă proprie/parteneri — de la ultimul kilometru până la transport pe distanțe lungi."],
    ["eye","Portal client","Cont online unde vezi în timp real stocul tău, pe ce locații se află și fiecare mișcare a mărfii."],
    ["chart","Rapoarte & inventar","Stocuri, mișcări, produse sub prag și export — control complet asupra mărfii tale."],
    ["tag","Coduri de bare & trasabilitate","Identificare rapidă prin scanare (EAN/QR) și istoric complet: cine, ce, când."],
    ["puzzle","Soluții personalizate","Ne adaptăm fluxul la nevoile tale — de la câțiva paleți la operațiuni complexe."]
  ].map(function(s){ return whoCard(s[0],s[1],s[2]); }).join("");
  var proc=[
    ["1","Recepție","Primim și verificăm marfa ta."],
    ["2","Depozitare","O așezăm pe paleți, în locații dedicate."],
    ["3","Management stoc","O urmărim în timp real în sistem."],
    ["4","Picking & expediere","Pregătim comenzile la cerere."],
    ["5","Transport & livrare","Ducem marfa la destinație."]
  ].map(function(p){ return '<div class="card lcard" style="padding:18px;text-align:center"><div class="pill" style="background:var(--brand);color:#fff;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;font-weight:700">'+p[0]+'</div><h4 style="margin:10px 0 5px;font-size:14px">'+esc(p[1])+'</h4><div class="muted" style="font-size:12.5px;line-height:1.5">'+esc(p[2])+'</div></div>'; }).join("");
  var ind=[["cart","E-commerce & retail"],["boxes","Distribuitori & angro"],["factory","Producători"],["globe","Importatori & exportatori"],["tag","FMCG & bunuri de consum"]]
    .map(function(x){ return '<div class="card lcard" style="padding:16px;display:flex;align-items:center;gap:12px"><span class="icircle" style="width:40px;height:40px">'+svgIcon(x[0])+'</span><b style="font-size:14px">'+esc(x[1])+'</b></div>'; }).join("");
  sitePage("services",
    '<section class="site-hero" style="padding:56px 30px"><span class="eyebrow" style="background:rgba(255,255,255,.16);color:#fff">Servicii</span><h1 style="font-size:36px;margin:0">Serviciile noastre</h1><p style="max-width:680px;margin:14px auto 0">Depozitare, transport marfă și vizibilitate online — logistica ta, completă.</p></section>'
    + '<section style="padding:40px 0 30px;text-align:center"><span class="eyebrow">Ce oferim</span><h2 style="font-size:24px;margin:0 0 24px">Servicii complete de logistică</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));text-align:left">'+svc+'</div></section>'
    + '<section style="padding:14px 0 8px;text-align:center"><span class="eyebrow">Proces</span><h2 style="font-size:24px;margin:0 0 24px">Cum funcționează procesul</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));text-align:left">'+proc+'</div></section>'
    + '<section style="padding:30px 0;text-align:center"><span class="eyebrow">Clienți</span><h2 style="font-size:24px;margin:0 0 22px">Pentru cine lucrăm</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));text-align:left">'+ind+'</div></section>'
    + '<section class="card" style="padding:32px;margin:16px 0;text-align:center"><h2 style="font-size:22px;margin:0 0 8px">Pregătit să externalizezi logistica?</h2><p class="muted" style="margin:0 0 16px">Îți facem o ofertă adaptată nevoilor tale.</p><button onclick="siteGo(\\'contact\\')" style="padding:12px 26px">Cere o ofertă</button></section>');
};
window.renderContact = function(){
  var crow=function(ic,label,val){ return '<div style="display:flex;align-items:center;gap:13px"><span class="icircle" style="width:42px;height:42px;flex:0 0 auto">'+svgIcon(ic)+'</span><div><div class="muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em">'+esc(label)+'</div><div style="font-size:14.5px;font-weight:600">'+val+'</div></div></div>'; };
  sitePage("contact",
    '<section class="site-hero" style="padding:52px 30px"><span class="eyebrow" style="background:rgba(255,255,255,.16);color:#fff">Contact</span><h1 style="font-size:34px;margin:0">Hai să vorbim</h1><p style="max-width:640px;margin:12px auto 0">Scrie-ne și îți facem o ofertă de depozitare adaptată mărfii tale.</p></section>'
    + '<section style="padding:38px 0"><div class="grid" style="grid-template-columns:1fr 1.1fr;gap:26px">'
    + '<div class="card" style="padding:26px"><span class="eyebrow">Date de contact</span><h2 style="font-size:18px;margin:6px 0 20px">Ne găsești aici</h2><div style="display:grid;gap:18px">'
    + crow("contact","Email",'<a href="mailto:contact@depozit.ro" style="color:inherit;text-decoration:none">contact@depozit.ro</a>')
    + crow("phone","Telefon",'<a href="tel:+40700000000" style="color:inherit;text-decoration:none">0700 000 000</a>')
    + crow("pin","Adresă","Adresă depozit (de completat)")
    + crow("clock","Program","Luni–Vineri, 08:00–18:00")
    + '</div><div class="sfoot-social" style="margin-top:24px"><a href="#" onclick="return false">'+svgIcon("facebook")+'</a><a href="#" onclick="return false">'+svgIcon("instagram")+'</a><a href="#" onclick="return false">'+svgIcon("linkedin")+'</a></div></div>'
    + '<form class="card" style="padding:26px" onsubmit="return sendContact(event)"><span class="eyebrow">Formular</span><h2 style="font-size:18px;margin:6px 0 18px">Trimite-ne un mesaj</h2>'
    + field("Nume","ct_name","")+field("Email","ct_email","","","email")
    + '<div class="field"><label>Mesaj</label><textarea id="ct_msg" rows="4" placeholder="Spune-ne ce marfă ai și de ce ai nevoie..."></textarea></div>'
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
    return '<div class="card lcard" style="padding:22px"><div style="font-size:30px">'+s[0]+'</div><h3 style="margin:10px 0 6px;font-size:16px">'+s[1]+'</h3><div class="muted" style="font-size:13.5px;line-height:1.5">'+s[2]+'</div></div>';
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
    // bandă statistici
    + '<section style="padding:6px 0 0"><div class="stat-strip">'
    + statItem("12.000","m²","Spațiu de depozitare")
    + statItem("8.500","+ paleți","Gestionați lunar")
    + statItem("300","+ livrări","Expediate lunar")
    + statItem("99,2","%","Comenzi la timp")
    + '</div><p class="muted center" style="font-size:11.5px;margin:8px 0 0">* cifre orientative — se înlocuiesc cu datele reale WSD Logistics</p></section>'
    // trust icons sub hero
    + '<section style="padding:14px 0 0"><div class="trustbar">'
    + trustItem("shield","Marfă în siguranță","Depozit securizat")
    + trustItem("eye","Vizibilitate 24/7","Stoc online, în timp real")
    + trustItem("route","Trasabilitate completă","Fiecare mișcare, urmărită")
    + trustItem("clock","Livrare la timp","Transport rapid și corect")
    + '</div></section>'
    // servicii
    + '<section style="padding:40px 0 34px;text-align:center"><span class="eyebrow">Servicii</span><h2 style="font-size:24px;margin:0 0 8px">Serviciile noastre</h2><p class="muted center" style="margin:0 auto 24px;max-width:560px">Tot ce-ți trebuie ca să-ți externalizezi logistica, într-un singur loc.</p>'
    + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));text-align:left">'+svc+'</div></section>'
    // pentru cine
    + '<section style="padding:16px 0 34px;text-align:center"><span class="eyebrow">Clienți</span><h2 style="font-size:24px;margin:0 0 8px">Pentru cine este WSD Logistics</h2><p class="muted center" style="margin:0 auto 24px;max-width:580px">Lucrăm cu companii care au nevoie de depozitare sigură și transport rapid, din diverse industrii.</p>'
    + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));text-align:left">'
    + whoCard("cart","E-commerce & retail","Externalizează stocarea și livrarea comenzilor. Ne ocupăm de recepție, picking și expediere pentru fiecare comandă.")
    + whoCard("boxes","Distribuitori & angro","Depozităm stocuri mari pe paleți și coordonăm livrările către rețeaua ta de clienți, cu vizibilitate completă.")
    + whoCard("globe","Importatori & exportatori","Preluăm marfa din vamă sau port, o depozităm în siguranță și o pregătim pentru distribuție sau export.")
    + whoCard("factory","Producători","Stocăm produsul finit și materiile prime, eliberând spațiu în fabrică pentru producție.")
    + '</div></section>'
    // cum functioneaza
    + '<section style="padding:34px 0;text-align:center"><span class="eyebrow">Cum lucrăm</span><h2 style="font-size:24px;margin:0 0 24px">Cum funcționează</h2>'
    + '<div style="text-align:left">'
    + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">'
    + step(1,"Ne trimiți marfa","O recepționăm și o depozităm pe locații dedicate.")
    + step(2,"O vezi online","Primești un cont și vezi fiecare produs, în timp real.")
    + step(3,"Pregătim comenzile","Facem picking-ul și verificăm marfa la cerere.")
    + step(4,"Transportăm & livrăm","Ducem marfa la destinație, rapid și în siguranță.")
    + '</div></div></section>'
    // de ce WSD (checklist)
    + '<section style="padding:20px 0 34px"><div style="text-align:center"><span class="eyebrow">Avantaje</span><h2 style="font-size:24px;margin:0 0 8px">De ce să alegi WSD Logistics</h2><p class="muted" style="margin:0 auto 26px;max-width:560px">Siguranță, transparență și profesionalism la fiecare pas.</p></div>'
    + '<div class="card" style="padding:26px 28px"><div class="checkwrap">'
    + checkItem("Marfă asigurată","Stocul tău este acoperit printr-o poliță de asigurare pe toată perioada depozitării.")
    + checkItem("Contract clar, fără costuri ascunse","Tarife transparente, stabilite de la început — fără surprize la factură.")
    + checkItem("Depozit securizat 24/7","Acces controlat, supraveghere video și pază permanentă.")
    + checkItem("Raportare & acces online","Vezi stocul, comenzile și livrările în timp real, din portalul de client.")
    + checkItem("Echipă cu experiență","Oameni specializați în depozitare și transport marfă, dedicați afacerii tale.")
    + checkItem("Flexibilitate contractuală","Mărim sau reducem spațiul de depozitare după sezonalitatea afacerii tale.")
    + '</div></div></section>'
    // galerie
    + '<section style="padding:20px 0"><div style="text-align:center"><span class="eyebrow">Galerie</span><h2 style="font-size:24px;margin:0 0 22px">Depozitul nostru</h2></div>'
    + '<div class="gallery">'
    + '<figure><img src="/assets/login-bg.png" alt="Culoar depozit" loading="lazy"><figcaption>Rafturi & culoare</figcaption></figure>'
    + '<figure><img src="/assets/site-1.png" alt="Marfă pe paleți" loading="lazy"><figcaption>Marfă pe paleți</figcaption></figure>'
    + '<figure><img src="/assets/site-2.png" alt="Recepție marfă" loading="lazy"><figcaption>Recepție & expediere</figcaption></figure>'
    + '</div></section>'
    // testimoniale
    + '<section style="padding:38px 0 30px;text-align:center"><span class="eyebrow">Testimoniale</span><h2 style="font-size:24px;margin:0 0 8px">Ce spun clienții noștri</h2><p class="muted center" style="margin:0 auto 24px;max-width:560px;font-size:12.5px">Exemple — de înlocuit cu recenzii reale ale clienților WSD Logistics înainte de lansare.</p>'
    + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));text-align:left">'
    + testimonial("De când lucrăm cu WSD Logistics nu ne mai facem griji pentru stoc — vedem totul în timp real din portal, iar livrările ajung mereu la timp.","Manager E-commerce")
    + testimonial("Am redus semnificativ timpul de procesare a comenzilor de când am externalizat depozitarea. Comunicarea este rapidă și profesionistă.","Director Distribuție")
    + testimonial("Ne-am mutat marfa la WSD fără nicio pauză în activitate. Echipa a fost implicată și organizată încă din prima zi.","Antreprenor")
    + '</div></section>'
    // FAQ
    + '<section style="padding:20px 0 36px"><div style="text-align:center"><span class="eyebrow">FAQ</span><h2 style="font-size:24px;margin:0 0 24px">Întrebări frecvente</h2></div><div class="faq">'
    + faqItem("Ce tip de marfă puteți depozita?","Depozităm marfă paletizată din majoritatea industriilor — retail, e-commerce, distribuție și producție. Pentru mărfuri cu cerințe speciale (refrigerare, produse periculoase etc.) contactează-ne pentru a verifica disponibilitatea.")
    + faqItem("Cum văd stocul meu în timp real?","Primești acces la portalul online de client, unde urmărești stocul, comenzile și livrările 24/7, de pe orice dispozitiv.")
    + faqItem("Care este durata minimă de contractare?","Ne adaptăm nevoilor tale — oferim atât contracte pe termen lung, cât și soluții flexibile, pe termen scurt sau sezoniere.")
    + faqItem("Este marfa mea asigurată în depozit?","Da, marfa depozitată este acoperită printr-o poliță de asigurare pe toată durata contractului.")
    + faqItem("Cum încep colaborarea cu WSD Logistics?","Completezi formularul de ofertă, te contactăm pentru detalii despre volumul și tipul mărfii, apoi stabilim împreună condițiile contractuale și data de start.")
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
  return '<div class="card lcard" style="padding:20px"><div class="pill" style="background:var(--brand);color:#fff;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px">'+n+'</div><h3 style="margin:10px 0 6px;font-size:15px">'+esc(t)+'</h3><div class="muted" style="font-size:13px;line-height:1.5">'+esc(d)+'</div></div>';
}
function statItem(num,suf,lbl){ return '<div class="stat-item"><div class="stat-num">'+esc(num)+(suf?'<span> '+esc(suf)+'</span>':'')+'</div><div class="stat-lbl">'+esc(lbl)+'</div></div>'; }
function whoCard(ic,t,d){ return '<div class="card lcard" style="padding:22px"><div class="icircle">'+svgIcon(ic)+'</div><h3 style="margin:14px 0 6px;font-size:15.5px">'+esc(t)+'</h3><div class="muted" style="font-size:13.5px;line-height:1.55">'+esc(d)+'</div></div>'; }
function checkItem(t,d){ return '<div class="checkitem"><span class="ci">'+svgIcon("check")+'</span><div><b>'+esc(t)+'</b><small>'+esc(d)+'</small></div></div>'; }
function testimonial(q,role){ return '<div class="card lcard tcard" style="padding:22px"><div class="tquote">&#8220;</div><div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p style="font-size:13.8px;line-height:1.6;font-style:italic;margin:0;color:#374151">'+esc(q)+'</p><div style="margin-top:auto;padding-top:8px"><b style="font-size:13.5px">'+esc(role)+'</b><div class="muted" style="font-size:11.5px;font-style:italic">client exemplu</div></div></div>'; }
function faqItem(q,a){ return '<div class="faq-item"><div class="faq-q" onclick="this.parentNode.classList.toggle(\\'open\\')"><span>'+esc(q)+'</span><span class="fqi">'+svgIcon("plus")+'</span></div><div class="faq-a"><div>'+esc(a)+'</div></div></div>'; }

/* ---------------- Portal client ---------------- */
var pview = "stock";
var portalMe = null;
function portalFirmHtml(){
  var c = portalMe && portalMe.client;
  if(!c) return '<div class="muted" style="font-size:12px">Portal client</div>';
  var lines='';
  if(c.cui) lines+='<div>CUI: '+esc(c.cui)+'</div>';
  if(c.reg_com) lines+='<div>'+esc(c.reg_com)+'</div>';
  if(c.address) lines+='<div>'+esc(c.address)+'</div>';
  if(c.phone) lines+='<div>📞 '+esc(c.phone)+'</div>';
  if(c.email) lines+='<div>✉️ '+esc(c.email)+'</div>';
  return '<div class="card" style="padding:11px 12px;background:var(--panel-2)">'
    +'<div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:3px">Contul firmei</div>'
    +'<b style="font-size:13.5px;line-height:1.3;display:block">'+esc(c.name)+'</b>'
    +(lines?'<div class="muted" style="font-size:11.5px;line-height:1.55;margin-top:4px">'+lines+'</div>':'')
    +'</div>';
}
window.renderPortal = function(){
  var nav = [["stock","Stocul meu"],["pallets","Paleții mei"],["orders","Comenzile mele"],["movements","Mișcări"]].map(function(n){
    return '<a class="nav'+(pview===n[0]?' active':'')+'" href="#" onclick="pgo(\\''+n[0]+'\\');return false">'+n[1]+'</a>';
  }).join("");
  document.getElementById("root").innerHTML =
    '<div id="app">'
    + '<div class="mtop"><button class="burger" onclick="toggleMenu()" aria-label="Meniu">'+svgIcon("menu")+'</button><img src="/assets/logo.png" alt="WSD Logistics"></div>'
    + '<div class="drawer-bg" onclick="closeMenu()"></div>'
    + '<aside>'
    + '<div style="padding:10px 12px 8px"><img src="/assets/logo.png" alt="WSD Logistics" style="width:100%;max-width:150px;display:block"></div>'
    + '<div id="pfirm" style="padding:0 12px 12px">'+portalFirmHtml()+'</div>'
    + nav
    + '<div style="flex:1"></div>'
    + '<div class="muted" style="padding:8px 12px;font-size:12px">'+esc(me.name)+'<br><span class="pill mut">client</span> <span class="muted" style="font-size:10px">'+APP_VERSION+'</span></div>'
    + '<button class="ghost sm" onclick="logout()">Ieșire</button>'
    + '</aside><main id="main"></main></div>';
  portalRender(pview);
  if(!portalMe){
    api("GET","/api/portal/me").then(function(d){ portalMe=d; var f=el("pfirm"); if(f) f.innerHTML=portalFirmHtml(); }).catch(function(){});
  }
};
// pgo: schimbă vederea → re-randează shell-ul (care încarcă conținutul). FĂRĂ recursie.
window.pgo = function(v){ pview=v; renderPortal(); };
function portalRender(v){
  if(v==="movements") portalMovements();
  else if(v==="pallets") portalPallets();
  else if(v==="orders") portalOrders();
  else portalStock();
}

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
      var resv=Number(p.reserved||0), avail=Number(p.available!=null?p.available:(p.total-resv));
      return '<tr><td><b>'+esc(p.barcode||p.sku)+'</b></td><td>'+esc(p.name)+'</td>'
        +'<td class="right">'+esc(p.total)+' '+esc(p.unit||"")+'</td>'
        +'<td class="right">'+(resv>0?'<span class="pill warn">'+resv+'</span>':'<span class="muted">0</span>')+'</td>'
        +'<td class="right"><b>'+avail+'</b></td>'
        +'<td style="font-size:12px">'+locs+'</td></tr>';
    }).join("");
    el("pstock").innerHTML='<table><thead><tr><th>EAN</th><th>Produs</th><th class="right">În stoc</th><th class="right">Rezervat</th><th class="right">Disponibil</th><th>Locații</th></tr></thead><tbody>'+(rows||'<tr><td colspan=6 class="muted center">Nu ai încă marfă în depozit</td></tr>')+'</tbody></table>';
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

/* ---- Comenzi de livrare (portal client) ---- */
function porderStatusPill(s){
  if(s==="completed") return '<span class="pill good">Expediată</span>';
  if(s==="cancelled") return '<span class="pill bad">Anulată</span>';
  if(s==="confirmed") return '<span class="pill warn">În așteptare</span>';
  return '<span class="pill mut">Ciornă</span>';
}
function portalOrders(){
  setMain(topbar("Comenzile mele", '<button onclick="portalOrderNew()">+ Comandă nouă</button>') + '<div class="card" id="pord">…</div>');
  api("GET","/api/portal/orders").then(function(d){
    var rows=(d.orders||[]).map(function(o){
      return '<tr onclick="portalOrderView('+o.id+')" style="cursor:pointer">'
        +'<td><b>'+esc(o.code)+'</b></td>'
        +'<td class="muted">'+esc(String(o.created_at).slice(0,16))+'</td>'
        +'<td>'+esc(o.recipient_name||"—")+(o.recipient_city?(' <span class="muted">· '+esc(o.recipient_city)+'</span>'):'')+'</td>'
        +'<td class="right">'+esc(o.line_count)+' prod. / '+esc(o.total_qty)+' buc.</td>'
        +'<td>'+porderStatusPill(o.status)+'</td></tr>';
    }).join("");
    el("pord").innerHTML='<table><thead><tr><th>Comandă</th><th>Data</th><th>Destinatar</th><th class="right">Conținut</th><th>Status</th></tr></thead><tbody>'
      +(rows||'<tr><td colspan=5 class="muted center">Nicio comandă încă. Apasă «+ Comandă nouă» ca să trimiți o livrare.</td></tr>')+'</tbody></table>';
  });
}
var porderLines = [];
var pProducts = [];
function portalOrderNew(){
  porderLines = [];
  setMain(topbar("Comandă nouă de livrare", '<button class="ghost" onclick="pgo(\\'orders\\')">← Înapoi</button>')
    + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:start">'
    + '<div class="card" style="padding:20px"><h2>Destinatar (clientul tău)</h2>'
      + field("Nume / firmă destinatar","o_rname","","","text","Numele sau firma clientului tău final.")
      + field("Telefon","o_rphone","","","text","Telefonul destinatarului pentru livrare.")
      + '<div class="field"><label>Adresă</label><textarea id="o_raddr" rows="2"></textarea>'+fhint("Strada și numărul de livrare.")+'</div>'
      + '<div class="row"><div style="flex:1">'+field("Oraș","o_rcity","","","text","Ex: Cluj-Napoca.")+'</div><div style="flex:1">'+field("Județ","o_rcounty","","","text","Ex: Cluj.")+'</div></div>'
      + field("Cod poștal","o_rpostal","","","text","Ex: 400123.")
      + '<div class="field"><label>Observații (opțional)</label><textarea id="o_note" rows="2" placeholder="Ex: livrare în intervalul 9-17, sună înainte..."></textarea></div>'
    + '</div>'
    + '<div class="card" style="padding:20px"><h2>Produse de livrat</h2>'
      + '<div class="row" style="align-items:flex-end;gap:8px"><div style="flex:1"><label>Produs</label><select id="o_prod"><option>Se încarcă…</option></select></div>'
      + '<div style="width:90px"><label>Cant.</label><input id="o_qty" type="number" min="1" value="1"></div>'
      + '<button class="sm" onclick="porderAddLine()">Adaugă</button></div>'
      + '<div id="o_lines" style="margin-top:14px"></div>'
      + '<button style="width:100%;margin-top:14px" onclick="porderSubmit()">Trimite comanda</button>'
    + '</div></div>');
  porderRenderLines();
  api("GET","/api/portal/products").then(function(d){
    pProducts = d.products||[];
    el("o_prod").innerHTML = pProducts.length
      ? pProducts.map(function(p){ return '<option value="'+p.id+'">'+esc(p.name)+' (disponibil: '+esc(p.total)+' '+esc(p.unit||"")+')</option>'; }).join("")
      : '<option value="">Nu ai produse în depozit</option>';
  });
}
window.porderAddLine = function(){
  var pid = Number(el("o_prod").value);
  var qty = Number(el("o_qty").value);
  if(!pid){ toast("Alege un produs","bad"); return; }
  if(!(qty>0)){ toast("Cantitate invalidă","bad"); return; }
  var p = pProducts.find(function(x){return x.id===pid;});
  if(!p) return;
  var ex = porderLines.find(function(l){return l.product_id===pid;});
  if(ex){ ex.quantity += qty; } else { porderLines.push({product_id:pid, name:p.name, unit:p.unit, avail:p.total, quantity:qty}); }
  el("o_qty").value=1;
  porderRenderLines();
};
window.porderRemoveLine = function(i){ porderLines.splice(i,1); porderRenderLines(); };
function porderRenderLines(){
  var c=el("o_lines"); if(!c) return;
  if(!porderLines.length){ c.innerHTML='<div class="muted" style="padding:8px 0">Niciun produs adăugat.</div>'; return; }
  c.innerHTML='<table><thead><tr><th>Produs</th><th class="right">Cant.</th><th></th></tr></thead><tbody>'
    + porderLines.map(function(l,i){
        var over = (l.quantity>l.avail) ? ' <span class="pill bad" style="font-size:10px">peste stoc</span>' : '';
        return '<tr><td>'+esc(l.name)+over+'</td><td class="right">'+esc(l.quantity)+' '+esc(l.unit||"")+'</td>'
          +'<td class="right"><button class="danger sm" onclick="porderRemoveLine('+i+')">✕</button></td></tr>';
      }).join("")
    + '</tbody></table>';
}
window.porderSubmit = function(){
  if(!porderLines.length){ toast("Adaugă cel puțin un produs","bad"); return; }
  var name=el("o_rname").value.trim(), addr=el("o_raddr").value.trim();
  if(!name){ toast("Completează numele destinatarului","bad"); return; }
  if(!addr){ toast("Completează adresa destinatarului","bad"); return; }
  var body={
    recipient_name:name, recipient_phone:el("o_rphone").value.trim(), recipient_address:addr,
    recipient_city:el("o_rcity").value.trim(), recipient_county:el("o_rcounty").value.trim(), recipient_postal:el("o_rpostal").value.trim(),
    note:el("o_note").value.trim(),
    lines:porderLines.map(function(l){return {product_id:l.product_id, quantity:l.quantity};})
  };
  api("POST","/api/portal/orders",body).then(function(){ toast("Comandă trimisă"); pgo("orders"); }).catch(function(e){ toast(e.message,"bad"); });
};
window.portalOrderView = function(id){
  api("GET","/api/portal/orders/"+id).then(function(d){
    var o=d.order;
    var lines=(d.lines||[]).map(function(l){return '<tr><td><b>'+esc(l.sku)+'</b></td><td>'+esc(l.product_name)+'</td><td class="right">'+esc(l.quantity)+' '+esc(l.unit||"")+'</td></tr>';}).join("")
      || '<tr><td colspan=3 class="muted center">Fără produse</td></tr>';
    var addr=[o.recipient_address,o.recipient_city,o.recipient_county,o.recipient_postal].filter(Boolean).map(esc).join(", ");
    modal("Comanda "+esc(o.code),
      '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px"><span>'+porderStatusPill(o.status)+'</span><span class="muted">'+esc(String(o.created_at).slice(0,16))+'</span></div>'
      +'<div class="card" style="padding:12px;margin-bottom:12px"><b>'+esc(o.recipient_name||"—")+'</b>'
        +(o.recipient_phone?'<div class="muted" style="font-size:13px">📞 '+esc(o.recipient_phone)+'</div>':'')
        +(addr?'<div class="muted" style="font-size:13px">📍 '+addr+'</div>':'')
        +(o.note?'<div style="font-size:13px;margin-top:6px">📝 '+esc(o.note)+'</div>':'')+'</div>'
      +'<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">Cant.</th></tr></thead><tbody>'+lines+'</tbody></table>'
      +((o.status!=="completed"&&o.status!=="cancelled")?'<div class="row" style="margin-top:14px"><button class="danger" onclick="porderCancel('+o.id+',\\''+o.code+'\\')">Anulează comanda</button></div>':''),
      function(){ closeModal(); });
    el("modalSave").textContent="Închide";
    var cancelBtn=el("modalBg").querySelector(".ghost"); if(cancelBtn) cancelBtn.style.display="none";
  }).catch(function(e){ toast(e.message,"bad"); });
};
window.porderCancel = function(id, code){
  modal("Anulează comanda "+esc(code||("#"+id)),
    '<p>Sigur vrei să anulezi comanda <b>'+esc(code||("#"+id))+'</b>?</p>'
    +'<p class="muted" style="font-size:13px">Comanda rămâne în listă cu statusul «Anulată», iar stocul rezervat se eliberează.</p>',
    function(){
      api("POST","/api/portal/orders/"+id+"/cancel",{}).then(function(){ closeModal(); toast("Comandă anulată"); pgo("orders"); }).catch(function(e){ toast(e.message,"bad"); });
    });
  var sv=el("modalSave"); if(sv){ sv.textContent="Da, anulează comanda"; sv.className="danger"; sv.style.display=""; }
};

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
    '<div id="app">'
    + '<div class="mtop"><button class="burger" onclick="toggleMenu()" aria-label="Meniu">'+svgIcon("menu")+'</button><img src="/assets/logo.png" alt="WSD Logistics"></div>'
    + '<div class="drawer-bg" onclick="closeMenu()"></div>'
    + '<aside>'
    + '<div style="padding:10px 12px 14px"><img src="/assets/logo.png" alt="WSD Logistics" style="width:100%;max-width:150px;display:block"></div>'
    + nav
    + '<button class="ghost sm" style="margin:8px 6px 2px" onclick="scanCamera(handleScanResult)">📷 Scanează</button>'
    + '<a class="ghost sm" href="/instalare" target="_blank" style="margin:2px 6px;text-align:center;text-decoration:none;border:1px solid var(--border);border-radius:8px;padding:5px 10px;color:var(--text);font-weight:600;font-size:12.5px;display:block">📲 Instalare Zebra (QR)</a>'
    + '<div style="flex:1"></div>'
    + '<div class="muted" style="padding:8px 12px;font-size:12px">'+esc(me.name)+'<br><span class="pill mut">'+esc(me.role)+'</span> <span class="muted" style="font-size:10px">'+APP_VERSION+'</span></div>'
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
window.toggleMenu = function(){ var a=el("app"); if(a) a.classList.toggle("menu-open"); };
window.closeMenu = function(){ var a=el("app"); if(a) a.classList.remove("menu-open"); };
function topbar(title, right){ return '<div class="topbar"><h1>'+esc(title)+'</h1><div class="row">'+(right||"")+'</div></div>'; }

/* ---------------- Views ---------------- */
var VIEWS = {};

VIEWS.dashboard = function(){
  setMain(topbar("Dashboard") + '<div id="dash">Se încarcă…</div>');
  api("GET","/api/dashboard").then(function(d){
    var k=d.kpis;
    var kpis = '<div class="kpis" style="grid-template-columns:repeat(6,1fr)">'
      + kpi(k.products,"Produse active")
      + kpi(k.locations,"Locații")
      + kpi(k.total_units,"Unități în stoc")
      + kpi(k.reserved||0,"Rezervat (comenzi)")
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
  var bulk = can("operator")
    ? '<div class="card" id="pbulk" style="display:none;padding:10px 14px;margin-bottom:12px">'
      + '<div class="row" style="align-items:center;gap:10px">'
      + '<b><span id="pselcount">0</span> produse selectate</b><div class="spacer" style="flex:1"></div>'
      + '<label style="margin:0">Mută la client:</label>'
      + '<select id="pbulk_client" style="max-width:220px"><option value="">— intern (al companiei) —</option></select>'
      + '<button class="sm" onclick="reassignSelected()">Mută</button>'
      + (can("admin")?'<button class="danger sm" onclick="deleteSelected()">Șterge selectate</button>':'')
      + '<button class="ghost sm" onclick="pselClear()">Anulează selecția</button>'
      + '</div></div>'
    : '';
  setMain(topbar(title, addBtn+impBtn+exp) + '<div class="toolbar"><input id="pq" placeholder="Caută EAN / SKU / nume" oninput="loadProducts()" style="max-width:320px"></div>' + bulk + '<div class="card" id="ptbl">…</div>');
  if(can("operator")){
    api("GET","/api/clients").then(function(d){
      cache.clients = d.clients;
      var sel=el("pbulk_client"); if(sel) sel.innerHTML='<option value="">— intern (al companiei) —</option>'+d.clients.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join("");
    }).catch(function(){});
  }
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
    '<div class="muted" style="margin-bottom:10px;font-size:12.5px">Coloane recunoscute (prima linie = antet): <b>cod_bare (EAN)</b>, <b>nume</b>, categorie, um, prag, sku, <b>cantitate</b> (opțional). EAN-ul e codul principal.</div>'
    + '<div class="field"><label>Fișier (.xlsx / .xls / .csv)</label><input id="imp_file" type="file" accept=".xlsx,.xls,.csv">'+fhint("Alege fișierul cu produse. Trebuie să aibă coloane EAN și Nume. Opțional: coloană «cantitate» pentru stoc de deschidere.")+'</div>'
    + '<div class="field"><label>Atribuie toate unui client (opțional)</label><select id="imp_client"><option value="">— intern (al companiei) —</option></select>'+fhint("Clientul căruia îi atribui produsele importate.")+'</div>'
    + '<div class="field"><label>Locație pentru stoc de deschidere (opțional)</label><select id="imp_loc"><option value="">— fără stoc (doar catalog) —</option></select>'+fhint("Dacă fișierul are coloana «cantitate» și alegi o locație, se încarcă și stocul aici. Altfel se importă doar catalogul.")+'</div>'
    + '<div style="margin-bottom:10px"><button class="ghost sm" onclick="downloadTemplate()">⬇ Descarcă șablon</button></div>'
    + '<div id="imp_preview" class="muted">Alege un fișier ca să vezi previzualizarea.</div>',
    function(){ importDoImport(); });
  var sv=el("modalSave"); if(sv){ sv.textContent="Importă"; sv.disabled=true; }
  api("GET","/api/clients").then(function(d){ if(el("imp_client")) el("imp_client").innerHTML='<option value="">— intern (al companiei) —</option>'+d.clients.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join(""); }).catch(function(){});
  api("GET","/api/locations").then(function(d){ if(el("imp_loc")) el("imp_loc").innerHTML='<option value="">— fără stoc (doar catalog) —</option>'+(d.locations||[]).map(function(l){return '<option value="'+l.id+'">'+esc(l.code)+'</option>';}).join(""); }).catch(function(){});
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
    reorder_point: Number(impGet(r,["prag","reorder","reorder_point","stoc minim","prag reorder"]))||0,
    quantity: Math.round(Number(String(impGet(r,["cantitate","cant","qty","quantity","stoc","stoc initial","stoc curent","stoc de deschidere"])).replace(",","."))) || 0
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
        var head=_impRows.slice(0,5).map(function(r){ return '<tr><td><b>'+esc(r.barcode||r.sku)+'</b></td><td>'+esc(r.name)+'</td><td>'+esc(r.category)+'</td><td style="text-align:right">'+(r.quantity||0)+'</td></tr>'; }).join("");
        if(!_impRows.length){ el("imp_preview").innerHTML='<div class="pill bad">Niciun rând valid — verifică să existe coloanele «cod_bare» (EAN) și «nume»</div>'; var s=el("modalSave"); if(s) s.disabled=true; return; }
        var withQty=_impRows.filter(function(r){return r.quantity>0;}).length;
        var totQty=_impRows.reduce(function(a,r){return a+(r.quantity||0);},0);
        el("imp_preview").innerHTML='<div style="margin-bottom:6px"><b>'+_impRows.length+'</b> produse valide (din '+rows.length+' rânduri)'
          +(withQty?(' · <b>'+withQty+'</b> cu cantitate (total '+totQty+' buc)'):'')+'</div>'
          +'<div style="max-height:200px;overflow:auto"><table><thead><tr><th>EAN</th><th>Nume</th><th>Categorie</th><th style="text-align:right">Cant.</th></tr></thead><tbody>'+head+'</tbody></table></div>'
          +(_impRows.length>5?'<div class="muted" style="margin-top:4px">…și încă '+(_impRows.length-5)+'</div>':'')
          +(withQty?'<div class="muted" style="margin-top:6px;font-size:12px">💡 Ca să se încarce și stocul, alege o <b>locație</b> mai sus. Fără locație se importă doar catalogul.</div>':'');
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
  api("POST","/api/products/import",{ products:_impRows, client_id: el("imp_client").value?Number(el("imp_client").value):null, location_id: (el("imp_loc")&&el("imp_loc").value)?Number(el("imp_loc").value):null })
    .then(function(d){ closeModal(); toast("Importat: "+d.created+" adăugate · "+d.skipped+" sărite"+(d.stock_loaded?(" · stoc încărcat pentru "+d.stock_loaded+" produse"):"")); loadProducts(); })
    .catch(function(e){ var s=el("modalSave"); if(s) s.disabled=false; toast(e.message,"bad"); });
};
window.downloadTemplate = function(){
  var csv="cod_bare,nume,categorie,um,prag,sku,cantitate\\r\\n5941234567890,Exemplu produs,Ambalaje,buc,10,,25\\r\\n";
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
      var chk = can("operator") ? '<td><input type="checkbox" class="psel" value="'+p.id+'" onclick="pselUpd()" style="width:auto"></td>' : '';
      return '<tr>'+chk+'<td><b>'+ean+'</b>'+skuLine+'</td><td>'+esc(p.name)+'</td><td>'+owner+'</td><td>'+esc(p.category||"—")+'</td>'
        + '<td class="right">'+esc(p.reorder_point)+'</td><td>'+esc(p.unit)+'</td>'
        + '<td>'+(p.active?'<span class="pill good">activ</span>':'<span class="pill mut">inactiv</span>')+'</td>'
        + '<td class="right"><button class="ghost sm" onclick="showBarcode(\\''+esc(p.barcode||p.sku)+'\\',\\''+esc(p.barcode||p.sku)+'\\')">⌗ Bare</button>'
        + ' <button class="ghost sm" onclick="showQR(appOrigin()+\\'/#sku=\\'+encodeURIComponent(\\''+esc(p.sku)+'\\'),\\''+esc(p.barcode||p.sku)+'\\')">▦ QR</button>'
        + (can("operator")?' <button class="ghost sm" onclick="productForm('+p.id+')">Edit</button>':'')
        + (can("admin")?' <button class="danger sm" onclick="deleteProduct('+p.id+')">Șterge</button>':'')
        + '</td></tr>';
    }).join("");
    var selTh = can("operator") ? '<th style="width:34px"><input type="checkbox" onclick="pselAll(this)" style="width:auto"></th>' : '';
    var colspan = can("operator") ? 9 : 8;
    el("ptbl").innerHTML = '<table><thead><tr>'+selTh+'<th>EAN (cod bare)</th><th>Nume</th><th>Client</th><th>Categorie</th><th class="right">Prag</th><th>UM</th><th>Status</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan='+colspan+' class="muted center">Niciun produs</td></tr>')+'</tbody></table>';
    pselUpd();
  });
};
window.pselAll = function(cb){ var xs=document.querySelectorAll(".psel"); for(var i=0;i<xs.length;i++) xs[i].checked=cb.checked; pselUpd(); };
window.pselClear = function(){ var xs=document.querySelectorAll(".psel"); for(var i=0;i<xs.length;i++) xs[i].checked=false; pselUpd(); };
function pselIds(){ var xs=document.querySelectorAll(".psel:checked"); var out=[]; for(var i=0;i<xs.length;i++) out.push(Number(xs[i].value)); return out; }
window.pselUpd = function(){
  var n=pselIds().length, bar=el("pbulk"), c=el("pselcount");
  if(c) c.textContent=n;
  if(bar) bar.style.display = n>0 ? "block" : "none";
};
window.reassignSelected = function(){
  var ids=pselIds();
  if(!ids.length){ toast("Selectează cel puțin un produs","bad"); return; }
  var sel=el("pbulk_client");
  var clientId = sel && sel.value ? Number(sel.value) : null;
  var clientName = sel && sel.value ? sel.options[sel.selectedIndex].text : "intern (al companiei)";
  modal("Confirmă mutarea",
    '<p>Muți <b>'+ids.length+'</b> produse la <b>'+esc(clientName)+'</b>?</p>',
    function(){
      api("POST","/api/products/reassign",{ ids:ids, client_id:clientId }).then(function(r){
        closeModal(); toast("Am mutat "+r.updated+" produse"); loadProducts();
      }).catch(function(e){ toast(e.message,"bad"); });
    });
  var sv=el("modalSave"); if(sv) sv.textContent="Da, mută";
};
window.deleteSelected = function(){
  var ids=pselIds();
  if(!ids.length){ toast("Selectează cel puțin un produs","bad"); return; }
  modal("Confirmă ștergerea definitivă",
    '<p>Sigur vrei să ștergi <b>definitiv</b> cele <b>'+ids.length+'</b> produse selectate?</p>'
    +'<p class="pill bad" style="font-size:12.5px;display:block;padding:8px 10px">⚠️ Ștergere permanentă și ireversibilă. Se șterg și stocul, mișcările, liniile de comandă și prezența pe paleți ale acestor produse.</p>',
    function(){
      api("POST","/api/products/bulk-delete",{ ids:ids }).then(function(r){
        closeModal(); toast("Am șters "+r.deleted+" produse"); loadProducts();
      }).catch(function(e){ toast(e.message,"bad"); });
    });
  var sv=el("modalSave"); if(sv){ sv.textContent="Da, șterge definitiv"; sv.className="danger"; }
};
window.productForm = function(id){
  var p = id ? cache.products.find(function(x){return x.id===id;}) : {unit:"buc",reorder_point:0,active:1};
  modal((id?"Editează":"Adaugă")+" produs",
    '<div class="field"><label>Cod de bare (EAN) — cod principal</label><div class="row"><input id="p_barcode" style="flex:1" value="'+esc(p.barcode||"")+'" placeholder="scanează sau tastează EAN-ul" oninput="bcInfo()"><button type="button" class="ghost" title="Scanează" onclick="scanInto(\\'p_barcode\\',true)">📷</button><button type="button" class="ghost" title="Identifică online" onclick="barcodeLookup()">🔍</button></div>'+fhint("Codul de bare principal (EAN), scanat de pe ambalaj.")+'<div id="p_bc_info" class="muted" style="font-size:11.5px;margin-top:4px"></div></div>'
    + field("SKU (opțional — auto din EAN)","p_sku",p.sku||"",id?"disabled":"","text","Cod intern opțional; dacă îl lași gol, se ia din EAN.")
    + field("Nume","p_name",p.name||"","","text","Denumirea clară a produsului (ex: Detergent lichid 2L).")
    + field("Categorie","p_category",p.category||"","","text","Categoria produsului (ex: Alimente, Cosmetice).")
    + '<div class="field"><label>Client (proprietar marfă)</label><select id="p_client"><option value="">— intern (al companiei) —</option></select>'+fhint("Cui aparține marfa: un client sau intern al firmei.")+'</div>'
    + '<div class="row"><div style="flex:1">'+field("UM","p_unit",p.unit||"buc","","text","Unitatea de măsură (ex: buc, kg, cutie).")+'</div><div style="flex:1">'+field("Prag reorder","p_reorder",p.reorder_point||0,"","number","Sub acest stoc primești alertă de reaprovizionare.")+'</div></div>',
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
    field("Cod (ex: A-01-03)","l_code",l.code||"",id?"disabled":"","text","Codul locației: zonă-raft-nivel (ex: A-01-03).") + field("Nume","l_name",l.name||"","","text","Nume descriptiv opțional al locației.") + field("Zonă","l_zone",l.zone||"","","text","Zona din depozit (ex: A, Frig, Retur).")
    + field("Capacitate (nr. spații / paleți)","l_cap",l.capacity||0,"","number","Câte spații sau paleți încap aici (ex: 4)."),
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
      var resv=Number(s.reserved||0), avail=Number(s.available!=null?s.available:(s.total-resv));
      var resvCell = resv>0 ? '<span class="pill warn">'+resv+'</span>' : '<span class="muted">0</span>';
      return '<tr><td><b>'+esc(s.sku)+'</b></td><td>'+esc(s.name)+'</td>'
        +'<td class="right">'+esc(s.total)+' '+esc(s.unit)+'</td>'
        +'<td class="right">'+resvCell+'</td>'
        +'<td class="right"><b>'+avail+'</b></td>'
        +'<td>'+(s.low?'<span class="pill bad">sub prag</span>':(avail<=0&&s.total>0?'<span class="pill warn">tot rezervat</span>':'<span class="pill good">ok</span>'))+'</td></tr>';
    }).join("");
    el("sumtbl").innerHTML='<table><thead><tr><th>SKU</th><th>Produs</th><th class="right">În stoc</th><th class="right">Rezervat</th><th class="right">Disponibil</th><th>Status</th></tr></thead><tbody>'+(rows||'<tr><td colspan=6 class="muted center">Fără stoc</td></tr>')+'</tbody></table>';
  });
  api("GET","/api/inventory/stock").then(function(d){
    var rows=d.stock.map(function(s){
      return '<tr><td><b>'+esc(s.sku)+'</b></td><td>'+esc(s.product_name)+'</td><td>'+esc(s.location_code)+'</td><td class="right">'+esc(s.quantity)+'</td><td class="muted">'+esc(s.updated_at)+'</td></tr>';
    }).join("");
    el("stbl").innerHTML='<table><thead><tr><th>SKU</th><th>Produs</th><th>Locație</th><th class="right">Cant.</th><th>Actualizat</th></tr></thead><tbody>'+(rows||'<tr><td colspan=5 class="muted center">Fără stoc</td></tr>')+'</tbody></table>';
  });
};

function opForm(title, type){
  var avizBtn = type==="receive" ? '<button class="ghost" onclick="avizUI()">📄 Aviz PDF</button>' : '';
  setMain(topbar(title, avizBtn) + '<div class="card" style="padding:20px;max-width:520px">'
    + '<div id="opmsg"></div>'
    + '<div class="field"><label>⌗ Scanează cod de bare / SKU</label><div class="row"><input id="op_scan" style="flex:1" placeholder="Scanează sau tastează, apoi Enter" onkeydown="if(event.key===\\'Enter\\'){event.preventDefault();opScan();}"><button type="button" class="ghost" onclick="scanCamera(function(t){el(\\'op_scan\\').value=t;opScan();})">📷</button></div>'+fhint("Scanează codul (laser sau 📷), apoi Enter — găsește produsul automat.")+'</div>'
    + '<div class="field"><label>Produs</label><select id="op_prod"></select>'+fhint("Se completează după scanare; sau alege manual din listă.")+'</div>'
    + (type==="transfer"
        ? '<div class="row"><div style="flex:1"><label>Din locația</label><select id="op_from"></select>'+fhint("Locația de unde iei marfa (sursă).")+'</div><div style="flex:1"><label>În locația</label><select id="op_to"></select>'+fhint("Locația unde muți marfa (destinație).")+'</div></div>'
        : '<div class="field"><label>Locație</label><select id="op_loc"></select>'+fhint(type==="receive"?"Locația în care așezi marfa primită.":"Din ce locație scoți marfa.")+'</div>')
    + '<div class="row"><div style="flex:1"><label>Cantitate</label><input id="op_qty" type="number" min="1" value="1">'+fhint("Numărul de bucăți "+(type==="receive"?"primite.":type==="ship"?"expediate.":"mutate."))+'</div><div style="flex:1"><label>Referință (opțional)</label><input id="op_ref">'+fhint("Ex: nr. aviz sau factură.")+'</div></div>'
    + '<div class="field"><label>Notă</label><input id="op_note">'+fhint("Observație opțională despre operațiune.")+'</div>'
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

/* ---- Recepție din aviz/factură PDF (citire EAN + cantități, fără stocare fișier) ---- */
function ensurePdfjs(){
  if(window._pdfjs) return Promise.resolve(window._pdfjs);
  return import("/vendor/pdf.js").then(function(m){
    if(m.GlobalWorkerOptions) m.GlobalWorkerOptions.workerSrc="/vendor/pdf.worker.js";
    window._pdfjs=m; return m;
  });
}
function eanOK(c){
  if(!/^\\d+$/.test(c)) return false;
  if(c.length!==8 && c.length!==13) return false;
  var s=0,f=3;
  for(var i=c.length-2;i>=0;i--){ s+=(c.charCodeAt(i)-48)*f; f=(f===3?1:3); }
  return ((10-(s%10))%10)===(c.charCodeAt(c.length-1)-48);
}
function pdfLines(buf){
  return ensurePdfjs().then(function(pdfjs){
    return pdfjs.getDocument({data:buf}).promise.then(function(doc){
      var lines=[], seq=Promise.resolve();
      function page(n){ return doc.getPage(n).then(function(pg){ return pg.getTextContent().then(function(tc){
        var rows={};
        tc.items.forEach(function(it){ var y=Math.round(it.transform[5]); (rows[y]=rows[y]||[]).push({x:it.transform[4],s:it.str}); });
        Object.keys(rows).sort(function(a,b){return b-a;}).forEach(function(y){
          lines.push(rows[y].sort(function(a,b){return a.x-b.x;}).map(function(o){return o.s;}).join(" "));
        });
      }); }); }
      for(var n=1;n<=doc.numPages;n++){ (function(nn){ seq=seq.then(function(){return page(nn);}); })(n); }
      return seq.then(function(){ return lines; });
    });
  });
}
function avizExtract(lines){
  var byEan={};
  lines.forEach(function(line){
    var all=line.match(/\\d{6,14}/g)||[];
    var eans=all.filter(function(x){ return (x.length===8||x.length===13)&&eanOK(x); });
    if(!eans.length) return;
    var ean=eans[0];
    var rest=line.split(ean).join(" ");
    var toks=rest.split(/\\s+/).filter(function(t){ return /^\\d{1,5}$/.test(t); }).map(Number).filter(function(n){ return n>0; });
    byEan[ean]=(byEan[ean]||0)+(toks.length?toks[0]:1);
  });
  return byEan;
}
window._avizRows=[];
window.avizUI=function(){
  modal("Recepție din aviz PDF",
    '<div class="field"><label>Fișier aviz / factură (PDF)</label><input id="av_file" type="file" accept="application/pdf,.pdf">'+fhint("Citim codurile EAN și cantitățile din PDF. Fișierul NU se salvează.")+'</div>'
    +'<div class="field"><label>Locația de recepție</label><select id="av_loc"></select>'+fhint("Unde așezi marfa primită.")+'</div>'
    +field("Referință","av_ref","","","text","Ex: nr. aviz / factură.")
    +'<div id="av_status" class="muted" style="font-size:12.5px;margin:8px 0"></div>'
    +'<div id="av_res" style="max-height:44vh;overflow:auto"></div>',
    function(){ avizReceiveAll(); });
  var sv=el("modalSave"); if(sv){ sv.textContent="Recepționează"; sv.disabled=true; }
  api("GET","/api/locations").then(function(d){ if(el("av_loc")) el("av_loc").innerHTML=(d.locations||[]).filter(function(l){return l.active;}).map(function(l){return '<option value="'+l.id+'">'+esc(l.code)+'</option>';}).join(""); });
  el("av_file").onchange=avizParse;
};
function avizParse(){
  var f=el("av_file").files[0]; if(!f) return;
  if(!el("av_ref").value) el("av_ref").value=f.name.replace(/\\.pdf$/i,"");
  el("av_status").textContent="Se citește PDF-ul…";
  f.arrayBuffer().then(function(buf){ return pdfLines(buf); }).then(function(lines){
    var byEan=avizExtract(lines);
    var eans=Object.keys(byEan);
    if(!eans.length){ el("av_status").innerHTML='<span class="pill bad" style="display:inline-block;padding:6px 10px">Nu am găsit coduri EAN valide în PDF.</span>'; el("av_res").innerHTML=''; return; }
    return api("GET","/api/products").then(function(d){
      var map={}; (d.products||[]).forEach(function(p){ if(p.barcode) map[String(p.barcode)]=p; });
      window._avizRows=eans.map(function(e){ return {ean:e, product:map[e]||null, qty:byEan[e]}; });
      avizRender();
    });
  }).catch(function(e){ el("av_status").innerHTML='<span class="pill bad" style="display:inline-block;padding:6px 10px">Eroare la citirea PDF: '+esc(e.message)+'</span>'; });
}
function avizRender(){
  var rows=window._avizRows||[];
  var matched=rows.filter(function(r){return r.product;});
  el("av_status").innerHTML='Găsite <b>'+rows.length+'</b> coduri · potrivite cu produse: <b>'+matched.length+'</b>';
  var html='<table><thead><tr><th></th><th>Produs</th><th>EAN</th><th class="right">Cant.</th></tr></thead><tbody>';
  rows.forEach(function(r,i){
    if(r.product){
      html+='<tr><td><input type="checkbox" class="avchk" data-i="'+i+'" checked style="width:auto"></td><td>'+esc(r.product.name)+'</td><td class="muted" style="font-size:12px">'+esc(r.ean)+'</td>'
        +'<td class="right"><input type="number" min="1" value="'+esc(r.qty)+'" class="avqty" data-i="'+i+'" style="width:72px"></td></tr>';
    } else {
      html+='<tr style="opacity:.55"><td>—</td><td class="muted">necunoscut (adaugă produsul)</td><td class="muted" style="font-size:12px">'+esc(r.ean)+'</td><td class="right muted">'+esc(r.qty)+'</td></tr>';
    }
  });
  html+='</tbody></table>';
  if(!matched.length) html+='<div class="muted" style="margin-top:8px;font-size:12.5px">Niciun cod nu se potrivește cu produsele tale. Adaugă întâi produsele cu aceste EAN-uri, apoi reîncarcă avizul.</div>';
  el("av_res").innerHTML=html;
  var sv=el("modalSave"); if(sv) sv.disabled = matched.length===0;
}
window.avizReceiveAll=function(){
  var loc=el("av_loc")?Number(el("av_loc").value):0; if(!loc){ toast("Alege locația","bad"); return; }
  var ref=el("av_ref")?el("av_ref").value:"";
  var items=[];
  Array.prototype.forEach.call(document.querySelectorAll(".avchk:checked"), function(c){
    var i=Number(c.getAttribute("data-i")); var r=window._avizRows[i];
    var qEl=document.querySelector('.avqty[data-i="'+i+'"]'); var qty=qEl?Number(qEl.value):r.qty;
    if(r&&r.product&&qty>0) items.push({product_id:r.product.id, quantity:qty});
  });
  if(!items.length){ toast("Selectează cel puțin un produs","bad"); return; }
  var sv=el("modalSave"); if(sv) sv.disabled=true;
  var done=0, fail=0, seq=Promise.resolve();
  items.forEach(function(it){ seq=seq.then(function(){ return api("POST","/api/inventory/receive",{product_id:it.product_id, location_id:loc, quantity:it.quantity, reference:ref}).then(function(){done++;}).catch(function(){fail++;}); }); });
  seq.then(function(){ closeModal(); toast("Recepționat din aviz: "+done+" produse"+(fail?(" · "+fail+" eșuate"):"")); });
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
    field("Nume","u_name",u.name||"","","text","Numele angajatului care folosește aplicația.") + field("Email","u_email",u.email||"",id?"disabled":"","email","Emailul cu care angajatul se conectează.") + roleSel + fhint("viewer = doar citește · operator = operează stocul · admin = tot.")
    + field(id?"Parolă nouă (opțional)":"Parolă","u_pass","","","password",id?"Completează doar dacă vrei să schimbi parola.":"Parola inițială a angajatului."),
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
    + '<div class="row"><div style="flex:1">'+field("Cod palet","pl_code","","","text","Codul unic al paletului (ex: PAL-000123).")+'</div>'
    + '<div style="flex:1"><label>Client (proprietar)</label><select id="pl_client"><option value="">— fără —</option></select>'+fhint("Clientul care deține marfa de pe palet.")+'</div></div>'
    + '<div class="field"><label>Locație (spațiu)</label><select id="pl_loc"><option value="">— neplasat (draft) —</option></select>'+fhint("Spațiul unde stă paletul (ex: A-01-03).")+'</div>'
    + '<h2 style="margin-top:8px">Produse pe palet</h2>'+fhint("Adaugă produsele și cantitățile aflate pe palet.")+'<div id="pl_lines"></div>'
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
      var fiscal = c.cui ? ('<b>'+esc(c.cui)+'</b>'+(c.reg_com?('<div class="muted" style="font-size:11.5px">'+esc(c.reg_com)+'</div>'):'')) : '<span class="muted">—</span>';
      return '<tr><td><b>'+esc(c.name)+'</b>'+(c.address?('<div class="muted" style="font-size:11.5px">'+esc(c.address)+'</div>'):'')+'</td>'
        +'<td>'+fiscal+'</td><td>'+esc(c.email||"—")+'</td><td>'+esc(c.phone||"—")+'</td>'
        +'<td class="right">'+esc(c.product_count)+'</td><td class="right">'+esc(c.user_count)+'</td>'
        +'<td class="right">'+(can("admin")?'<button class="ghost sm" onclick="clientUsers('+c.id+')">Conturi</button> <button class="ghost sm" onclick="clientForm('+c.id+')">Edit</button> <button class="danger sm" onclick="deleteClient('+c.id+')">Șterge</button>':'')+'</td></tr>';
    }).join("");
    el("cln").innerHTML='<table><thead><tr><th>Client</th><th>CUI / Reg. Com.</th><th>Email</th><th>Telefon</th><th class="right">Produse</th><th class="right">Conturi</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=7 class="muted center">Niciun client</td></tr>')+'</tbody></table>';
  });
};
window.clientForm = function(id){
  var c = id ? cache.clients.find(function(x){return x.id===id;}) : {};
  modal((id?"Editează":"Adaugă")+" client",
    field("Nume / denumire firmă","cl_name",c.name||"","","text","Denumirea completă a firmei client.")
    + '<div class="row"><div style="flex:1">'+field("CUI / CIF","cl_cui",c.cui||"","placeholder=\\'ex: RO12345678\\'","text","Codul fiscal (CUI) al firmei.")+'</div>'
    + '<div style="flex:1">'+field("Nr. Reg. Com.","cl_reg",c.reg_com||"","placeholder=\\'ex: J40/1234/2020\\'","text","Nr. Reg. Comerțului (ex: J40/1234/2020).")+'</div></div>'
    + '<div class="field"><label>Adresă sediu</label><textarea id="cl_addr" rows="2">'+esc(c.address||"")+'</textarea>'+fhint("Adresa sediului social al firmei.")+'</div>'
    + '<div class="row"><div style="flex:1">'+field("Email","cl_email",c.email||"","","email","Emailul oficial de contact al firmei.")+'</div>'
    + '<div style="flex:1">'+field("Telefon","cl_phone",c.phone||"","","text","Telefonul de contact al firmei.")+'</div></div>',
    function(){
      var body={ name:el("cl_name").value, email:el("cl_email").value, phone:el("cl_phone").value,
        cui:el("cl_cui").value, reg_com:el("cl_reg").value, address:el("cl_addr").value };
      var pr = id ? api("PUT","/api/clients/"+id,body) : api("POST","/api/clients",body);
      pr.then(function(){ closeModal(); toast("Salvat"); go("clients"); }).catch(function(e){ toast(e.message,"bad"); });
    });
};
window.deleteClient = function(id){
  var c=(cache.clients||[]).find(function(x){return x.id===id;});
  var name=c?c.name:("#"+id);
  modal("Confirmă ștergerea clientului",
    '<p>Sigur vrei să ștergi <b>definitiv</b> clientul <b>'+esc(name)+'</b>?</p>'
    +'<p class="pill bad" style="font-size:12.5px;display:block;padding:8px 10px">⚠️ Se șterg și conturile de portal și comenzile acestui client. Dacă mai are produse sau paleți în depozit, ștergerea e blocată — mută/șterge întâi marfa.</p>',
    function(){
      api("DELETE","/api/clients/"+id).then(function(){ closeModal(); toast("Client șters"); go("clients"); }).catch(function(e){ toast(e.message,"bad"); });
    });
  var sv=el("modalSave"); if(sv){ sv.textContent="Da, șterge clientul"; sv.className="danger"; }
};
window.clientUsers = function(id){
  var c = cache.clients.find(function(x){return x.id===id;});
  modal("Conturi portal — "+esc(c?c.name:""),
    '<div id="cu_list" class="muted">Se încarcă…</div>'
    + '<h2 style="margin:16px 0 8px;font-size:14px">Adaugă cont nou</h2>'
    + field("Nume persoană","cu_name","","","text","Numele persoanei care va folosi contul.") + field("Email (login)","cu_email","","","email","Emailul cu care clientul se conectează în portal.") + field("Parolă","cu_pass","","","password","Parola pe care i-o dai clientului la acces."),
    function(){
      var body={ name:el("cu_name").value, email:el("cu_email").value, password:el("cu_pass").value };
      api("POST","/api/clients/"+id+"/users",body).then(function(){ toast("Cont creat"); clientUsers(id); }).catch(function(e){ toast(e.message,"bad"); });
    });
  el("modalSave").textContent="Creează cont";
  api("GET","/api/clients/"+id+"/users").then(function(d){
    el("cu_list").innerHTML = d.users.length
      ? '<table><tbody>'+d.users.map(function(u){return '<tr><td>'+esc(u.name)+'</td><td class="muted">'+esc(u.email)+'</td><td>'+(u.active?'<span class="pill good">activ</span>':'<span class="pill bad">inactiv</span>')+'</td><td class="right"><button class="danger sm" onclick="deleteClientUser('+id+','+u.id+')">Șterge</button></td></tr>';}).join("")+'</tbody></table>'
      : '<div class="muted">Niciun cont încă. Creează unul mai jos ca clientul să se poată loga.</div>';
  }).catch(function(e){
    el("cu_list").innerHTML = '<div class="pill bad" style="display:block;padding:8px 12px">Nu am putut încărca conturile: '+esc(e.message)+'</div>';
  });
};
window.deleteClientUser = function(clientId, userId){
  if(!window.confirm("Sigur ștergi acest cont de portal? Persoana nu se va mai putea conecta.")) return;
  api("DELETE","/api/clients/"+clientId+"/users/"+userId).then(function(){ toast("Cont șters"); clientUsers(clientId); }).catch(function(e){ toast(e.message,"bad"); });
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
    typeSel + fhint("Alege dacă e furnizor (de la care primești) sau client (către care livrezi).")
    + field("Nume","pt_name",p.name||"","","text","Numele partenerului sau al firmei.") + field("Email","pt_email",p.email||"","","email","Emailul de contact al partenerului.")
    + field("Telefon","pt_phone",p.phone||"","","text","Numărul de telefon de contact.") + field("Adresă","pt_addr",p.address||"","","text","Adresa partenerului."),
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
      var who = o.source==="portal"
        ? esc(o.client_name||"client")+(o.recipient_name?(' <span class="muted">→ '+esc(o.recipient_name)+'</span>'):'')+' <span class="pill warn" style="font-size:10px">portal</span>'
        : esc(o.partner_name||"—");
      return '<tr><td><b>'+esc(o.code)+'</b></td><td><span class="pill mut">'+(o.type==="inbound"?"intrare":"ieșire")+'</span></td>'
        +'<td>'+who+'</td><td class="right">'+esc(o.total_qty)+'</td><td>'+orderStatusPill(o.status)+'</td>'
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
        + '<button class="ghost sm" onclick="orderCancel('+o.id+',\\''+o.code+'\\')">Anulează</button>'
        + '<button class="danger sm" onclick="deleteOrder('+o.id+')">Șterge</button></div>';
    }
    var recip='';
    if(o.source==="portal"){
      var addr=[o.recipient_address,o.recipient_city,o.recipient_county,o.recipient_postal].filter(Boolean).map(esc).join(", ");
      recip='<div class="card" style="padding:12px;margin-bottom:10px;background:var(--panel-2)"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Comandă din portal · '+esc(o.client_name||"client")+'</div>'
        +'<b>Livrare către: '+esc(o.recipient_name||"—")+'</b>'
        +(o.recipient_phone?'<div class="muted" style="font-size:13px">📞 '+esc(o.recipient_phone)+'</div>':'')
        +(addr?'<div class="muted" style="font-size:13px">📍 '+addr+'</div>':'')
        +(o.note?'<div style="font-size:13px;margin-top:6px">📝 '+esc(o.note)+'</div>':'')+'</div>';
    }
    modal("Comanda "+esc(o.code)+" — "+orderStatusPill(o.status),
      '<div class="muted" style="margin-bottom:10px">'+(o.type==="inbound"?"Intrare de la furnizor":"Ieșire către client")+(o.partner_name?(" · "+esc(o.partner_name)):"")+'</div>'
      + recip + lines + actions, null);
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
window.orderCancel = function(id, code){
  modal("Anulează comanda "+esc(code||("#"+id)),
    '<p>Sigur anulezi comanda <b>'+esc(code||("#"+id))+'</b>?</p>'
    +'<p class="muted" style="font-size:13px">Comanda rămâne în listă cu statusul «Anulată», iar stocul rezervat se eliberează. Nu se scade stoc fizic.</p>',
    function(){
      api("PUT","/api/orders/"+id+"/status",{status:"cancelled"}).then(function(){ closeModal(); toast("Comandă anulată"); loadOrders(); }).catch(function(e){ toast(e.message,"bad"); });
    });
  var sv=el("modalSave"); if(sv){ sv.textContent="Da, anulează"; sv.className="danger"; sv.style.display=""; }
};
window.deleteOrder = function(id){
  api("DELETE","/api/orders/"+id).then(function(){ closeModal(); toast("Ștearsă"); loadOrders(); }).catch(function(e){ toast(e.message,"bad"); });
};
var orderLines=[];
window.orderForm = function(){
  orderLines=[{product_id:"",quantity:1}];
  setMain(topbar("Comandă nouă")
    + '<div class="card" style="padding:20px;max-width:640px"><div id="ofmsg"></div>'
    + '<div class="row"><div style="flex:1"><label>Tip</label><select id="of_type" onchange="ofLoadPartners()"><option value="inbound">Intrare (de la furnizor)</option><option value="outbound">Ieșire (către client)</option></select>'+fhint("Intrare = primești marfă. Ieșire = trimiți marfă.")+'</div>'
    + '<div style="flex:1"><label>Partener</label><select id="of_partner"></select>'+fhint("Furnizorul (la intrare) sau clientul (la ieșire).")+'</div></div>'
    + '<div class="field" style="margin-top:12px"><label>Notă</label><input id="of_note">'+fhint("Observație internă despre comandă (opțional).")+'</div>'
    + '<h2 style="margin-top:8px">Linii comandă</h2>'+fhint("Adaugă produsele și cantitățile din comandă.")+'<div id="of_lines"></div>'
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
function field(label,id,val,attr,type,hint){ return '<div class="field"><label>'+esc(label)+'</label><input id="'+id+'" type="'+(type||"text")+'" value="'+esc(val)+'" '+(attr||"")+'>'+(hint?'<div class="fhint">'+esc(hint)+'</div>':'')+'</div>'; }
function fhint(t){ return '<div class="fhint">'+esc(t)+'</div>'; }
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
  if(window.closeModal) window.closeModal(); // un singur modal odată — evită id-uri duplicate (modal peste modal) care blocau închiderea
  var bg=document.createElement("div"); bg.className="modal-bg"; bg.id="modalBg";
  bg.innerHTML='<div class="card modal"><h2>'+esc(title)+'</h2><div id="modalBody">'+inner+'</div>'
    +'<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="ghost" onclick="closeModal()">Anulează</button><button id="modalSave">Salvează</button></div></div>';
  document.body.appendChild(bg);
  bg.querySelector("#modalSave").onclick=onSave; // leagă butonul din modalul NOU, nu din altul rămas în DOM
  // Nu închidem la clic în afara ferestrei (evită pierderea accidentală a datelor).
  // Închiderea se face doar din butonul „Anulează".
}
window.closeModal=function(){
  if(window._scanStream){ try{ window._scanStream.getTracks().forEach(function(t){t.stop();}); }catch(e){} window._scanStream=null; }
  if(window._zxingReader){ try{ window._zxingReader.reset(); }catch(e){} window._zxingReader=null; }
  var m=el("modalBg"); if(m) m.remove();
};

/* ---------------- Scanner hardware Zebra (DataWedge / keyboard-wedge) ---------------- */
// Scanner-ul laser Zebra (mod Keystroke) "tastează" codul rapid + Enter.
// Dacă un câmp e focusat, codul intră direct în el (recepție/expediere/produs).
// Dacă NU e focusat niciun câmp, prindem scanarea global și căutăm produsul/locația.
(function(){
  var buf="", lastKey=0;
  document.addEventListener("keydown", function(e){
    if(!me || me.kind==="client") return; // doar staff (portalul e doar de vizualizare)
    var a=document.activeElement;
    if(a && (a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.tagName==="SELECT"||a.isContentEditable)) return; // câmpul primește scanul direct
    var now=Date.now();
    if(now-lastKey>120) buf=""; // pauză mare = tastare umană, resetăm
    lastKey=now;
    if(e.key==="Enter"){ var code=buf.trim(); buf=""; if(code.length>=3) handleScanResult(code); return; }
    if(e.key && e.key.length===1) buf+=e.key;
  }, true);
})();

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
