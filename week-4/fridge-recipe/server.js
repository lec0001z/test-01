require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. .env.example 을 참고해 .env 를 만들어 주세요.'
  );
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY 가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const RECIPE_COLUMNS =
  'id, title, ingredients, steps, cook_time, difficulty, meal_option, source, created_at';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function parseId(raw) {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function nonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

// ───────── Ingredients ─────────

app.get('/api/ingredients', async (_req, res) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, category, created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

app.post('/api/ingredients', async (req, res) => {
  const { name, category } = req.body || {};
  if (!nonEmptyString(name)) {
    return res
      .status(400)
      .json({ success: false, message: '재료 이름(name)은 비어 있을 수 없습니다.' });
  }
  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      name: name.trim(),
      category: nonEmptyString(category) ? category.trim() : null,
    })
    .select('id, name, category, created_at')
    .single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

app.delete('/api/ingredients/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ success: false, message: 'Invalid id' });
  const { data, error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'Ingredient not found' });
  res.json({ success: true, data });
});

// ───────── Recipes ─────────

app.get('/api/recipes', async (_req, res) => {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

app.post('/api/recipes', async (req, res) => {
  const { title, ingredients, steps, cook_time, difficulty, meal_option, source } =
    req.body || {};
  if (!nonEmptyString(title))
    return res.status(400).json({ success: false, message: '요리명(title)이 필요합니다.' });
  if (!nonEmptyString(ingredients))
    return res.status(400).json({ success: false, message: '재료(ingredients)가 필요합니다.' });
  if (!nonEmptyString(steps))
    return res.status(400).json({ success: false, message: '조리법(steps)이 필요합니다.' });

  const row = {
    title: title.trim(),
    ingredients: ingredients.trim(),
    steps: steps.trim(),
    cook_time: Number.isFinite(cook_time) ? Math.max(0, Math.round(cook_time)) : null,
    difficulty: nonEmptyString(difficulty) ? difficulty.trim() : null,
    meal_option: nonEmptyString(meal_option) ? meal_option.trim() : null,
    source: source === 'ai' ? 'ai' : 'user',
  };

  const { data, error } = await supabase
    .from('recipes')
    .insert(row)
    .select(RECIPE_COLUMNS)
    .single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

app.delete('/api/recipes/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ success: false, message: 'Invalid id' });
  const { data, error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'Recipe not found' });
  res.json({ success: true, data });
});

// ───────── AI: Generate recipe from fridge ingredients ─────────

const MEAL_OPTIONS = ['제한 없음', '간단 요리', '다이어트', '야식', '든든한 식사'];

const RECIPE_SCHEMA_PROMPT = `당신은 한국인 가정식 요리를 잘 아는 셰프입니다.
사용자의 냉장고 재료 목록과 옵션을 받아, 실제로 만들 수 있는 레시피 하나를 JSON 으로 반환하세요.
반드시 아래 JSON 스키마를 따르세요. 추가 텍스트나 마크다운 없이 JSON 만 출력:

{
  "title": "요리 이름 (한국어)",
  "ingredients": "재료와 분량을 한 줄에 나열 (예: '계란 3개, 대파 1/2대, 소금 약간')",
  "steps": "조리법을 '1. ...\\n2. ...' 형식의 번호 매긴 단계로",
  "cook_time": 15,           // 예상 조리시간(분), 정수
  "difficulty": "쉬움"        // 쉬움 | 보통 | 어려움 중 하나
}

원칙:
- 가능한 한 제공된 재료만 사용. 소금/후추/식용유/간장/물 같은 기본 양념은 자유롭게 사용 가능
- 제공된 재료가 너무 적으면 가장 적합한 가장 현실적인 한 가지 요리를 추천
- 옵션이 "간단 요리"면 15분 이내, "다이어트"면 저칼로리 위주, "야식"이면 자극적이고 간편한 메뉴, "든든한 식사"면 탄단지 균형
- 한국어로 작성`;

app.post('/api/recipes/generate', async (req, res) => {
  const { meal_option } = req.body || {};
  const option = MEAL_OPTIONS.includes(meal_option) ? meal_option : '제한 없음';

  const { data: ingredients, error: ingErr } = await supabase
    .from('ingredients')
    .select('name, category');
  if (ingErr) return res.status(500).json({ success: false, message: ingErr.message });
  if (!ingredients || ingredients.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: '냉장고에 등록된 재료가 없습니다. 먼저 재료를 추가해 주세요.' });
  }

  const ingredientList = ingredients
    .map((i) => (i.category ? `${i.name}(${i.category})` : i.name))
    .join(', ');

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RECIPE_SCHEMA_PROMPT },
        {
          role: 'user',
          content: `냉장고 재료: ${ingredientList}\n옵션: ${option}\n\n위 재료로 만들 레시피 하나를 JSON 으로 반환하세요.`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res
        .status(502)
        .json({ success: false, message: 'AI 응답을 JSON 으로 해석하지 못했습니다.' });
    }

    const recipe = {
      title: nonEmptyString(parsed.title) ? parsed.title.trim() : null,
      ingredients: nonEmptyString(parsed.ingredients) ? parsed.ingredients.trim() : null,
      steps: nonEmptyString(parsed.steps) ? parsed.steps.trim() : null,
      cook_time: Number.isFinite(parsed.cook_time) ? Math.max(0, Math.round(parsed.cook_time)) : null,
      difficulty: nonEmptyString(parsed.difficulty) ? parsed.difficulty.trim() : null,
      meal_option: option,
      source: 'ai',
    };

    if (!recipe.title || !recipe.ingredients || !recipe.steps) {
      return res
        .status(502)
        .json({ success: false, message: 'AI 응답에 필수 필드가 없습니다.' });
    }

    res.json({ success: true, data: recipe, used_ingredients: ingredientList });
  } catch (err) {
    console.error('OpenAI call failed:', err);
    const status = err?.status || err?.response?.status;
    let message;
    if (status === 429) {
      message =
        'OpenAI 계정의 사용 한도를 초과했거나 크레딧이 부족합니다. platform.openai.com/settings/organization/billing 에서 결제 정보를 확인해 주세요.';
    } else if (status === 401) {
      message = 'OpenAI API 키가 올바르지 않습니다. .env 의 OPENAI_API_KEY 를 확인해 주세요.';
    } else if (status === 404) {
      message = `OpenAI 모델(${OPENAI_MODEL})을 찾을 수 없습니다. OPENAI_MODEL 환경변수를 확인해 주세요.`;
    } else {
      message = err?.message || 'AI 호출 중 오류가 발생했습니다.';
    }
    res.status(502).json({ success: false, message });
  }
});

// ───────── Fallthrough ─────────

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
