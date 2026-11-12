// 당근 사진 마을 전시회 - 클라이언트
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- 주민 정보 (브라우저에 저장) ----------
  const STORE_KEY = 'carrot-photo-village:resident';
  function loadResident() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
    } catch {
      return null;
    }
  }
  function saveResident(r) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(r));
    } catch {}
  }
  const store = window.photoStore;
  let resident = loadResident();

  // ---------- 공통 UI ----------
  function show(id) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  });
  const anyModalOpen = () => $$('dialog').some((d) => d.open);

  // ---------- 1. 타이틀 ----------
  $('#title-chars').innerHTML = CHARACTERS.map(
    (c, i) => `<span class="bob" style="animation-delay:${i * 0.15}s">${characterMarkup(c.id)}</span>`
  ).join('');
  $('#start-btn').addEventListener('click', () => {
    if (resident) enterVillage();
    else openSelect();
  });

  // ---------- 2. 캐릭터 선택 ----------
  let picked = resident?.character || CHARACTERS[0].id;
  function renderSelect() {
    $('#char-grid').innerHTML = CHARACTERS.map(
      (c) => `
      <button class="char-option ${c.id === picked ? 'selected' : ''}" role="radio"
        aria-checked="${c.id === picked}" data-id="${c.id}" style="--c:${c.color}">
        ${characterMarkup(c.id)}<span>${c.name}</span>
      </button>`
    ).join('');
    const c = CHAR_BY_ID[picked];
    $('#char-detail').innerHTML = `<b>${c.name}</b> ${esc(c.intro)}`;
  }
  $('#char-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.char-option');
    if (!b) return;
    picked = b.dataset.id;
    renderSelect();
  });
  function openSelect() {
    renderSelect();
    $('#nickname-input').value = resident?.nickname || '';
    show('select-screen');
    setTimeout(() => $('#nickname-input').focus(), 50);
  }
  function confirmSelect() {
    const nickname = $('#nickname-input').value.trim();
    if (!nickname) {
      toast('닉네임을 알려주세요!');
      $('#nickname-input').focus();
      return;
    }
    const first = !resident;
    resident = { nickname, character: picked };
    saveResident(resident);
    enterVillage(first);
  }
  $('#enter-btn').addEventListener('click', confirmSelect);
  $('#nickname-input').addEventListener('keydown', (e) => e.key === 'Enter' && confirmSelect());
  $('#resident-card').addEventListener('click', openSelect);

  // ---------- 3. 마을 ----------
  const world = $('#world');
  const viewport = $('#viewport');
  const playerEl = $('#player');

  // 마을 크기와 구역
  const COLS = 5;
  const GAP_X = 250;
  const GAP_Y = 280;
  const W = 3000;
  const PLAZA_X = W / 2 - ((COLS - 1) * GAP_X) / 2; // 첫 번째 액자 줄의 x
  const FOREST_H = 720; // 북쪽 숲
  const SIGN_Y = FOREST_H + 50; // 광장 입구 간판
  const TOP = FOREST_H + 360; // 첫 번째 액자 줄의 y
  const FIELD = { x: 170, w: PLAZA_X - 430 }; // 서쪽 꽃밭
  const LAKE = { cx: W - 560, rx: 300, ry: 190 }; // 동쪽 호수 (cy는 배치 때 계산)
  let H = 2600;
  let SAND_Y = 2000; // 남쪽 해변 모래사장 시작
  let SEA_Y = 2260; // 바다 시작

  let photos = [];
  let spots = []; // 액자 + 우체통 + 게시판
  const player = { x: W / 2, y: SIGN_Y + 260, dir: 1, moving: false };
  let target = null;
  let nearSpot = null;
  let villageStarted = false;

  // 시드 고정 난수 (장식이 매번 같은 자리에 있도록)
  function rng(seed) {
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  }

  // 걸을 수 없는 곳 (물)
  function blocked(x, y) {
    if (y > SEA_Y + 30) return true;
    const dx = (x - LAKE.cx) / (LAKE.rx * 0.92);
    const dy = (y - LAKE.cy) / (LAKE.ry * 0.85);
    return dx * dx + dy * dy < 1;
  }

  function zoneOf(x, y) {
    if (y < FOREST_H - 40) return '숲속 산책길';
    if (y > SAND_Y - 40) return '해변';
    if (x < FIELD.x + FIELD.w + 80) return '꽃밭';
    if (x > LAKE.cx - LAKE.rx - 120) return '호숫가';
    return '광장';
  }

  function layout() {
    const count = Math.max(photos.length + 1, COLS * 3); // 항상 빈 액자 하나 이상
    const rows = Math.ceil(count / COLS);
    const plazaBottom = TOP + rows * GAP_Y;
    SAND_Y = plazaBottom + 140;
    SEA_Y = SAND_Y + 300;
    H = SEA_Y + 340;
    LAKE.cy = TOP + 260;
    spots = [];
    for (let i = 0; i < rows * COLS; i++) {
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      spots.push({ kind: 'easel', x: PLAZA_X + c * GAP_X, y: TOP + r * GAP_Y, photo: photos[i] || null, index: i });
    }
    spots.push({ kind: 'board', x: W / 2 - 300, y: SIGN_Y + 150, index: 'board' });
    spots.push({ kind: 'mailbox', x: W / 2 + 290, y: SIGN_Y + 170, index: 'mailbox' });
    world.style.width = W + 'px';
    world.style.height = H + 'px';
    renderDecor(rows, plazaBottom);
    renderSpots();
    buildMinimap();
  }

  function renderDecor(rows, plazaBottom) {
    const rand = rng(7);
    const out = [];
    const add = (cls, x, y, extra = '', z) =>
      out.push(`<div class="${cls}" style="left:${Math.round(x)}px;top:${Math.round(y)}px;${z != null ? `z-index:${Math.round(z)};` : ''}${extra}"></div>`);
    const sign = (text, x, y) =>
      out.push(`<div class="zone-sign" style="left:${x}px;top:${y}px;z-index:${y + 60}"><span>${text}</span></div>`);

    // --- 남쪽 바다와 모래사장 (가장 아래에 깔림)
    add('sand', 0, SAND_Y, `width:${W}px;height:${SEA_Y - SAND_Y + 40}px`);
    add('sea', 0, SEA_Y, `width:${W}px;height:${H - SEA_Y}px`);
    // --- 길
    add('path', 120, SIGN_Y + 205, `width:${W - 240}px`); // 동서 큰길
    for (let r = 0; r < rows; r++) add('path', PLAZA_X - 140, TOP + r * GAP_Y + 62, `width:${(COLS - 1) * GAP_X + 280}px`);
    add('path path-v', W / 2 - 40, FOREST_H - 120, `height:${SAND_Y - FOREST_H + 160}px`); // 남북 큰길
    // 숲속 구불구불 오솔길
    const forestPath = [];
    for (let x = 160; x < W - 160; x += 38) {
      const y = 330 + Math.sin(x / 260) * 140;
      forestPath.push([x, y]);
      add('dirt', x - 45, y - 30);
    }
    for (let y = 330 + Math.sin((W / 2) / 260) * 140; y < FOREST_H; y += 40) add('dirt', W / 2 - 45, y - 30);

    // --- 북쪽 숲
    for (let i = 0; i < 150; i++) {
      const x = 20 + rand() * (W - 100);
      const y = 10 + rand() * (FOREST_H - 160);
      if (forestPath.some(([px, py]) => Math.hypot(px - x - 40, py - y - 90) < 95)) continue;
      if (Math.abs(x + 40 - W / 2) < 90 && y > 250) continue;
      add(`tree ${rand() < 0.3 ? 'tree-pine' : rand() < 0.25 ? 'tree-fruit' : ''}`, x, y, '', y + 95);
    }
    for (let i = 0; i < 26; i++) {
      const [px, py] = forestPath[Math.floor(rand() * forestPath.length)];
      add('mushroom', px + (rand() < 0.5 ? -80 : 60), py + 30 + rand() * 20, '', py + 60);
    }
    add('bench', W / 2 + 420, 330 + Math.sin((W / 2 + 460) / 260) * 140 - 90, '', 400);
    sign('🌲 숲속 산책길', W / 2 + 70, FOREST_H - 150);

    // --- 서쪽 꽃밭
    const fieldTop = TOP - 140;
    const fieldH = Math.max(640, rows * GAP_Y - 40);
    add('field', FIELD.x, fieldTop, `width:${FIELD.w}px;height:${fieldH}px`);
    const tulipColors = ['#ff6f91', '#ffd166', '#ff9f43', '#c39bd3', '#ffffff', '#ff7a7a'];
    for (let r = 0, y = fieldTop + 30; y < fieldTop + fieldH - 30; r++, y += 46) {
      for (let x = FIELD.x + 26; x < FIELD.x + FIELD.w - 20; x += 34) {
        out.push(`<span class="tulip" style="left:${x}px;top:${y}px;--f:${tulipColors[r % tulipColors.length]};z-index:${y + 20}"></span>`);
      }
    }
    add('windmill', FIELD.x + FIELD.w / 2 - 50, fieldTop - 200, '', fieldTop);
    sign('🌼 꽃밭', FIELD.x + FIELD.w + 30, fieldTop - 50);

    // --- 동쪽 호수
    add('lake', LAKE.cx - LAKE.rx, LAKE.cy - LAKE.ry, `width:${LAKE.rx * 2}px;height:${LAKE.ry * 2}px`);
    add('dock', LAKE.cx - LAKE.rx - 30, LAKE.cy - 22, '', LAKE.cy);
    add('duck', LAKE.cx + 40, LAKE.cy - 40, '', LAKE.cy);
    add('duck duck-2', LAKE.cx - 90, LAKE.cy + 50, '', LAKE.cy);
    add('lily', LAKE.cx + 150, LAKE.cy + 40);
    add('lily', LAKE.cx - 30, LAKE.cy - 110);
    for (let a = 0; a < Math.PI * 2; a += 0.42) {
      if (Math.abs(a - Math.PI) < 0.5) continue; // 선착장 쪽은 비워둠
      const x = LAKE.cx + Math.cos(a) * (LAKE.rx + 90 + rand() * 50) - 40;
      const y = LAKE.cy + Math.sin(a) * (LAKE.ry + 80 + rand() * 40) - 90;
      if (x > W - 90) continue;
      add(`tree ${rand() < 0.35 ? 'tree-fruit' : ''}`, x, y, '', y + 95);
    }
    sign('🦆 호숫가', LAKE.cx - LAKE.rx - 170, LAKE.cy - LAKE.ry - 40);

    // --- 남쪽 해변
    for (let x = 200; x < W - 200; x += 420 + rand() * 200) {
      add('parasol', x, SAND_Y + 60 + rand() * 90, `--p:${['#ff7a7a', '#5ab0ff', '#ffd166', '#6fcf7f'][Math.floor(rand() * 4)]}`, SAND_Y + 200);
    }
    for (let i = 0; i < 30; i++) add('shell', 80 + rand() * (W - 160), SAND_Y + 40 + rand() * (SEA_Y - SAND_Y - 60));
    sign('🏖 해변', W / 2 + 70, SAND_Y + 10);

    // --- 광장
    out.push(`<div class="signboard" style="left:${W / 2 - 150}px;top:${SIGN_Y}px;z-index:${SIGN_Y + 120}">
      <b>당근 사진 마을 전시회</b><span>천천히 산책하며 구경하세요</span></div>`);
    for (const [x, y] of [
      [PLAZA_X - 170, TOP - 60],
      [PLAZA_X + (COLS - 1) * GAP_X + 140, TOP - 60],
      [PLAZA_X - 170, plazaBottom - 120],
      [PLAZA_X + (COLS - 1) * GAP_X + 140, plazaBottom - 120],
    ])
      add('lamp', x, y, '', y + 110);
    add('bench', PLAZA_X - 200, TOP + 140, '', TOP + 190);
    add('bench', PLAZA_X + (COLS - 1) * GAP_X + 110, TOP + 140, '', TOP + 190);
    add('garden', W / 2 + 160, SIGN_Y - 10, '', SIGN_Y + 100);
    out[out.length - 1] = out[out.length - 1].replace('></div>', `>${'<i></i>'.repeat(6)}</div>`);

    // --- 마을 테두리 나무 (숲 아래 구역)
    for (let y = FOREST_H; y < SAND_Y - 100; y += 120) {
      add('tree', 10 + rand() * 30, y + rand() * 30, '', y + 120);
      add('tree tree-pine', W - 95 + rand() * 20, y + rand() * 30, '', y + 120);
    }
    // --- 풀과 들꽃
    const flowers = ['#ff8fa3', '#ffd166', '#ffffff', '#b39ddb', '#ff8a3d'];
    for (let i = 0; i < 260; i++) {
      const x = 80 + rand() * (W - 160);
      const y = FOREST_H + rand() * (SAND_Y - FOREST_H);
      if (x > FIELD.x - 20 && x < FIELD.x + FIELD.w + 20 && y > fieldTop && y < fieldTop + fieldH) continue;
      if (blocked(x, y)) continue;
      out.push(
        rand() < 0.5
          ? `<span class="flower" style="left:${x}px;top:${y}px;--f:${flowers[i % flowers.length]}"></span>`
          : `<span class="grass" style="left:${x}px;top:${y}px"></span>`
      );
    }
    $('#decor').innerHTML = out.join('');
  }

  function renderSpots() {
    $('#easels').innerHTML = spots
      .map((s) => {
        if (s.kind === 'board') {
          return `<button class="prop prop-board" data-index="board" style="left:${s.x}px;top:${s.y}px;z-index:${s.y + 120}" aria-label="마을 게시판 - 작품 모아보기">
            <span class="paper p1"></span><span class="paper p2"></span><span class="paper p3"></span><b>게시판</b></button>`;
        }
        if (s.kind === 'mailbox') {
          return `<button class="prop prop-mailbox" data-index="mailbox" style="left:${s.x}px;top:${s.y}px;z-index:${s.y + 100}" aria-label="우체통 - 작품 걸기">
            <span class="flag"></span><b>작품 접수</b></button>`;
        }
        const p = s.photo;
        const z = Math.round(s.y + 70);
        if (!p) {
          return `<button class="easel empty" data-index="${s.index}" style="left:${s.x}px;top:${s.y}px;z-index:${z}" aria-label="빈 액자 - 작품 걸기">
            <div class="canvas"><span>＋<br>빈 액자</span></div><div class="legs"></div></button>`;
        }
        return `<button class="easel" data-index="${s.index}" style="left:${s.x}px;top:${s.y}px;z-index:${z}" aria-label="${esc(p.title)} - ${esc(p.nickname)}">
          <div class="canvas"><img src="${esc(p.url)}" alt="" loading="lazy"></div>
          <div class="legs"></div>
          <div class="plate"><span class="mini">${characterMarkup(p.character)}</span>
            <span><b>${esc(p.title)}</b><small>${esc(p.nickname)}${p.likes ? ` · ♥ ${p.likes}` : ''}</small></span></div>
        </button>`;
      })
      .join('');
    nearSpot = null; // 다시 계산
  }
  const renderEasels = renderSpots;
  const spotByIndex = (i) => spots.find((s) => String(s.index) === String(i));

  $('#easels').addEventListener('click', (e) => {
    const b = e.target.closest('.easel, .prop');
    if (!b) return;
    e.stopPropagation();
    if (pinchedRecently()) return;
    const spot = spotByIndex(b.dataset.index);
    walkTo(...standSpot(spot), () => interact(spot));
  });

  // 액자를 가리지 않도록 옆에 서요.
  const standSpot = (s) => (s.kind === 'easel' ? [s.x + 108, s.y + 175] : [s.x + 20, s.y + 150]);
  const spotCenter = (s) => (s.kind === 'easel' ? [s.x, s.y + 120] : [s.x, s.y + 100]);
  const actKey = matchMedia('(hover: none)').matches ? '👆' : '<kbd>Space</kbd>';

  function interact(spot) {
    if (!spot) return;
    if (spot.kind === 'board') return openList();
    if (spot.kind === 'mailbox') return openUpload();
    if (spot.photo) openView(spot.photo);
    else openUpload();
  }

  function renderPlayer() {
    $('.body', playerEl).innerHTML = characterMarkup(resident.character);
    $('.name-tag', playerEl).textContent = resident.nickname;
    $('#hud-avatar').innerHTML = characterMarkup(resident.character);
    $('#hud-name').textContent = resident.nickname;
  }

  async function refresh() {
    try {
      photos = await store.list();
    } catch (err) {
      toast(err.message);
    }
    layout();
    if ($('#list-modal').open) renderList();
    if ($('#members-modal').open) renderMembers();
  }

  function enterVillage(first = false) {
    renderPlayer();
    $('#demo-banner').hidden = store.mode !== 'demo';
    show('village');
    startPresence();
    refresh().then(() => {
      if (!villageStarted) {
        villageStarted = true;
        requestAnimationFrame(loop);
      }
      const lines = first
        ? [
            `어서 와요, ${resident.nickname} 님! 당근 사진 마을에 오신 걸 환영해요.`,
            '광장에 걸린 액자들은 모두 우리 동호회 주민들이 직접 찍은 사진이에요. 액자를 누르면 크게 볼 수 있어요.',
            '광장 둘레에는 숲속 산책길, 꽃밭, 호숫가, 해변도 있어요. 왼쪽 위 지도를 누르면 그곳으로 걸어가요.',
            '오른쪽 아래 ＋/－ 버튼(휴대폰은 두 손가락)으로 마을을 크게·작게 볼 수 있어요.',
            '빈 액자나 우체통에서 내 사진도 걸어 보세요. "👥 주민"을 누르면 지금 누가 마을에 있는지 보여요!',
          ]
        : [`다시 오셨군요, ${resident.nickname} 님! 지금 광장에 ${photos.length}점의 작품이 걸려 있어요.`];
      say('안내원 당근이', lines);
    });
  }

  // ---------- 확대 / 축소 ----------
  const ZOOM_KEY = 'carrot-photo-village:zoom';
  const ZMIN = 0.4;
  const ZMAX = 1.4;
  let zoom = (() => {
    try {
      const z = parseFloat(localStorage.getItem(ZOOM_KEY));
      if (z >= ZMIN && z <= ZMAX) return z;
    } catch {}
    return innerWidth < 600 ? 0.55 : 0.8;
  })();
  function setZoom(z) {
    zoom = Math.max(ZMIN, Math.min(ZMAX, Math.round(z * 100) / 100));
    try {
      localStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {}
  }
  $('#zoom-in').addEventListener('click', () => setZoom(zoom + 0.15));
  $('#zoom-out').addEventListener('click', () => setZoom(zoom - 0.15));
  viewport.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      setZoom(zoom * (e.deltaY > 0 ? 0.9 : 1.1));
    },
    { passive: false }
  );
  // 두 손가락으로 확대/축소
  const pointers = new Map();
  let pinch = null;
  let pinchEndedAt = 0;
  const pinchedRecently = () => Date.now() - pinchEndedAt < 350;
  const pdist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  viewport.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinch = { d: pdist(), z: zoom };
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) setZoom((pinch.z * pdist()) / pinch.d);
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pinch && pointers.size < 2) {
      pinch = null;
      pinchEndedAt = Date.now();
    }
  };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => viewport.addEventListener(ev, endPointer));

  // ---------- 이동 ----------
  const keys = new Set();
  const KEYMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  window.addEventListener('keydown', (e) => {
    if (!$('#village').classList.contains('active') || anyModalOpen()) return;
    if (e.target.matches('input, textarea')) return;
    if (dialogOpen()) {
      if (['Space', 'Enter', 'KeyE'].includes(e.code)) {
        e.preventDefault();
        nextLine();
      }
      return;
    }
    if (KEYMAP[e.code]) {
      e.preventDefault();
      keys.add(KEYMAP[e.code]);
      target = null;
    } else if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
      e.preventDefault();
      if (nearSpot) interact(nearSpot);
    } else if (e.key === '+' || e.key === '=') setZoom(zoom + 0.15);
    else if (e.key === '-' || e.key === '_') setZoom(zoom - 0.15);
  });
  window.addEventListener('keyup', (e) => KEYMAP[e.code] && keys.delete(KEYMAP[e.code]));
  window.addEventListener('blur', () => keys.clear());

  viewport.addEventListener('click', (e) => {
    if (dialogOpen()) return nextLine();
    if (pinchedRecently()) return;
    const rect = world.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    walkTo(x, y);
    const m = $('#tap-marker');
    m.style.left = x + 'px';
    m.style.top = y + 'px';
    m.classList.remove('pop');
    void m.offsetWidth;
    m.classList.add('pop');
  });

  function walkTo(x, y, onArrive) {
    target = { x: clampX(x), y: clampY(y), onArrive };
  }
  const clampX = (x) => Math.max(70, Math.min(W - 70, x));
  const clampY = (y) => Math.max(90, Math.min(H - 40, y));

  let last = 0;
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    const speed = 320;
    let vx = 0;
    let vy = 0;
    if (keys.size) {
      vx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
      vy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
    } else if (target) {
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        const cb = target.onArrive;
        target = null;
        cb && cb();
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }
    let moved = false;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      const step = Math.min(speed * dt, target ? Math.hypot(target.x - player.x, target.y - player.y) : Infinity);
      const nx = clampX(player.x + (vx / len) * step);
      const ny = clampY(player.y + (vy / len) * step);
      // 물에 막히면 한 방향으로라도 미끄러지듯 움직여요.
      if (!blocked(nx, ny)) [player.x, player.y, moved] = [nx, ny, true];
      else if (!blocked(nx, player.y) && nx !== player.x) [player.x, moved] = [nx, true];
      else if (!blocked(player.x, ny) && ny !== player.y) [player.y, moved] = [ny, true];
      else target = null; // 더 갈 수 없어요
      if (vx) player.dir = vx > 0 ? 1 : -1;
    }
    player.moving = moved;
    moveOthers(dt);
    draw(t);
    sendPosition(t);
    requestAnimationFrame(loop);
  }

  function draw(t) {
    playerEl.style.transform = `translate(${player.x}px, ${player.y}px)`;
    playerEl.style.zIndex = Math.round(player.y);
    playerEl.classList.toggle('walking', player.moving);
    playerEl.classList.toggle('flip', player.dir < 0);

    // 카메라: 플레이어를 화면 가운데에 (확대/축소 반영)
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const sw = W * zoom;
    const sh = H * zoom;
    const cx = sw <= vw ? (vw - sw) / 2 : Math.max(vw - sw, Math.min(0, vw / 2 - player.x * zoom));
    const cy = sh <= vh ? (vh - sh) / 2 : Math.max(vh - sh, Math.min(0, vh / 2 - player.y * zoom));
    world.style.transform = `translate(${cx}px, ${cy}px) scale(${zoom})`;

    // 가까운 액자/물건 찾기
    let best = null;
    let bestD = 150;
    for (const s of spots) {
      const [sx, sy] = spotCenter(s);
      const d = Math.hypot(sx - player.x, sy - player.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best !== nearSpot) {
      nearSpot = best;
      $$('.easel.near, .prop.near').forEach((e) => e.classList.remove('near'));
      const hint = $('#hint');
      if (best) {
        $(`[data-index="${best.index}"]`, $('#easels'))?.classList.add('near');
        hint.innerHTML =
          best.kind === 'board'
            ? `마을 게시판 · ${actKey} 작품 모아보기`
            : best.kind === 'mailbox'
              ? `작품 접수 우체통 · ${actKey} 내 작품 걸기`
              : best.photo
                ? `<b>「${esc(best.photo.title)}」</b> ${esc(best.photo.nickname)} · ${actKey} 감상하기`
                : `빈 액자예요 · ${actKey} 내 작품 걸기`;
        hint.hidden = false;
      } else hint.hidden = true;
    }
    drawMinimap(t);
  }

  // ---------- 미니맵 ----------
  const mini = $('#minimap');
  const mctx = mini.getContext('2d');
  let miniBase = null;
  let miniDrawnAt = 0;
  function buildMinimap() {
    const mw = mini.clientWidth || 150;
    const mh = Math.round((mw * H) / W);
    const dpr = Math.min(2, devicePixelRatio || 1);
    mini.width = mw * dpr;
    mini.height = mh * dpr;
    mini.style.height = mh + 'px';
    miniBase = document.createElement('canvas');
    miniBase.width = mini.width;
    miniBase.height = mini.height;
    const c = miniBase.getContext('2d');
    const s = mini.width / W;
    c.fillStyle = '#9fd88a';
    c.fillRect(0, 0, miniBase.width, miniBase.height);
    c.fillStyle = '#4ea85a';
    c.fillRect(0, 0, W * s, (FOREST_H - 60) * s);
    c.fillStyle = '#ead7ae';
    c.fillRect((W / 2 - 40) * s, FOREST_H * s, 80 * s, (SAND_Y - FOREST_H) * s);
    c.fillRect(120 * s, (SIGN_Y + 205) * s, (W - 240) * s, 66 * s);
    c.fillStyle = '#f2a7b8';
    c.fillRect(FIELD.x * s, (TOP - 140) * s, FIELD.w * s, Math.max(640, SAND_Y - TOP - 180) * s);
    c.fillStyle = '#6cc3ec';
    c.beginPath();
    c.ellipse(LAKE.cx * s, LAKE.cy * s, LAKE.rx * s, LAKE.ry * s, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f5e1a4';
    c.fillRect(0, SAND_Y * s, W * s, (SEA_Y - SAND_Y) * s);
    c.fillStyle = '#5ab0e6';
    c.fillRect(0, SEA_Y * s, W * s, (H - SEA_Y) * s);
    for (const sp of spots) {
      if (sp.kind !== 'easel') continue;
      c.fillStyle = sp.photo ? '#b07a4a' : 'rgba(176,122,74,.4)';
      c.fillRect((sp.x - 60) * s, sp.y * s, 120 * s, 90 * s);
    }
  }
  function drawMinimap(t) {
    if (!miniBase || t - miniDrawnAt < 120) return;
    miniDrawnAt = t;
    const s = mini.width / W;
    mctx.drawImage(miniBase, 0, 0);
    // 지금 보이는 범위
    const vw = viewport.clientWidth / zoom;
    const vh = viewport.clientHeight / zoom;
    const vx = Math.max(0, Math.min(W - vw, player.x - vw / 2));
    const vy = Math.max(0, Math.min(H - vh, player.y - vh / 2));
    mctx.strokeStyle = 'rgba(255,255,255,.9)';
    mctx.lineWidth = 2;
    mctx.strokeRect(vx * s, vy * s, Math.min(W, vw) * s, Math.min(H, vh) * s);
    const dot = (x, y, color, r) => {
      mctx.fillStyle = color;
      mctx.beginPath();
      mctx.arc(x * s, y * s, r, 0, Math.PI * 2);
      mctx.fill();
      mctx.strokeStyle = '#fff';
      mctx.lineWidth = 1.5;
      mctx.stroke();
    };
    const r = Math.max(3, mini.width / 50);
    for (const o of others.values()) dot(o.x, o.y, '#5b8def', r * 0.85);
    dot(player.x, player.y, '#ff7a2f', r);
  }
  mini.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dialogOpen()) return nextLine();
    const rect = mini.getBoundingClientRect();
    walkTo(((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H);
  });
  addEventListener('resize', () => villageStarted && buildMinimap());

  // ---------- 다른 주민 (실시간) ----------
  const others = new Map(); // id → { nickname, character, x, y, tx, ty, dir, el }
  let presence = null;
  let online = [];
  let lastSent = { t: 0, x: 0, y: 0 };
  function startPresence() {
    const me = { nickname: resident.nickname, character: resident.character, x: Math.round(player.x), y: Math.round(player.y) };
    if (presence) return presence.update(me);
    presence = store.joinVillage(me, (list) => {
      online = list;
      syncOthers();
    });
    addEventListener('pagehide', () => presence?.leave());
  }
  function sendPosition(t) {
    if (!presence) return;
    const movedFar = Math.hypot(player.x - lastSent.x, player.y - lastSent.y) > 4;
    // 움직이는 동안 1초에 한 번, 멈추면 마지막 위치를 한 번 보내요.
    if (movedFar && (t - lastSent.t > 1000 || !player.moving)) {
      lastSent = { t, x: player.x, y: player.y };
      presence.update({ x: Math.round(player.x), y: Math.round(player.y), dir: player.dir });
    }
  }
  function syncOthers() {
    const seen = new Set();
    for (const m of online) {
      if (m.self) continue;
      seen.add(m.id);
      let o = others.get(m.id);
      if (!o) {
        const el = document.createElement('div');
        el.className = 'actor other';
        el.innerHTML = '<div class="shadow"></div><div class="body"></div><div class="name-tag"></div>';
        world.appendChild(el);
        o = { el, x: m.x ?? W / 2, y: m.y ?? SIGN_Y + 260, character: null, nickname: null };
        others.set(m.id, o);
      }
      if (o.character !== m.character) {
        o.character = m.character;
        $('.body', o.el).innerHTML = characterMarkup(m.character);
      }
      if (o.nickname !== m.nickname) {
        o.nickname = m.nickname;
        $('.name-tag', o.el).textContent = m.nickname;
      }
      o.tx = m.x ?? o.x;
      o.ty = m.y ?? o.y;
      o.dir = m.dir || o.dir || 1;
    }
    for (const [id, o] of others) {
      if (!seen.has(id)) {
        o.el.remove();
        others.delete(id);
      }
    }
    $('#online-count').textContent = online.length || 1;
    if ($('#members-modal').open) renderMembers();
  }
  function moveOthers(dt) {
    for (const o of others.values()) {
      const dx = o.tx - o.x;
      const dy = o.ty - o.y;
      const d = Math.hypot(dx, dy);
      const walking = d > 2;
      if (d > 900) [o.x, o.y] = [o.tx, o.ty]; // 너무 멀면 순간이동
      else if (walking) {
        const step = Math.min(d, 340 * dt);
        o.x += (dx / d) * step;
        o.y += (dy / d) * step;
        if (Math.abs(dx) > 1) o.dir = dx > 0 ? 1 : -1;
      }
      o.el.style.transform = `translate(${o.x}px, ${o.y}px)`;
      o.el.style.zIndex = Math.round(o.y);
      o.el.classList.toggle('walking', walking);
      o.el.classList.toggle('flip', o.dir < 0);
    }
  }

  // ---------- 주민 목록 ----------
  let membersTab = 'online';
  $('#members-btn').addEventListener('click', () => {
    renderMembers();
    $('#members-modal').showModal();
  });
  $('#members-tabs').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    membersTab = c.dataset.tab;
    renderMembers();
  });
  function artists() {
    const map = new Map();
    for (const p of photos) {
      const k = p.nickname;
      const a = map.get(k) || { nickname: p.nickname, character: p.character, works: 0, likes: 0 };
      a.works += 1;
      a.likes += p.likes;
      map.set(k, a);
    }
    return [...map.values()].sort((a, b) => b.works - a.works || b.likes - a.likes);
  }
  function renderMembers() {
    const list = online.length ? online : [{ self: true, nickname: resident.nickname, character: resident.character, x: player.x, y: player.y }];
    const arts = artists();
    $$('#members-tabs .chip').forEach((c) => c.classList.toggle('active', c.dataset.tab === membersTab));
    $('#tab-online-count').textContent = list.length;
    $('#tab-artists-count').textContent = arts.length;
    const box = $('#members-list');
    if (membersTab === 'online') {
      const sorted = [...list].sort((a, b) => (b.self ? 1 : 0) - (a.self ? 1 : 0));
      box.innerHTML =
        sorted
          .map((m) => {
            const pos = m.self ? player : others.get(m.id) || m;
            return `<li class="member">
              <span class="member-avatar">${characterMarkup(m.character)}</span>
              <span class="member-info"><b>${esc(m.nickname)}${m.self ? ' <em>나</em>' : ''}</b>
                <small>📍 ${zoneOf(pos.x ?? W / 2, pos.y ?? TOP)}에 있어요</small></span>
              ${m.self ? '' : `<button class="btn btn-ghost btn-sm" data-visit="${esc(m.id)}">만나러 가기</button>`}
            </li>`;
          })
          .join('') +
        (list.length <= 1
          ? `<li class="member-empty">지금은 나 혼자 산책 중이에요. 단톡방에 마을 주소를 공유해 보세요!</li>`
          : '') +
        (store.mode === 'demo' ? `<li class="member-empty">체험 모드에서는 같은 기기의 다른 창만 보여요.</li>` : '');
    } else {
      box.innerHTML = arts.length
        ? arts
            .map(
              (a) => `<li class="member">
              <span class="member-avatar">${characterMarkup(a.character)}</span>
              <span class="member-info"><b>${esc(a.nickname)}</b><small>작품 ${a.works}점 · ♥ ${a.likes}</small></span>
              <button class="btn btn-ghost btn-sm" data-artist="${esc(a.nickname)}">작품 보기</button>
            </li>`
            )
            .join('')
        : `<li class="member-empty">아직 작품을 건 주민이 없어요.</li>`;
    }
  }
  $('#members-list').addEventListener('click', (e) => {
    const visit = e.target.closest('[data-visit]');
    const artist = e.target.closest('[data-artist]');
    if (visit) {
      const o = others.get(visit.dataset.visit);
      $('#members-modal').close();
      if (o) walkTo(o.tx + 70, o.ty + 10);
    } else if (artist) {
      $('#members-modal').close();
      openList({ artist: artist.dataset.artist });
    }
  });

  // ---------- 대화창 ----------
  let lines = [];
  let typing = null;
  const dialogOpen = () => !$('#dialog').hidden;
  function say(who, ls) {
    lines = [...ls];
    $('#dialog-who').innerHTML = `${characterMarkup('carrot')}<span>${esc(who)}</span>`;
    $('#dialog').hidden = false;
    nextLine();
  }
  function nextLine() {
    const p = $('#dialog-text');
    if (typing) {
      clearInterval(typing.id);
      p.textContent = typing.text;
      typing = null;
      return;
    }
    if (!lines.length) {
      $('#dialog').hidden = true;
      return;
    }
    const text = lines.shift();
    let i = 0;
    p.textContent = '';
    typing = {
      text,
      id: setInterval(() => {
        p.textContent = text.slice(0, ++i);
        if (i >= text.length) {
          clearInterval(typing.id);
          typing = null;
        }
      }, 28),
    };
  }
  $('#dialog').addEventListener('click', (e) => {
    e.stopPropagation();
    nextLine();
  });

  // ---------- 작품 감상 ----------
  let viewing = null;
  function openView(p) {
    viewing = p;
    $('#view-img').src = p.url;
    $('#view-img').alt = p.title;
    $('#view-title').textContent = p.title;
    const d = new Date(p.createdAt);
    $('#view-artist').innerHTML = `<span class="mini">${characterMarkup(p.character)}</span>
      <span><b>${esc(p.nickname)}</b> 주민의 작품 · ${d.toLocaleDateString('ko-KR')}</span>`;
    $('#view-desc').textContent = p.description || '';
    $('#view-desc').hidden = !p.description;
    updateLike(p);
    $('#delete-btn').hidden = !p.mine;
    $('#view-modal').showModal();
  }
  function updateLike(p) {
    const b = $('#like-btn');
    b.classList.toggle('liked', p.likedByMe);
    b.firstChild.textContent = p.likedByMe ? '♥ ' : '♡ ';
    $('span', b).textContent = p.likes;
  }
  $('#like-btn').addEventListener('click', async () => {
    try {
      $('#like-btn').disabled = true;
      await store.toggleLike(viewing);
      updateLike(viewing);
      renderEasels();
    } catch (err) {
      toast(err.message);
    } finally {
      $('#like-btn').disabled = false;
    }
  });
  $('#delete-btn').addEventListener('click', async () => {
    if (!confirm(`「${viewing.title}」 작품을 광장에서 내릴까요?`)) return;
    try {
      await store.remove(viewing);
      $('#view-modal').close();
      toast('작품을 내렸어요.');
      refresh();
    } catch (err) {
      toast(err.message);
    }
  });

  // ---------- 업로드 ----------
  const form = $('#upload-form');
  const fileInput = $('#photo-input');
  function setCodeField(visible) {
    $('#club-code-field').hidden = !visible;
    $('#club-code').required = visible;
  }
  function openUpload() {
    form.reset();
    $('#preview').hidden = true;
    $('#drop-text').hidden = false;
    $('#upload-error').textContent = '';
    setCodeField(false);
    $('#upload-modal').showModal();
    // 아직 회원 인증 전이고 코드가 필요한 마을이면 코드 입력칸을 보여줘요.
    Promise.all([store.isMember(), store.requiresCode()])
      .then(([member, needs]) => setCodeField(!member && needs))
      .catch(() => {});
  }
  $('#upload-btn').addEventListener('click', openUpload);
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    const img = $('#preview');
    img.src = URL.createObjectURL(f);
    img.hidden = false;
    $('#drop-text').hidden = true;
    const title = form.elements.title;
    if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '').slice(0, 40);
  });
  const dz = $('#dropzone');
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('over');
    })
  );
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('over')));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const file = fileInput.files[0];
    if (!file) {
      $('#upload-error').textContent = '사진을 선택해 주세요.';
      return;
    }
    const btn = $('#upload-submit');
    btn.disabled = true;
    btn.textContent = '거는 중…';
    $('#upload-error').textContent = '';
    try {
      const photo = await store.add({
        file,
        title: String(fd.get('title')).trim().slice(0, 40),
        description: String(fd.get('description') || '').trim().slice(0, 300),
        nickname: resident.nickname,
        character: resident.character,
        code: String(fd.get('clubCode') || '').trim(),
      });
      $('#upload-modal').close();
      await refresh();
      const spot = spots.find((s) => s.photo?.id === photo.id);
      if (spot) walkTo(...standSpot(spot));
      say('안내원 당근이', [`「${photo.title}」 작품이 광장에 걸렸어요! 다른 주민들도 곧 구경하러 올 거예요.`]);
    } catch (err) {
      if (err.code === 'CLUB_CODE') {
        setCodeField(true);
        $('#club-code').focus();
      }
      $('#upload-error').textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = '걸기';
    }
  });

  // ---------- 모아보기 ----------
  let filter = 'all';
  let artistFilter = null;
  function openList(opts = {}) {
    artistFilter = opts.artist || null;
    if (artistFilter) filter = 'all';
    $$('.list-filter .chip').forEach((x) => x.classList.toggle('active', !artistFilter && x.dataset.filter === filter));
    renderList();
    $('#list-modal').showModal();
  }
  $('#list-btn').addEventListener('click', () => openList());
  $('.list-filter').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    filter = c.dataset.filter;
    artistFilter = null;
    $$('.list-filter .chip').forEach((x) => x.classList.toggle('active', x === c));
    renderList();
  });
  function renderList() {
    let list = photos;
    if (artistFilter) list = photos.filter((p) => p.nickname === artistFilter);
    if (filter === 'mine') list = photos.filter((p) => p.mine);
    if (filter === 'popular') list = [...photos].sort((a, b) => b.likes - a.likes);
    $('#list-count').textContent = artistFilter ? `${artistFilter} 님 작품 ${list.length}점` : `${list.length}점`;
    $('#list-grid').innerHTML = list.length
      ? list
          .map(
            (p) => `<button class="card" data-id="${p.id}">
          <img src="${esc(p.url)}" alt="" loading="lazy">
          <span class="card-info"><span class="mini">${characterMarkup(p.character)}</span>
            <span><b>${esc(p.title)}</b><small>${esc(p.nickname)} · ♥ ${p.likes}</small></span></span>
        </button>`
          )
          .join('')
      : `<p class="empty-list">${filter === 'mine' ? '아직 내가 건 작품이 없어요.' : '아직 걸린 작품이 없어요. 첫 작품의 주인공이 되어 보세요!'}</p>`;
  }
  $('#list-grid').addEventListener('click', (e) => {
    const c = e.target.closest('.card');
    if (!c) return;
    const p = photos.find((x) => x.id === c.dataset.id);
    const spot = spots.find((s) => s.photo?.id === p.id);
    $('#list-modal').close();
    target = null;
    if (spot) {
      [player.x, player.y] = standSpot(spot);
      target = null;
    }
    openView(p);
  });

  // 다른 주민이 올린 작품도 보이도록 주기적으로 새로고침
  setInterval(() => {
    if ($('#village').classList.contains('active') && !anyModalOpen()) refresh();
  }, 30000);
})();
