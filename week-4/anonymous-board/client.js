// ───────────────────────────────────────────
// 이 브라우저 고유 clientId (공감 1회 제한용)
// ───────────────────────────────────────────
const CLIENT_ID_KEY = 'anon_board_client_id';
function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
         (Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}
const CLIENT_ID = getClientId();

// 이 브라우저에서 이미 공감한 post id 들 (UI 즉시 비활성화용)
const LIKED_KEY = 'anon_board_liked_posts';
function getLikedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function markLiked(postId) {
  const s = getLikedSet();
  s.add(postId);
  localStorage.setItem(LIKED_KEY, JSON.stringify([...s]));
}

// ───────────────────────────────────────────
// 상태
// ───────────────────────────────────────────
let currentSort = 'latest';

// ───────────────────────────────────────────
// DOM
// ───────────────────────────────────────────
const form = document.getElementById('post-form');
const categorySel = document.getElementById('category');
const contentEl = document.getElementById('content');
const charCount = document.getElementById('char-count');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');
const postsEl = document.getElementById('posts');
const emptyEl = document.getElementById('empty');
const sortTabs = document.querySelectorAll('.sort-tab');

contentEl.addEventListener('input', () => {
  charCount.textContent = contentEl.value.length;
});

sortTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    sortTabs.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    loadPosts();
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  const category = categorySel.value;
  const content = contentEl.value.trim();
  if (!content) {
    formError.textContent = '내용을 입력해주세요.';
    return;
  }
  submitBtn.disabled = true;
  try {
    const r = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, content }),
    });
    const body = await r.json();
    if (!body.success) throw new Error(body.message || '작성에 실패했어요.');
    contentEl.value = '';
    charCount.textContent = '0';
    await loadPosts();
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
  }
});

// ───────────────────────────────────────────
// 목록 불러오기
// ───────────────────────────────────────────
async function loadPosts() {
  const r = await fetch(`/api/posts?sort=${currentSort}`);
  const body = await r.json();
  if (!body.success) {
    postsEl.innerHTML = `<p class="error">불러오기 실패: ${body.message}</p>`;
    return;
  }
  renderPosts(body.data);
}

function renderPosts(posts) {
  postsEl.innerHTML = '';
  if (!posts.length) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  const likedSet = getLikedSet();

  for (const p of posts) {
    const card = document.createElement('article');
    card.className = 'post';

    const alreadyLiked = likedSet.has(p.id);

    card.innerHTML = `
      <div class="post-top">
        <span class="badge badge-${p.category}">${p.category}</span>
        <span class="time">${formatTime(p.created_at)}</span>
      </div>
      <p class="content"></p>
      <div class="post-bottom">
        <button class="like-btn ${alreadyLiked ? 'liked' : ''}" data-id="${p.id}" ${alreadyLiked ? 'disabled' : ''}>
          <span class="heart">${alreadyLiked ? '❤️' : '🤍'}</span>
          <span class="likes">${p.likes}</span>
        </button>
      </div>
    `;
    card.querySelector('.content').textContent = p.content;

    card.querySelector('.like-btn').addEventListener('click', (e) => {
      handleLike(p.id, e.currentTarget);
    });

    postsEl.appendChild(card);
  }
}

function formatTime(iso) {
  const d = new Date(iso);
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return '방금 전';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

// ───────────────────────────────────────────
// 공감 누르기
// ───────────────────────────────────────────
async function handleLike(postId, btn) {
  btn.disabled = true;
  try {
    const r = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: CLIENT_ID }),
    });
    const body = await r.json();

    if (r.status === 409) {
      markLiked(postId);
      btn.classList.add('liked');
      btn.querySelector('.heart').textContent = '❤️';
      return;
    }
    if (!body.success) throw new Error(body.message || '공감에 실패했어요.');

    markLiked(postId);
    btn.classList.add('liked');
    btn.querySelector('.heart').textContent = '❤️';
    btn.querySelector('.likes').textContent = body.data.likes;

    if (currentSort === 'likes') {
      await loadPosts(); // 정렬 갱신
    }
  } catch (err) {
    btn.disabled = false;
    alert(err.message);
  }
}

// ───────────────────────────────────────────
// 첫 로드 + 주기적 새로고침 (남의 공감 반영)
// ───────────────────────────────────────────
loadPosts();
setInterval(loadPosts, 5000);
