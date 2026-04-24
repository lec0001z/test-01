const ingForm = document.getElementById('ingredient-form');
const ingName = document.getElementById('ing-name');
const ingCategory = document.getElementById('ing-category');
const ingList = document.getElementById('ingredient-list');

const recForm = document.getElementById('recipe-form');
const recTitle = document.getElementById('rec-title');
const recIngredients = document.getElementById('rec-ingredients');
const recSteps = document.getElementById('rec-steps');
const recList = document.getElementById('recipe-list');

const aiOption = document.getElementById('ai-option');
const aiGenerate = document.getElementById('ai-generate');
const aiPreview = document.getElementById('ai-preview');

const filterSource = document.getElementById('filter-source');
const filterOption = document.getElementById('filter-option');
const filterDifficulty = document.getElementById('filter-difficulty');
const recipeCount = document.getElementById('recipe-count');

const toastEl = document.getElementById('toast');
let toastTimer = null;
let currentAIRecipe = null;
let allRecipes = [];

function toast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle('error', isError);
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2400);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return body;
}

function escape(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderIngredients(items) {
  if (!items || items.length === 0) {
    ingList.innerHTML = '<p class="empty">아직 등록된 재료가 없습니다.</p>';
    return;
  }
  ingList.innerHTML = items
    .map(
      (i) => `
      <span class="tag" data-id="${i.id}">
        ${i.category ? `<span class="cat">${escape(i.category)}</span>` : ''}
        ${escape(i.name)}
        <button class="remove" title="삭제" aria-label="${escape(i.name)} 삭제">×</button>
      </span>`
    )
    .join('');
}

function badges(r) {
  const parts = [];
  if (r.source === 'ai') parts.push('<span class="badge ai">AI</span>');
  if (r.meal_option) parts.push(`<span class="badge option">${escape(r.meal_option)}</span>`);
  if (r.difficulty) parts.push(`<span class="badge difficulty">${escape(r.difficulty)}</span>`);
  if (r.cook_time) parts.push(`<span class="badge time">⏱ ${r.cook_time}분</span>`);
  return parts.length ? `<div class="badges">${parts.join('')}</div>` : '';
}

function applyFilters(items) {
  const src = filterSource.value;
  const opt = filterOption.value;
  const diff = filterDifficulty.value;
  return items.filter((r) => {
    if (src && r.source !== src) return false;
    if (opt && r.meal_option !== opt) return false;
    if (diff && r.difficulty !== diff) return false;
    return true;
  });
}

function updateRecipeCount(shown, total) {
  if (total === 0) {
    recipeCount.textContent = '';
  } else if (shown === total) {
    recipeCount.textContent = `(${total})`;
  } else {
    recipeCount.textContent = `(${shown} / ${total})`;
  }
}

function renderRecipes() {
  const filtered = applyFilters(allRecipes);
  updateRecipeCount(filtered.length, allRecipes.length);

  if (allRecipes.length === 0) {
    recList.innerHTML = '<p class="empty">아직 저장된 레시피가 없습니다.</p>';
    return;
  }
  if (filtered.length === 0) {
    recList.innerHTML = '<p class="empty">필터 조건에 맞는 레시피가 없습니다.</p>';
    return;
  }
  recList.innerHTML = filtered
    .map((r) => {
      const date = new Date(r.created_at).toLocaleString('ko-KR');
      return `
      <article class="recipe" data-id="${r.id}">
        <header>
          <h3>${escape(r.title)}</h3>
          <div>
            <span class="meta">${date}</span>
            <button class="delete" type="button">삭제</button>
          </div>
        </header>
        ${badges(r)}
        <p class="ing"><strong>재료:</strong> ${escape(r.ingredients)}</p>
        <pre>${escape(r.steps)}</pre>
      </article>`;
    })
    .join('');
}

function renderAIPreview(recipe) {
  aiPreview.hidden = false;
  aiPreview.innerHTML = `
    <h3>${escape(recipe.title)}</h3>
    ${badges(recipe)}
    <p><strong>재료:</strong> ${escape(recipe.ingredients)}</p>
    <pre>${escape(recipe.steps)}</pre>
    <div class="actions">
      <button id="ai-save" type="button">이 레시피 저장</button>
      <button class="regenerate" id="ai-regen" type="button">다시 생성</button>
    </div>
  `;
  document.getElementById('ai-save').addEventListener('click', saveAIRecipe);
  document.getElementById('ai-regen').addEventListener('click', () => generateAI());
}

function showPreviewLoading() {
  aiPreview.hidden = false;
  aiPreview.innerHTML = '<p><span class="spinner"></span> AI 가 레시피를 생각 중…</p>';
}

async function loadIngredients() {
  try {
    renderIngredients((await api('/api/ingredients')).data);
  } catch (err) { toast(err.message, true); }
}

async function loadRecipes() {
  try {
    allRecipes = (await api('/api/recipes')).data || [];
    renderRecipes();
  } catch (err) { toast(err.message, true); }
}

async function generateAI() {
  aiGenerate.disabled = true;
  showPreviewLoading();
  try {
    const body = await api('/api/recipes/generate', {
      method: 'POST',
      body: JSON.stringify({ meal_option: aiOption.value }),
    });
    currentAIRecipe = body.data;
    renderAIPreview(currentAIRecipe);
  } catch (err) {
    aiPreview.hidden = true;
    toast(err.message, true);
  } finally {
    aiGenerate.disabled = false;
  }
}

async function saveAIRecipe() {
  if (!currentAIRecipe) return;
  try {
    await api('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(currentAIRecipe),
    });
    toast('AI 레시피를 저장했습니다.');
    aiPreview.hidden = true;
    aiPreview.innerHTML = '';
    currentAIRecipe = null;
    loadRecipes();
  } catch (err) { toast(err.message, true); }
}

ingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = ingName.value.trim();
  if (!name) return;
  try {
    await api('/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({ name, category: ingCategory.value.trim() || null }),
    });
    ingName.value = ''; ingCategory.value = ''; ingName.focus();
    toast('재료를 추가했습니다.');
    loadIngredients();
  } catch (err) { toast(err.message, true); }
});

ingList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.remove');
  if (!btn) return;
  const id = btn.closest('.tag')?.dataset.id;
  if (!id) return;
  try {
    await api(`/api/ingredients/${id}`, { method: 'DELETE' });
    toast('삭제했습니다.');
    loadIngredients();
  } catch (err) { toast(err.message, true); }
});

recForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: recTitle.value.trim(),
    ingredients: recIngredients.value.trim(),
    steps: recSteps.value.trim(),
  };
  if (!payload.title || !payload.ingredients || !payload.steps) return;
  try {
    await api('/api/recipes', { method: 'POST', body: JSON.stringify(payload) });
    recForm.reset(); recTitle.focus();
    toast('레시피를 저장했습니다.');
    loadRecipes();
  } catch (err) { toast(err.message, true); }
});

recList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete');
  if (!btn) return;
  const id = btn.closest('.recipe')?.dataset.id;
  if (!id) return;
  if (!confirm('이 레시피를 삭제할까요?')) return;
  try {
    await api(`/api/recipes/${id}`, { method: 'DELETE' });
    toast('레시피를 삭제했습니다.');
    loadRecipes();
  } catch (err) { toast(err.message, true); }
});

aiGenerate.addEventListener('click', generateAI);

[filterSource, filterOption, filterDifficulty].forEach((el) =>
  el.addEventListener('change', renderRecipes)
);

loadIngredients();
loadRecipes();
