// 마을 주민 캐릭터 (오리지널 SVG 일러스트)
// 공식 캐릭터 이미지를 쓸 권한이 있다면 각 캐릭터의 `image`에 경로를 넣으세요.
// 예: image: '/characters/official-1.png'  → SVG 대신 그 이미지가 쓰입니다.

const face = (y = 62, blush = '#ff9e9e') => `
  <ellipse cx="38" cy="${y}" rx="4.2" ry="5" fill="#3b2a20"/>
  <ellipse cx="62" cy="${y}" rx="4.2" ry="5" fill="#3b2a20"/>
  <circle cx="39.5" cy="${y - 2}" r="1.5" fill="#fff"/>
  <circle cx="63.5" cy="${y - 2}" r="1.5" fill="#fff"/>
  <ellipse cx="29" cy="${y + 8}" rx="6" ry="3.5" fill="${blush}" opacity=".7"/>
  <ellipse cx="71" cy="${y + 8}" rx="6" ry="3.5" fill="${blush}" opacity=".7"/>
  <path d="M45 ${y + 8} Q50 ${y + 13} 55 ${y + 8}" stroke="#3b2a20" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;

const feet = (c) => `
  <ellipse cx="38" cy="113" rx="9" ry="5" fill="${c}"/>
  <ellipse cx="62" cy="113" rx="9" ry="5" fill="${c}"/>`;

const CHARACTERS = [
  {
    id: 'carrot',
    name: '당근이',
    intro: '사진 동호회 회장! 노을 사진을 제일 좋아해요.',
    color: '#ff8a3d',
    svg: `
      ${feet('#d9601c')}
      <path d="M50 112 C22 112 14 80 18 58 C22 36 36 26 50 26 C64 26 78 36 82 58 C86 80 78 112 50 112Z" fill="#ff8a3d"/>
      <path d="M28 88 h10 M64 96 h9 M30 100 h7" stroke="#e8701f" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 28 C44 14 36 8 30 6 C36 14 40 22 46 30Z" fill="#4cb35a"/>
      <path d="M50 28 C50 12 54 4 58 0 C58 10 56 20 54 30Z" fill="#5fc96d"/>
      <path d="M52 30 C60 16 70 12 76 12 C70 18 64 26 56 32Z" fill="#4cb35a"/>
      ${face(60)}`,
  },
  {
    id: 'bunny',
    name: '토순이',
    intro: '꽃과 들판을 찍으러 매일 산책해요.',
    color: '#fff3ea',
    svg: `
      ${feet('#f0ddd0')}
      <ellipse cx="36" cy="22" rx="8" ry="22" fill="#fff8f2" transform="rotate(-10 36 22)"/>
      <ellipse cx="36" cy="24" rx="4" ry="15" fill="#ffc4c4" transform="rotate(-10 36 24)"/>
      <ellipse cx="64" cy="22" rx="8" ry="22" fill="#fff8f2" transform="rotate(10 64 22)"/>
      <ellipse cx="64" cy="24" rx="4" ry="15" fill="#ffc4c4" transform="rotate(10 64 24)"/>
      <ellipse cx="50" cy="98" rx="24" ry="16" fill="#fff8f2"/>
      <circle cx="50" cy="64" r="32" fill="#fff8f2"/>
      <path d="M44 100 l6 -10 l6 10 Z" fill="#ff8a3d"/>
      <path d="M48 90 l2 -6 l2 6" stroke="#4cb35a" stroke-width="2.5" fill="none"/>
      ${face(62)}`,
  },
  {
    id: 'radish',
    name: '무무',
    intro: '흑백 사진을 사랑하는 조용한 감성파.',
    color: '#f4f7ee',
    svg: `
      ${feet('#d8dccf')}
      <path d="M50 116 C30 112 18 92 20 66 C22 44 34 32 50 32 C66 32 78 44 80 66 C82 92 70 112 50 116Z" fill="#f7faf2"/>
      <path d="M24 52 C30 38 40 32 50 32 C60 32 70 38 76 52 C66 46 34 46 24 52Z" fill="#cfe9a8"/>
      <path d="M50 34 C42 22 34 18 26 18 C32 24 38 30 46 36Z" fill="#6cc070"/>
      <path d="M50 34 C52 18 58 10 64 8 C62 18 58 28 54 36Z" fill="#5ab060"/>
      ${face(68)}`,
  },
  {
    id: 'potato',
    name: '감자도리',
    intro: '맛집 사진 담당. 음식 사진은 저한테 맡겨요!',
    color: '#d9a86c',
    svg: `
      ${feet('#b3814a')}
      <path d="M50 114 C24 114 14 94 16 70 C18 44 30 28 52 28 C74 28 86 46 84 72 C82 96 74 114 50 114Z" fill="#d9a86c"/>
      <circle cx="30" cy="46" r="2.5" fill="#b3814a"/>
      <circle cx="72" cy="90" r="2.5" fill="#b3814a"/>
      <circle cx="26" cy="92" r="2" fill="#b3814a"/>
      <circle cx="68" cy="40" r="2" fill="#b3814a"/>
      ${face(64)}`,
  },
  {
    id: 'squirrel',
    name: '다람이',
    intro: '숲속 동네 구석구석을 담는 골목 탐험가.',
    color: '#e0894a',
    svg: `
      <path d="M78 104 C100 96 104 60 86 46 C78 40 70 48 76 58 C84 72 80 88 70 98Z" fill="#c96f32"/>
      <path d="M80 92 C92 84 94 66 86 56" stroke="#f3c9a1" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${feet('#b85f28')}
      <ellipse cx="48" cy="98" rx="22" ry="15" fill="#e0894a"/>
      <ellipse cx="48" cy="100" rx="12" ry="10" fill="#f8dcc0"/>
      <path d="M24 40 L22 22 L36 32Z" fill="#e0894a"/>
      <path d="M72 40 L74 22 L60 32Z" fill="#e0894a"/>
      <circle cx="48" cy="62" r="30" fill="#e0894a"/>
      <ellipse cx="48" cy="72" rx="18" ry="13" fill="#f8dcc0"/>
      <g transform="translate(-2 0)">${face(60)}</g>`,
  },
  {
    id: 'hedgehog',
    name: '밤톨이',
    intro: '밤하늘과 별 사진을 찍는 야행성 주민.',
    color: '#8a6a52',
    svg: `
      ${feet('#6b4f3a')}
      <path d="M50 22 L58 30 L68 24 L72 36 L84 36 L82 48 L92 56 L84 66 L90 78 L78 82 L78 96 L64 94 L58 106 L50 98 L42 106 L36 94 L22 96 L22 82 L10 78 L16 66 L8 56 L18 48 L16 36 L28 36 L32 24 L42 30Z" fill="#8a6a52"/>
      <circle cx="50" cy="68" r="27" fill="#f3dcc2"/>
      <ellipse cx="50" cy="104" rx="20" ry="9" fill="#f3dcc2"/>
      <circle cx="50" cy="74" r="3" fill="#3b2a20"/>
      ${face(64)}`,
  },
];

const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

function characterMarkup(id, cls = '') {
  const c = CHAR_BY_ID[id] || CHARACTERS[0];
  if (c.image) return `<img class="char-art ${cls}" src="${c.image}" alt="${c.name}">`;
  return `<svg class="char-art ${cls}" viewBox="0 0 100 120" role="img" aria-label="${c.name}">${c.svg}</svg>`;
}
