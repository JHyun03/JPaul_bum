// 데이터 저장소: Supabase(실서비스) 또는 체험 모드(이 기기에만 저장)
// app.js는 아래 공통 인터페이스만 사용해요.
//   mode, list(), add({file,title,description,nickname,character,code}), toggleLike(photo), remove(photo),
//   requiresCode(), isMember()

(() => {
  'use strict';
  const cfg = window.APP_CONFIG || {};

  // 업로드 전에 사진을 줄여서 무료 저장 공간을 아껴요 (긴 변 1600px JPEG).
  async function shrinkImage(file, maxSide = 1600, quality = 0.85) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이 사진 형식은 열 수 없어요. JPG나 PNG로 올려 주세요.'));
        img.src = URL.createObjectURL(file);
      });
    }
    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (!blob) throw new Error('사진을 처리하지 못했어요.');
    return blob;
  }

  const uuid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });

  // ---------------- Supabase ----------------
  function supabaseStore() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'carrot-photo-village-auth' },
    });
    const BUCKET = 'photos';
    let userId = null;

    const fail = (error, fallback) => {
      if (!error) return;
      console.error(error);
      throw new Error(fallback || error.message);
    };

    async function currentUser() {
      if (userId) return userId;
      const { data } = await sb.auth.getSession();
      userId = data.session?.user?.id || null;
      return userId;
    }
    // 처음 작품을 걸거나 좋아요를 누를 때 익명 주민 계정을 만들어요 (로그인 화면 없음).
    async function ensureUser() {
      if (await currentUser()) return userId;
      const { data, error } = await sb.auth.signInAnonymously();
      fail(error, '주민 등록에 실패했어요. 잠시 후 다시 시도해 주세요.');
      userId = data.user.id;
      return userId;
    }

    return {
      mode: 'supabase',
      async list() {
        const uid = await currentUser();
        const { data, error } = await sb.from('photo_feed').select('*').order('created_at', { ascending: false });
        fail(error, '작품을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
        let liked = new Set();
        if (uid) {
          const res = await sb.from('likes').select('photo_id').eq('user_id', uid);
          if (!res.error) liked = new Set(res.data.map((r) => r.photo_id));
        }
        return data.map((p) => ({
          id: p.id,
          url: sb.storage.from(BUCKET).getPublicUrl(p.path).data.publicUrl,
          path: p.path,
          title: p.title,
          description: p.description,
          nickname: p.nickname,
          character: p.character,
          createdAt: p.created_at,
          likes: p.likes,
          likedByMe: liked.has(p.id),
          mine: !!uid && p.user_id === uid,
        }));
      },
      async requiresCode() {
        const { data, error } = await sb.rpc('club_requires_code');
        if (error) return false;
        return !!data;
      },
      async isMember() {
        const uid = await currentUser();
        if (!uid) return false;
        const { data } = await sb.from('members').select('user_id').eq('user_id', uid).maybeSingle();
        return !!data;
      },
      async add({ file, title, description, nickname, character, code }) {
        const uid = await ensureUser();
        if (!(await this.isMember())) {
          const { data: ok, error } = await sb.rpc('join_club', { code: code || '' });
          fail(error, '입장 코드를 확인하지 못했어요.');
          if (!ok) {
            const err = new Error('동호회 입장 코드가 맞지 않아요.');
            err.code = 'CLUB_CODE';
            throw err;
          }
        }
        const blob = await shrinkImage(file);
        const path = `${uid}/${uuid()}.jpg`;
        const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '604800' });
        fail(up.error, '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.');
        const { data, error } = await sb
          .from('photos')
          .insert({ path, title, description, nickname, character })
          .select('id')
          .single();
        if (error) {
          await sb.storage.from(BUCKET).remove([path]);
          fail(error, '작품 정보를 저장하지 못했어요.');
        }
        return { id: data.id, title };
      },
      async toggleLike(p) {
        const uid = await ensureUser();
        const q = p.likedByMe
          ? sb.from('likes').delete().eq('photo_id', p.id).eq('user_id', uid)
          : sb.from('likes').insert({ photo_id: p.id });
        const { error } = await q;
        if (error && error.code !== '23505') fail(error, '좋아요를 반영하지 못했어요.');
        p.likes += p.likedByMe ? -1 : 1;
        p.likedByMe = !p.likedByMe;
        return p;
      },
      async remove(p) {
        const { error } = await sb.from('photos').delete().eq('id', p.id);
        fail(error, '작품을 내리지 못했어요.');
        await sb.storage.from(BUCKET).remove([p.path]);
      },
      // 지금 마을에 있는 주민 (Supabase Realtime Presence, 로그인 불필요)
      joinVillage(me, onChange) {
        const myId = uuid();
        let state = { ...me };
        let ready = false;
        const ch = sb.channel('village', { config: { presence: { key: myId } } });
        ch.on('presence', { event: 'sync' }, () => {
          const all = ch.presenceState();
          const list = Object.entries(all).map(([id, metas]) => ({ ...metas[metas.length - 1], id, self: id === myId }));
          onChange(list);
        });
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            ready = true;
            ch.track(state);
          }
        });
        return {
          update(partial) {
            state = { ...state, ...partial };
            if (ready) ch.track(state);
          },
          leave() {
            ch.untrack();
            sb.removeChannel(ch);
          },
        };
      },
    };
  }

  // ---------------- 체험 모드 (이 기기에만 저장) ----------------
  function demoStore() {
    const KEY = 'carrot-photo-village:demo-photos';
    const read = () => {
      try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
      } catch {
        return [];
      }
    };
    const write = (list) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
      } catch {
        throw new Error('체험 모드 저장 공간이 가득 찼어요. 작품 몇 개를 내려 주세요.');
      }
    };
    const toDataUrl = (blob) =>
      new Promise((r) => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(blob);
      });
    return {
      mode: 'demo',
      async list() {
        return read()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((p) => ({ ...p, mine: true }));
      },
      async requiresCode() {
        return false;
      },
      async isMember() {
        return true;
      },
      async add({ file, title, description, nickname, character }) {
        const blob = await shrinkImage(file, 1000, 0.8);
        const photo = {
          id: uuid(),
          url: await toDataUrl(blob),
          title,
          description,
          nickname,
          character,
          createdAt: new Date().toISOString(),
          likes: 0,
          likedByMe: false,
        };
        write([...read(), photo]);
        return photo;
      },
      async toggleLike(p) {
        const list = read();
        const it = list.find((x) => x.id === p.id);
        if (it) {
          it.likes += it.likedByMe ? -1 : 1;
          it.likedByMe = !it.likedByMe;
          write(list);
          Object.assign(p, { likes: it.likes, likedByMe: it.likedByMe });
        }
        return p;
      },
      async remove(p) {
        write(read().filter((x) => x.id !== p.id));
      },
      // 체험 모드: 같은 기기의 다른 창끼리만 서로 보여요.
      joinVillage(me, onChange) {
        const myId = uuid();
        let state = { ...me };
        const peers = new Map();
        const bc = 'BroadcastChannel' in window ? new BroadcastChannel('carrot-photo-village') : null;
        const emit = () =>
          onChange([{ ...state, id: myId, self: true }, ...[...peers.entries()].map(([id, p]) => ({ ...p.state, id }))]);
        const post = (type) => bc?.postMessage({ type, id: myId, state });
        if (bc) {
          bc.onmessage = ({ data }) => {
            if (data.id === myId) return;
            if (data.type === 'leave') peers.delete(data.id);
            else {
              if (!peers.has(data.id) && data.type === 'state') post('state'); // 새로 온 주민에게 나도 알려주기
              peers.set(data.id, { state: data.state, at: Date.now() });
            }
            emit();
          };
        }
        const timer = setInterval(() => {
          post('ping');
          const now = Date.now();
          let changed = false;
          for (const [id, p] of peers) if (now - p.at > 12000) changed = peers.delete(id);
          if (changed) emit();
        }, 4000);
        post('state');
        setTimeout(emit, 0);
        return {
          update(partial) {
            state = { ...state, ...partial };
            post('state');
            emit();
          },
          leave() {
            post('leave');
            clearInterval(timer);
            bc?.close();
          },
        };
      },
    };
  }

  window.photoStore = cfg.SUPABASE_URL && cfg.SUPABASE_KEY && window.supabase ? supabaseStore() : demoStore();
})();
