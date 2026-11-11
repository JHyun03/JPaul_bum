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
  const COLS = 5;
  const GAP_X = 250;
  const GAP_Y = 280;
  const TOP = 470;
  const MARGIN = 300;
  const W = MARGIN * 2 + (COLS - 1) * GAP_X;
  let H = 1200;
  let photos = [];
  let spots = []; // { x, y, photo|null }
  const player = { x: W / 2, y: 380, dir: 1, moving: false };
  let target = null;
  let nearSpot = null;
  let villageStarted = false;

  // 시드 고정 난수 (장식이 매번 같은 자리에 있도록)
  function rng(seed) {
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  }

  function layout() {
    const count = Math.max(photos.length + 1, COLS * 2); // 항상 빈 액자 하나 이상
    const rows = Math.ceil(count / COLS);
    H = TOP + rows * GAP_Y + 220;
    spots = [];
    for (let i = 0; i < rows * COLS; i++) {
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      spots.push({ x: MARGIN + c * GAP_X, y: TOP + r * GAP_Y, photo: photos[i] || null, index: i });
    }
    world.style.width = W + 'px';
    world.style.height = H + 'px';
    renderDecor(rows);
    renderEasels();
  }

  function renderDecor(rows) {
    const rand = rng(42);
    let html = '';
    // 산책로 (가로)
    for (let r = 0; r < rows; r++) {
      html += `<div class="path" style="top:${TOP + r * GAP_Y + 62}px;left:120px;width:${W - 240}px"></div>`;
    }
    html += `<div class="path path-v" style="left:${W / 2 - 40}px;top:180px;height:${H - 320}px"></div>`;
    // 광장 입구 간판
    html += `<div class="signboard" style="left:${W / 2 - 150}px;top:150px">
      <b>당근 사진 마을 전시회</b><span>천천히 산책하며 구경하세요</span></div>`;
    // 연못
    html += `<div class="pond" style="left:${W - 230}px;top:120px"></div>`;
    // 테두리 나무
    const trees = [];
    for (let x = 30; x < W; x += 110) trees.push([x + rand() * 30, 20 + rand() * 30], [x + rand() * 30, H - 110 + rand() * 20]);
    for (let y = 150; y < H - 120; y += 120) trees.push([20 + rand() * 30, y + rand() * 30], [W - 90 + rand() * 20, y + rand() * 30]);
    trees.forEach(([x, y], i) => {
      html += `<div class="tree ${i % 3 === 0 ? 'tree-fruit' : ''}" style="left:${x}px;top:${y}px;z-index:${Math.round(y + 90)}"></div>`;
    });
    // 꽃과 풀
    const flowers = ['#ff8fa3', '#ffd166', '#ffffff', '#b39ddb', '#ff8a3d'];
    for (let i = 0; i < Math.round((W * H) / 14000); i++) {
      const x = 110 + rand() * (W - 220);
      const y = 140 + rand() * (H - 280);
      if (rand() < 0.55) {
        html += `<span class="flower" style="left:${x}px;top:${y}px;--f:${flowers[i % flowers.length]}"></span>`;
      } else {
        html += `<span class="grass" style="left:${x}px;top:${y}px"></span>`;
      }
    }
    // 작은 텃밭 (당근!)
    html += `<div class="garden" style="left:140px;top:150px">${'<i></i>'.repeat(6)}</div>`;
    $('#decor').innerHTML = html;
  }

  function renderEasels() {
    $('#easels').innerHTML = spots
      .map((s) => {
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
  }

  $('#easels').addEventListener('click', (e) => {
    const b = e.target.closest('.easel');
    if (!b) return;
    e.stopPropagation();
    const spot = spots[+b.dataset.index];
    walkTo(...standSpot(spot), () => interact(spot));
  });

  // 액자를 가리지 않도록 액자 오른쪽 아래에 서요.
  const standSpot = (spot) => [spot.x + 108, spot.y + 175];
  const actKey = matchMedia('(hover: none)').matches ? '👆' : '<kbd>Space</kbd>';

  function interact(spot) {
    if (!spot) return;
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
  }

  function enterVillage(first = false) {
    renderPlayer();
    $('#demo-banner').hidden = store.mode !== 'demo';
    show('village');
    refresh().then(() => {
      if (!villageStarted) {
        villageStarted = true;
        requestAnimationFrame(loop);
      }
      const lines = first
        ? [
            `어서 와요, ${resident.nickname} 님! 당근 사진 마을에 오신 걸 환영해요.`,
            '광장에 걸린 액자들은 모두 우리 동호회 주민들이 직접 찍은 사진이에요.',
            '액자 앞으로 걸어가서 Space나 E를 누르면 (또는 액자를 누르면) 크게 감상할 수 있어요.',
            '빈 액자나 오른쪽 위 "작품 걸기"로 내 사진도 걸어 보세요. 그럼 즐거운 산책 되세요!',
          ]
        : [`다시 오셨군요, ${resident.nickname} 님! 지금 광장에 ${photos.length}점의 작품이 걸려 있어요.`];
      say('안내원 당근이', lines);
    });
  }

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
    }
  });
  window.addEventListener('keyup', (e) => KEYMAP[e.code] && keys.delete(KEYMAP[e.code]));
  window.addEventListener('blur', () => keys.clear());

  viewport.addEventListener('click', (e) => {
    if (dialogOpen()) return nextLine();
    const rect = world.getBoundingClientRect();
    walkTo(e.clientX - rect.left, e.clientY - rect.top);
    const m = $('#tap-marker');
    m.style.left = e.clientX - rect.left + 'px';
    m.style.top = e.clientY - rect.top + 'px';
    m.classList.remove('pop');
    void m.offsetWidth;
    m.classList.add('pop');
  });

  function walkTo(x, y, onArrive) {
    target = { x: clampX(x), y: clampY(y), onArrive };
  }
  const clampX = (x) => Math.max(110, Math.min(W - 110, x));
  const clampY = (y) => Math.max(140, Math.min(H - 120, y));

  let last = 0;
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    const speed = 260;
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
    const len = Math.hypot(vx, vy) || 1;
    if (vx || vy) {
      player.x = clampX(player.x + (vx / len) * speed * dt);
      player.y = clampY(player.y + (vy / len) * speed * dt);
      if (vx) player.dir = vx > 0 ? 1 : -1;
    }
    player.moving = !!(vx || vy);
    draw();
    requestAnimationFrame(loop);
  }

  function draw() {
    playerEl.style.transform = `translate(${player.x}px, ${player.y}px)`;
    playerEl.style.zIndex = Math.round(player.y);
    playerEl.classList.toggle('walking', player.moving);
    playerEl.classList.toggle('flip', player.dir < 0);

    // 카메라: 플레이어를 화면 가운데에
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cx = W <= vw ? (vw - W) / 2 : Math.max(vw - W, Math.min(0, vw / 2 - player.x));
    const cy = H <= vh ? (vh - H) / 2 : Math.max(vh - H, Math.min(0, vh / 2 - player.y));
    world.style.transform = `translate(${cx}px, ${cy}px)`;

    // 가까운 액자 찾기
    let best = null;
    let bestD = 150;
    for (const s of spots) {
      const d = Math.hypot(s.x - player.x, s.y + 120 - player.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best !== nearSpot) {
      nearSpot = best;
      $$('.easel.near').forEach((e) => e.classList.remove('near'));
      const hint = $('#hint');
      if (best) {
        $(`.easel[data-index="${best.index}"]`)?.classList.add('near');
        hint.innerHTML = best.photo
          ? `<b>「${esc(best.photo.title)}」</b> ${esc(best.photo.nickname)} · ${actKey} 감상하기`
          : `빈 액자예요 · ${actKey} 내 작품 걸기`;
        hint.hidden = false;
      } else hint.hidden = true;
    }
  }

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
  $('#list-btn').addEventListener('click', () => {
    renderList();
    $('#list-modal').showModal();
  });
  $('.list-filter').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    filter = c.dataset.filter;
    $$('.list-filter .chip').forEach((x) => x.classList.toggle('active', x === c));
    renderList();
  });
  function renderList() {
    let list = photos;
    if (filter === 'mine') list = photos.filter((p) => p.mine);
    if (filter === 'popular') list = [...photos].sort((a, b) => b.likes - a.likes);
    $('#list-count').textContent = `${list.length}점`;
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
