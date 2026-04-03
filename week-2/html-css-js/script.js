// ===== 1. 타이핑 효과 =====
(function () {
  const text = 'HTML 태그 예시 모음';
  const el = document.getElementById('typing-text');
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text[i];
      i++;
      setTimeout(type, 100);
    }
  }
  type();
})();

// ===== 2. 스크롤 등장 애니메이션 (Intersection Observer) =====
document.querySelectorAll('h2, table, form, blockquote, details, pre, header, nav, main, footer')
  .forEach(function (el) { el.classList.add('fade-in'); });

const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.fade-in').forEach(function (el) {
  observer.observe(el);
});

// ===== 3. 다크모드 토글 =====
const darkBtn = document.getElementById('dark-mode-toggle');
darkBtn.addEventListener('click', function () {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  darkBtn.innerHTML = isDark ? '&#9788;' : '&#9790;';
  showToast(isDark ? '다크모드 ON' : '라이트모드 ON');
});

// ===== 4. 맨 위로 스크롤 버튼 =====
const scrollBtn = document.getElementById('scroll-top-btn');
window.addEventListener('scroll', function () {
  if (window.scrollY > 400) {
    scrollBtn.classList.add('show');
  } else {
    scrollBtn.classList.remove('show');
  }
});
scrollBtn.addEventListener('click', function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== 5. Range 슬라이더 실시간 값 표시 =====
const rangeInput = document.getElementById('range');
const rangeValue = document.getElementById('range-value');
rangeInput.addEventListener('input', function () {
  rangeValue.textContent = rangeInput.value;
});

// ===== 6. Textarea 글자수 카운터 =====
const textarea = document.getElementById('message');
const charCount = document.getElementById('char-count');
textarea.setAttribute('maxlength', '200');
textarea.addEventListener('input', function () {
  const len = textarea.value.length;
  charCount.textContent = len + ' / 200자';
  charCount.style.color = len > 180 ? '#e17055' : '#636e72';
});

// ===== 7. 폼 제출 인터셉트 =====
document.querySelector('form').addEventListener('submit', function (e) {
  e.preventDefault();
  const name = document.getElementById('name').value || '익명';
  showToast(name + '님, 제출이 완료되었습니다!');
});

// ===== 8. 테이블 행 클릭 삭제 =====
document.querySelectorAll('tbody tr').forEach(function (row) {
  row.setAttribute('title', '클릭하면 삭제됩니다');
  row.addEventListener('click', function () {
    row.classList.add('removing');
    setTimeout(function () { row.remove(); }, 300);
    showToast('행이 삭제되었습니다');
  });
});

// ===== 9. 목록 아이템 토글 (체크/해제) =====
document.querySelectorAll('ul li, ol li').forEach(function (li) {
  li.setAttribute('title', '클릭하면 체크됩니다');
  li.addEventListener('click', function () {
    li.classList.toggle('checked');
  });
});

// ===== 10. 색상 선택 시 배경 미리보기 =====
const colorInput = document.getElementById('color');
colorInput.addEventListener('input', function () {
  document.querySelector('form').style.borderLeft = '6px solid ' + colorInput.value;
});

// ===== 토스트 알림 함수 =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function () { toast.classList.remove('show'); }, 2500);
}
