// 앱 설치(PWA) 안내 + 오프라인 캐시 등록
(() => {
  'use strict';
  const btn = document.getElementById('install-btn');
  const modal = document.getElementById('install-modal');
  const steps = document.getElementById('install-steps');
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let deferred = null;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  if (standalone) return; // 이미 앱으로 실행 중

  // 안드로이드 크롬 등: 브라우저가 설치 창을 띄워줄 수 있을 때
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    btn.hidden = true;
    deferred = null;
  });

  if (isIOS || isAndroid) btn.hidden = false;

  btn.addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
      return;
    }
    steps.innerHTML = isIOS
      ? `<li><b>Safari</b>로 이 페이지를 열어 주세요. (카카오톡 안에서 열었다면 오른쪽 아래 <b>⋯ → 다른 브라우저로 열기</b>)</li>
         <li>아래쪽(아이패드는 위쪽)의 <b>공유 버튼 <span class="ios-share">⬆︎</span></b>을 눌러요.</li>
         <li>목록에서 <b>홈 화면에 추가</b>를 누르고 <b>추가</b>를 눌러요.</li>
         <li>홈 화면에 생긴 <b>🥕 사진마을</b> 아이콘으로 실행하면 앱처럼 써요!</li>`
      : `<li><b>Chrome</b>이나 <b>삼성 인터넷</b>으로 이 페이지를 열어 주세요. (카카오톡 안이라면 <b>⋮ → 다른 브라우저로 열기</b>)</li>
         <li>오른쪽 위 <b>⋮ 메뉴</b>(삼성 인터넷은 아래쪽 <b>≡</b>)를 눌러요.</li>
         <li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러요.</li>
         <li>홈 화면에 생긴 <b>🥕 사진마을</b> 아이콘으로 실행하면 앱처럼 써요!</li>`;
    modal.showModal();
  });
})();
