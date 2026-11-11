// 당근 사진 동호회 온라인 전시회 - 서버
// 사진 업로드/조회/좋아요/삭제를 처리하는 간단한 Express 서버.
// 데이터는 data/photos.json, 이미지는 uploads/ 폴더에 저장됩니다.

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'photos.json');
const MAX_FILE_MB = 10;
const CHARACTERS = ['carrot', 'bunny', 'radish', 'potato', 'squirrel', 'hedgehog'];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- 아주 단순한 JSON 저장소 ----------
function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { photos: [] };
  }
}
let db = loadDb();
let writing = Promise.resolve();
function saveDb() {
  const snapshot = JSON.stringify(db, null, 2);
  writing = writing.then(() =>
    fs.promises
      .writeFile(DB_FILE + '.tmp', snapshot)
      .then(() => fs.promises.rename(DB_FILE + '.tmp', DB_FILE))
  );
  return writing;
}

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

// 클라이언트에 내보낼 때 소유자 키 해시 등 내부 정보는 제외
function publicPhoto(p, ownerKey) {
  return {
    id: p.id,
    url: '/uploads/' + p.file,
    title: p.title,
    description: p.description,
    nickname: p.nickname,
    character: p.character,
    createdAt: p.createdAt,
    likes: p.likedBy.length,
    likedByMe: ownerKey ? p.likedBy.includes(hash(ownerKey)) : false,
    mine: ownerKey ? p.ownerHash === hash(ownerKey) : false,
  };
}

// ---------- 업로드 설정 ----------
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new Error('JPG, PNG, WEBP, GIF 이미지만 올릴 수 있어요.'));
  },
});

// ---------- 앱 ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

const ownerKeyOf = (req) => clean(req.get('X-Owner-Key'), 100) || null;

app.get('/api/photos', (req, res) => {
  const key = ownerKeyOf(req);
  const photos = [...db.photos]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => publicPhoto(p, key));
  res.json({ photos });
});

app.post('/api/photos', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `사진은 ${MAX_FILE_MB}MB 이하만 가능해요.` : err.message;
      return res.status(400).json({ error: msg });
    }
    const key = ownerKeyOf(req);
    const discard = () => req.file && fs.promises.unlink(req.file.path).catch(() => {});
    if (!req.file) return res.status(400).json({ error: '사진 파일을 선택해 주세요.' });
    if (!key) {
      discard();
      return res.status(400).json({ error: '주민 정보가 없어요. 캐릭터를 다시 선택해 주세요.' });
    }
    const title = clean(req.body.title, 40);
    const nickname = clean(req.body.nickname, 16);
    const character = CHARACTERS.includes(req.body.character) ? req.body.character : 'carrot';
    if (!title || !nickname) {
      discard();
      return res.status(400).json({ error: '작품 제목과 닉네임은 꼭 필요해요.' });
    }
    const photo = {
      id: crypto.randomUUID(),
      file: req.file.filename,
      title,
      description: clean(req.body.description, 300),
      nickname,
      character,
      ownerHash: hash(key),
      likedBy: [],
      createdAt: new Date().toISOString(),
    };
    db.photos.push(photo);
    await saveDb();
    res.status(201).json({ photo: publicPhoto(photo, key) });
  });
});

app.post('/api/photos/:id/like', async (req, res) => {
  const key = ownerKeyOf(req);
  const photo = db.photos.find((p) => p.id === req.params.id);
  if (!photo) return res.status(404).json({ error: '작품을 찾을 수 없어요.' });
  if (!key) return res.status(400).json({ error: '주민 정보가 없어요.' });
  const h = hash(key);
  const i = photo.likedBy.indexOf(h);
  if (i >= 0) photo.likedBy.splice(i, 1);
  else photo.likedBy.push(h);
  await saveDb();
  res.json({ photo: publicPhoto(photo, key) });
});

app.delete('/api/photos/:id', async (req, res) => {
  const key = ownerKeyOf(req);
  const idx = db.photos.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '작품을 찾을 수 없어요.' });
  if (!key || db.photos[idx].ownerHash !== hash(key)) {
    return res.status(403).json({ error: '내가 올린 작품만 내릴 수 있어요.' });
  }
  const [removed] = db.photos.splice(idx, 1);
  await saveDb();
  fs.promises.unlink(path.join(UPLOAD_DIR, removed.file)).catch(() => {});
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`🥕 당근 사진 마을 전시회가 열렸어요: http://localhost:${PORT}`);
});
