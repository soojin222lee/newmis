/* =====================================================================
   AiBudget 업무 튜토리얼 — 공용 오버레이 엔진
   실제 MIS 목업 화면 위에 스포트라이트·말풍선만 얹는다(화면 미변경).
   기능: 스포트라이트 + 말풍선(드래그 이동) + 배경 스크롤 잠금(고정) +
         진행바/이전/다시 시작 + 인트로/완료 카드 + 잘못 클릭 안내.

   사용:  TutovEngine({ ready, hud, steps, intro, done })
     - ready()         : 실제 앱 준비 여부(전역 함수 존재 등)
     - hud             : HUD 라벨 HTML
     - steps[]         : { ensure(), target(), pos, title, text, mode, wait }
                         mode: 'next'(홀 클릭=다음) | 'realclick'(실제 요소 클릭 후 다음) | 'done'
     - intro           : { html }  // .card 내부 HTML (시작 버튼 제외)
     - done            : { html }  // .card 내부 HTML (다시 보기 버튼 제외)
   ===================================================================== */
window.TutovEngine = function (CONFIG) {
  "use strict";
  function boot() {
    if (!CONFIG.ready() || !document.body) return setTimeout(boot, 120);
    if (document.getElementById('tutov-root')) return;
    init();
  }

  function init() {
    const CSS = `
    #tutov-hud{position:fixed;top:0;left:0;right:0;z-index:99000;height:50px;background:rgba(255,255,255,.95);
      backdrop-filter:blur(8px);border-bottom:1px solid #e7eaef;display:flex;align-items:center;gap:14px;padding:0 16px;font-family:'Pretendard','Noto Sans KR',sans-serif;}
    #tutov-hud .ch{font-size:13px;font-weight:900;color:#16151f;white-space:nowrap}
    #tutov-hud .ch em{font-style:normal;color:#2f6bed}
    #tutov-hud .ch i{font-style:normal;color:#8a94a6}
    #tutov-hud .bar{flex:1;max-width:360px;height:7px;background:#e9ecf1;border-radius:999px;overflow:hidden}
    #tutov-hud .fill{height:100%;width:0;background:#2f6bed;border-radius:999px;transition:width .4s cubic-bezier(.2,.8,.2,1)}
    #tutov-hud .cnt{font-size:12px;font-weight:800;color:#6b7480;white-space:nowrap}
    #tutov-hud .sp{flex:1}
    #tutov-hud button{height:31px;padding:0 12px;border-radius:8px;border:1px solid #d3d9e2;background:#fff;color:#37414f;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit}
    #tutov-hud button:hover{background:#f3f6fb}
    body.tutov-on{padding-top:50px!important}
    body.tutov-dragging, body.tutov-dragging *{user-select:none!important;cursor:grabbing!important}
    #tutov-mask{position:fixed;inset:0;z-index:99001;background:rgba(10,14,26,.56);display:none}
    #tutov-hole{position:fixed;z-index:99002;border-radius:10px;border:2.5px solid #2f6bed;background:transparent;cursor:pointer;display:none;
      box-shadow:0 0 0 4px rgba(47,107,237,.30),0 0 0 9999px rgba(10,14,26,.56);animation:tutovP 1.6s ease-in-out infinite}
    @keyframes tutovP{0%,100%{box-shadow:0 0 0 4px rgba(47,107,237,.30),0 0 0 9999px rgba(10,14,26,.56)}50%{box-shadow:0 0 0 9px rgba(47,107,237,.15),0 0 0 9999px rgba(10,14,26,.56)}}
    #tutov-hole.shake{animation:tutovShake .4s}
    @keyframes tutovShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
    #tutov-hole .fg{position:absolute;right:-14px;bottom:-14px;font-size:24px;pointer-events:none;animation:tutovFg 1.3s ease-in-out infinite;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}
    @keyframes tutovFg{0%,100%{transform:translate(0,0)}50%{transform:translate(-5px,-5px)}}
    #tutov-bubble{position:fixed;z-index:99003;max-width:340px;background:#fff;border-radius:14px;padding:16px 18px 14px;border:1px solid #e4e2da;
      box-shadow:0 18px 50px rgba(10,14,26,.28);display:none;font-family:'Pretendard','Noto Sans KR',sans-serif;animation:tutovPop .28s cubic-bezier(.2,.9,.3,1.2);cursor:grab}
    #tutov-bubble:active{cursor:grabbing}
    @keyframes tutovPop{from{opacity:0;transform:scale(.94) translateY(6px)}to{opacity:1;transform:none}}
    #tutov-bubble .grip{position:absolute;top:8px;right:10px;font-size:13px;color:#c3cbd6;letter-spacing:1px;pointer-events:none}
    #tutov-bubble .st{font-size:11px;font-weight:900;color:#2f6bed;letter-spacing:.5px}
    #tutov-bubble .tt{font-size:16px;font-weight:900;color:#16151f;margin:5px 0 7px;padding-right:20px}
    #tutov-bubble .tx{font-size:13.5px;line-height:1.62;color:#3a4250}
    #tutov-bubble .tx b{color:#17161f}
    #tutov-bubble .tx .lock{color:#b4740a}
    #tutov-bubble .tx .ok{color:#1b8f63}
    #tutov-bubble .tx .tbd{display:inline-block;font-size:11px;font-weight:800;color:#b4740a;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:0 6px;margin-left:2px}
    #tutov-bubble .hint{margin-top:10px;font-size:11.5px;font-weight:800;color:#2f6bed;display:flex;gap:10px;flex-wrap:wrap}
    #tutov-bubble .hint em{font-style:normal;color:#9aa4b2}
    #tutov-bubble .ar{position:absolute;width:14px;height:14px;background:#fff;border:1px solid #e4e2da;transform:rotate(45deg)}
    #tutov-center{position:fixed;inset:0;z-index:99003;display:none;align-items:center;justify-content:center;padding:24px;font-family:'Pretendard','Noto Sans KR',sans-serif}
    #tutov-center .card{background:#fff;border-radius:20px;max-width:580px;width:100%;padding:32px 34px;box-shadow:0 24px 70px rgba(10,14,26,.35);animation:tutovPop .3s cubic-bezier(.2,.9,.3,1.2)}
    #tutov-center .eb{font-size:12px;font-weight:900;letter-spacing:1px;color:#2f6bed;text-transform:uppercase}
    #tutov-center h2{font-size:24px;font-weight:900;color:#16151f;margin:8px 0 10px}
    #tutov-center p{font-size:14px;line-height:1.7;color:#3a4250;margin:0}
    #tutov-center .chk{width:60px;height:60px;border-radius:50%;background:#22b07d;display:grid;place-items:center;margin:0 auto 12px;color:#fff;font-size:30px}
    #tutov-center .intro-ic{font-size:40px;text-align:center;margin-bottom:6px}
    #tutov-center .acts{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;justify-content:center}
    #tutov-center .acts button{height:38px;padding:0 16px;border-radius:10px;border:1px solid #d3d9e2;background:#fff;color:#2b3442;font-size:13.5px;font-weight:800;cursor:pointer;font-family:inherit}
    #tutov-center .acts button.pri{background:#17161f;border-color:#17161f;color:#fff}
    .vlife{display:flex;align-items:stretch;gap:0;margin:16px 0 4px}
    .vlife .s{flex:1;text-align:center;padding:10px 6px;border-radius:10px;border:1px solid #e4e2da}
    .vlife .s b{display:block;font-size:13px;font-weight:900;color:#16151f}
    .vlife .s span{font-size:11px;font-weight:700;color:#6b7480}
    .vlife .s.save{background:#eef7f1;border-color:#bbe7cc} .vlife .s.save b{color:#166534}
    .vlife .s.lock{background:#fff7ed;border-color:#fed7aa} .vlife .s.lock b{color:#b4740a}
    .vlife .s.fix{background:#eef1f6} .vlife .s.fix b{color:#37414f}
    .vlife .ar{display:flex;align-items:center;color:#aab2c0;font-weight:900;padding:0 8px}
    .mstrip{display:flex;gap:4px;margin:12px 0 6px;flex-wrap:wrap}
    .mstrip .m{flex:1;min-width:40px;text-align:center;border-radius:8px;padding:7px 2px;font-size:11px;font-weight:800;border:1px solid #e4e2da}
    .mstrip .m .mm{font-size:12px;font-weight:900;color:#16151f}
    .mstrip .m.past{background:#f1f0ea;color:#8a94a6} .mstrip .m.past .mm{color:#55606f}
    .mstrip .m.fut{background:#eaf1fd;border-color:#bcd3f7;color:#2f6bed} .mstrip .m.fut .mm{color:#1746a0}
    .mlegend{display:flex;gap:14px;font-size:12px;font-weight:700;color:#6b7480;margin-top:2px;flex-wrap:wrap}
    .mlegend i{font-style:normal}
    .mlegend .d{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:middle}
    #tutov-toast{position:fixed;z-index:99004;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:#17161f;color:#fff;font-size:13px;font-weight:700;padding:11px 18px;border-radius:11px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;font-family:'Pretendard','Noto Sans KR',sans-serif}
    #tutov-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    `;
    const st = document.createElement('style'); st.id = 'tutov-style'; st.textContent = CSS; document.head.appendChild(st);

    const root = document.createElement('div'); root.id = 'tutov-root';
    root.innerHTML =
      '<div id="tutov-hud"><span class="ch">' + CONFIG.hud + '</span>' +
      '<div class="bar"><div class="fill" id="tutov-fill"></div></div><span class="cnt" id="tutov-cnt"></span>' +
      '<span class="sp"></span>' +
      '<button id="tutov-prev">◀ 이전</button><button id="tutov-restart">↻ 다시 시작</button></div>' +
      '<div id="tutov-mask"></div>' +
      '<div id="tutov-hole"><span class="fg">👆</span></div>' +
      '<div id="tutov-bubble"><span class="ar"></span><span class="grip">⠿</span><div class="st"></div><div class="tt"></div><div class="tx"></div>' +
      '<div class="hint"><span>👆 강조된 파란 영역을 클릭</span><em>✋ 말풍선은 드래그로 이동</em></div></div>' +
      '<div id="tutov-center"></div><div id="tutov-toast"></div>';
    document.body.appendChild(root);
    document.body.classList.add('tutov-on');

    const $ = id => document.getElementById(id);
    const STEPS = CONFIG.steps;
    let step = 0;
    let curTgt = null, curPos = 'bottom', bubMoved = false;

    // 배경 스크롤 완전 잠금(스포트라이트 고정). 잠근 상태에서 좌표를 재므로 어긋남이 없다.
    function lockScroll() { const el = document.scrollingElement || document.documentElement; el.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; }
    function unlockScroll() { const el = document.scrollingElement || document.documentElement; el.style.overflow = ''; document.body.style.overflow = ''; }

    function place() {
      const s = STEPS[step]; if (!s) return;
      const tgt = s.target && s.target();
      const mask = $('tutov-mask'), hole = $('tutov-hole'), bub = $('tutov-bubble');
      $('tutov-center').style.display = 'none';
      if (!tgt) { mask.style.display = 'block'; hole.style.display = 'none'; bub.style.display = 'none'; curTgt = null; unlockScroll(); return; }
      unlockScroll();
      try { tgt.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {}
      lockScroll();
      mask.style.display = 'block';
      curTgt = tgt; curPos = s.pos || 'bottom'; bubMoved = false;
      const hr = tgt.getBoundingClientRect();
      drawHole(hr);
      hole.onclick = (e) => { e.stopPropagation(); if (s.mode === 'realclick') { tgt.click(); next(); } else if (s.mode === 'done') { done(); } else { next(); } };
      bub.querySelector('.ar').style.display = 'block';
      bub.querySelector('.st').textContent = 'STEP ' + (step + 1) + ' / ' + STEPS.length;
      bub.querySelector('.tt').textContent = s.title;
      bub.querySelector('.tx').innerHTML = s.text;
      bub.style.display = 'block'; posBub(bub, hr, curPos);
      $('tutov-cnt').textContent = '단계 ' + (step + 1) + ' / ' + STEPS.length;
      $('tutov-fill').style.width = Math.round(step / STEPS.length * 100) + '%';
    }

    function drawHole(r) {
      const hole = $('tutov-hole'), pad = 7;
      hole.style.display = 'block';
      hole.style.left = (r.left - pad) + 'px'; hole.style.top = (r.top - pad) + 'px';
      hole.style.width = (r.width + pad * 2) + 'px'; hole.style.height = (r.height + pad * 2) + 'px';
    }

    // 스포트라이트 고정 — 스크롤 이벤트에 의존하지 않고 매 프레임 타깃에 붙인다.
    // (스크롤바 드래그·휠·프로그램 스크롤 무엇이든 홀/말풍선이 어긋나지 않음)
    let lastKey = '';
    function syncToTarget() {
      if (curTgt && $('tutov-hole').style.display === 'block') {
        const r = curTgt.getBoundingClientRect();
        const key = [r.left, r.top, r.width, r.height, innerWidth, innerHeight, bubMoved ? 1 : 0].join(',');
        if (key !== lastKey) { lastKey = key; drawHole(r); if (!bubMoved) posBub($('tutov-bubble'), r, curPos); }
      } else { lastKey = ''; }
      requestAnimationFrame(syncToTarget);
    }
    requestAnimationFrame(syncToTarget);

    function posBub(b, r, pos) {
      const bw = b.offsetWidth, bh = b.offsetHeight, g = 18, vw = innerWidth, vh = innerHeight; let l, t; const a = b.querySelector('.ar');
      const cl = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
      if (pos === 'right') { l = r.right + g; t = r.top + r.height / 2 - bh / 2; }
      else if (pos === 'left') { l = r.left - bw - g; t = r.top + r.height / 2 - bh / 2; }
      else if (pos === 'top') { l = r.left + r.width / 2 - bw / 2; t = r.top - bh - g; }
      else { l = r.left + r.width / 2 - bw / 2; t = r.bottom + g; }
      if (l < 12) l = 12; if (l + bw > vw - 12) l = vw - bw - 12; if (t < 60) t = 60; if (t + bh > vh - 12) t = vh - bh - 12;
      b.style.left = l + 'px'; b.style.top = t + 'px'; a.style.display = 'block';
      if (pos === 'right') { a.style.left = '-8px'; a.style.top = cl(r.top + r.height / 2 - t - 7, 10, bh - 20) + 'px'; a.style.borderRight = 'none'; a.style.borderBottom = 'none'; }
      else if (pos === 'left') { a.style.left = (bw - 6) + 'px'; a.style.top = cl(r.top + r.height / 2 - t - 7, 10, bh - 20) + 'px'; a.style.borderLeft = 'none'; a.style.borderTop = 'none'; }
      else if (pos === 'top') { a.style.top = (bh - 6) + 'px'; a.style.left = cl(r.left + r.width / 2 - l - 7, 14, bw - 24) + 'px'; a.style.borderLeft = 'none'; a.style.borderTop = 'none'; }
      else { a.style.top = '-8px'; a.style.left = cl(r.left + r.width / 2 - l - 7, 14, bw - 24) + 'px'; a.style.borderRight = 'none'; a.style.borderBottom = 'none'; }
    }

    function render() { const s = STEPS[step]; if (s && s.ensure) s.ensure(); setTimeout(place, (s && s.wait) || 240); }
    function next() { if (step < STEPS.length - 1) { step++; render(); } else done(); }

    function done() {
      $('tutov-mask').style.display = 'none'; $('tutov-hole').style.display = 'none'; $('tutov-bubble').style.display = 'none'; curTgt = null; unlockScroll();
      $('tutov-fill').style.width = '100%'; $('tutov-cnt').textContent = '단계 ' + STEPS.length + ' / ' + STEPS.length;
      const c = $('tutov-center'); c.style.display = 'flex';
      c.innerHTML = '<div class="card">' + CONFIG.done.html + '<div class="acts"><button class="pri" id="tutov-again">↻ 처음부터 다시 보기</button></div></div>';
      $('tutov-again').onclick = intro;
    }

    function intro() {
      $('tutov-mask').style.display = 'block'; $('tutov-hole').style.display = 'none'; $('tutov-bubble').style.display = 'none'; curTgt = null; unlockScroll();
      const c = $('tutov-center'); c.style.display = 'flex';
      c.innerHTML = '<div class="card">' + CONFIG.intro.html + '<div class="acts"><button class="pri" id="tutov-begin">시작하기 →</button></div></div>';
      $('tutov-begin').onclick = start;
      $('tutov-cnt').textContent = ''; $('tutov-fill').style.width = '0';
    }

    function start() { $('tutov-center').style.display = 'none'; step = 0; render(); }

    // ── 말풍선 드래그 이동 ──
    (function enableDrag() {
      const bub = $('tutov-bubble'); let d = null;
      const start = (cx, cy) => { d = { cx, cy, l: parseFloat(bub.style.left) || 0, t: parseFloat(bub.style.top) || 0 }; bubMoved = true; bub.querySelector('.ar').style.display = 'none'; document.body.classList.add('tutov-dragging'); };
      const move = (cx, cy) => { if (!d) return; let nl = d.l + (cx - d.cx), nt = d.t + (cy - d.cy); nl = Math.max(6, Math.min(innerWidth - bub.offsetWidth - 6, nl)); nt = Math.max(56, Math.min(innerHeight - bub.offsetHeight - 6, nt)); bub.style.left = nl + 'px'; bub.style.top = nt + 'px'; };
      const end = () => { if (d) { d = null; document.body.classList.remove('tutov-dragging'); } };
      bub.addEventListener('mousedown', (e) => { start(e.clientX, e.clientY); e.preventDefault(); });
      window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
      window.addEventListener('mouseup', end);
      bub.addEventListener('touchstart', (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
      window.addEventListener('touchmove', (e) => { if (!d) return; const t = e.touches[0]; move(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
      window.addEventListener('touchend', end);
    })();

    // ── 배경 스크롤 잠금(스포트라이트 고정) ──
    function maskOn() { return $('tutov-mask').style.display === 'block' && $('tutov-hole').style.display === 'block'; }
    window.addEventListener('wheel', (e) => { if (maskOn()) e.preventDefault(); }, { passive: false, capture: true });
    window.addEventListener('touchmove', (e) => { if (maskOn() && !document.body.classList.contains('tutov-dragging')) e.preventDefault(); }, { passive: false, capture: true });
    window.addEventListener('keydown', (e) => { const tag = (e.target && e.target.tagName) || ''; if (maskOn() && [32, 33, 34, 35, 36, 38, 40].indexOf(e.keyCode) > -1 && !/INPUT|TEXTAREA|SELECT/.test(tag)) e.preventDefault(); }, { capture: true });

    // ── 잘못 클릭 안내 ──
    $('tutov-mask').onclick = () => {
      const h = $('tutov-hole'); if (h.style.display !== 'block') return;
      h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake');
      const t = $('tutov-toast'); t.textContent = '👆 강조된 파란 영역을 클릭하세요'; t.classList.add('show');
      clearTimeout(window.__tzt); window.__tzt = setTimeout(() => t.classList.remove('show'), 1600);
    };
    $('tutov-prev').onclick = () => { if (step > 0) { step--; render(); } else intro(); };
    $('tutov-restart').onclick = intro;

    window.__tutovStart = start;
    intro();
  }

  boot();
};
