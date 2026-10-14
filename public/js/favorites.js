// ════════════════════════════════════════
//  즐겨찾기 ★ — 자주 쓰는 화면/프로젝트 저장·재진입     작성: 수진
// ════════════════════════════════════════
//
// 좌측 레일 '즐겨찾기 ★' 버튼에서 연다. 현재 탭 화면을 즐겨찾기에 추가하고,
// 목록에서 클릭하면 그 화면(프로젝트)으로 바로 이동한다(app-tabs.js 의 tabReopen 사용).
// 저장은 브라우저 localStorage(뷰어 편의용). app-tabs 의 tabCurrentDesc/tabReopen 서술자를 그대로 쓴다.

var FAV_KEY = 'newmis.favorites';

function favLoad() {
  try { var raw = localStorage.getItem(FAV_KEY); var a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function favSave(list) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list || [])); } catch (e) {}
}

function favInjectStyle() {
  if (document.getElementById('fav-style')) return;
  var st = document.createElement('style'); st.id = 'fav-style';
  st.textContent = `
   .fav-ov{position:fixed;inset:0;z-index:200;background:rgba(11,18,32,.42);display:flex;align-items:flex-start;justify-content:flex-start}
   .fav-panel{width:320px;max-width:86vw;height:100%;background:#fff;box-shadow:8px 0 30px -12px rgba(11,18,32,.4);
     display:flex;flex-direction:column;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;animation:favIn .16s ease}
   @keyframes favIn{from{transform:translateX(-14px);opacity:.4}to{transform:none;opacity:1}}
   .fav-head{display:flex;align-items:center;gap:8px;padding:16px 18px;border-bottom:1px solid #eef2ff}
   .fav-head strong{font-size:15px;font-weight:900;color:#0f172a;flex:1}
   .fav-x{border:0;background:#f1f5f9;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:13px;color:#475569}
   .fav-add{margin:12px 14px 6px;border:1px dashed #c7d2fe;background:#f5f8ff;color:#1d4ed8;border-radius:10px;
     padding:10px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;width:calc(100% - 28px)}
   .fav-add:hover{background:#eef3ff;border-color:#1d4ed8}
   .fav-list{flex:1;overflow:auto;padding:6px 10px 16px}
   .fav-item{display:flex;align-items:center;gap:8px;border:1px solid #eef1f6;border-radius:9px;padding:9px 10px;margin:5px 2px;background:#fff}
   .fav-item:hover{border-color:#1d4ed8;background:#f7faff}
   .fav-item-main{flex:1;min-width:0;text-align:left;border:0;background:transparent;cursor:pointer;font-family:inherit;
     font-size:12.5px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
   .fav-item-main .fav-star{color:#f59e0b;margin-right:6px}
   .fav-del{flex:none;width:26px;height:26px;border:0;border-radius:6px;background:transparent;color:#9aa3b2;
     cursor:pointer;font-size:13px;display:grid;place-items:center;font-family:inherit}
   .fav-del:hover{background:#fef2f2;color:#dc2626}
   .fav-empty{padding:34px 16px;text-align:center;color:#94a3b8;font-size:12.5px;line-height:1.7}
  `;
  document.head.appendChild(st);
}

function favRenderList() {
  var box = document.getElementById('fav-list');
  if (!box) return;
  var list = favLoad();
  if (!list.length) {
    box.innerHTML = '<div class="fav-empty">아직 즐겨찾기가 없습니다.<br>보고 있는 화면을 <b>＋ 현재 화면 추가</b>로 저장해 보세요.</div>';
    return;
  }
  box.innerHTML = list.map(function (f, i) {
    var label = (f.label || '화면').replace(/</g, '&lt;');
    return '<div class="fav-item">'
      + '<button class="fav-item-main" onclick="favOpen(' + i + ')" title="' + label + '"><span class="fav-star">★</span>' + label + '</button>'
      + '<button class="fav-del" onclick="favDelete(' + i + ')" aria-label="삭제">🗑</button>'
      + '</div>';
  }).join('');
}

function openFavorites() {
  favInjectStyle();
  var ov = document.getElementById('fav-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'fav-ov'; document.body.appendChild(ov); }
  ov.className = 'fav-ov';
  ov.innerHTML = '<div class="fav-panel" role="dialog" aria-modal="true" aria-label="즐겨찾기">'
    + '<div class="fav-head"><strong>★ 즐겨찾기</strong>'
    + '<button class="fav-x" onclick="closeFavorites()" aria-label="닫기">✕</button></div>'
    + '<button class="fav-add" onclick="favAddCurrent()">＋ 현재 화면 추가</button>'
    + '<div class="fav-list" id="fav-list"></div>'
    + '</div>';
  ov.onclick = function (e) { if (e.target === ov) closeFavorites(); };
  document.addEventListener('keydown', favEsc);
  favRenderList();
}
function closeFavorites() {
  var ov = document.getElementById('fav-ov');
  if (ov) ov.remove();
  document.removeEventListener('keydown', favEsc);
}
function favEsc(e) { if (e.key === 'Escape') closeFavorites(); }

// 현재 탭 화면을 즐겨찾기에 추가
function favAddCurrent() {
  var cur = (typeof window.tabCurrentDesc === 'function') ? window.tabCurrentDesc() : null;
  if (!cur) { if (typeof showToast === 'function') showToast('추가할 화면을 찾지 못했어요.'); return; }
  var list = favLoad();
  var sig = JSON.stringify(cur.openDesc);
  if (list.some(function (f) { return JSON.stringify(f.openDesc) === sig; })) {
    if (typeof showToast === 'function') showToast('이미 즐겨찾기에 있어요.');
    return;
  }
  list.push({ label: cur.label, openDesc: cur.openDesc });
  favSave(list);
  favRenderList();
  if (typeof showToast === 'function') showToast('즐겨찾기에 추가했어요.');
}

function favOpen(i) {
  var list = favLoad();
  var f = list[i];
  if (!f) return;
  closeFavorites();
  if (typeof window.tabReopen === 'function') window.tabReopen(f.openDesc);
}

function favDelete(i) {
  var list = favLoad();
  if (i < 0 || i >= list.length) return;
  list.splice(i, 1);
  favSave(list);
  favRenderList();
}
