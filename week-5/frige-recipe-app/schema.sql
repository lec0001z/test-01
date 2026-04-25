-- =====================================================================
-- 냉장고 레시피 앱 (frige-recipe-app) — PostgreSQL / Supabase 스키마
-- ---------------------------------------------------------------------
-- 사용법:
--   1) Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 RUN
--   2) 또는 psql 로 실행:
--      psql "postgresql://postgres:비밀번호@db.<your-project-ref>.supabase.co:5432/postgres" -f schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 깨끗한 재실행을 위해 기존 객체 정리 (개발용)
-- ---------------------------------------------------------------------
DROP VIEW  IF EXISTS recipe_full        CASCADE;
DROP VIEW  IF EXISTS recipe_match_view  CASCADE;
DROP TABLE IF EXISTS fridge_ingredients CASCADE;
DROP TABLE IF EXISTS recipe_steps       CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes            CASCADE;
DROP TABLE IF EXISTS categories         CASCADE;

-- =====================================================================
-- 1. 테이블 정의
-- =====================================================================

-- 1-1. 재료 카테고리 (마스터)
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,                         -- 'vegetable', 'meat', ...
  label       TEXT        NOT NULL,                     -- '🥬 채소'
  color_class TEXT        NOT NULL,                     -- Tailwind 색상 클래스
  sort_order  INT         NOT NULL DEFAULT 0
);

-- 1-2. 레시피
CREATE TABLE recipes (
  id          TEXT PRIMARY KEY,                         -- 'kimchi-fried-rice'
  name        TEXT        NOT NULL,
  emoji       TEXT        NOT NULL DEFAULT '🍽️',
  cook_time   INT         NOT NULL CHECK (cook_time > 0),       -- 분
  difficulty  TEXT        NOT NULL CHECK (difficulty IN ('쉬움','보통','어려움')),
  tip         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1-3. 레시피별 재료 (1:N)
CREATE TABLE recipe_ingredients (
  recipe_id   TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient  TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (recipe_id, ingredient)
);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient);

-- 1-4. 레시피 조리 단계 (1:N, 순서 보장)
CREATE TABLE recipe_steps (
  recipe_id    TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_no      INT  NOT NULL CHECK (step_no > 0),
  instruction  TEXT NOT NULL,
  PRIMARY KEY (recipe_id, step_no)
);

-- 1-5. 냉장고 재료 (사용자 보유 재료)
--   * 지금은 단일 사용자 가정. 멀티유저로 확장 시 user_id UUID REFERENCES auth.users 추가.
CREATE TABLE fridge_ingredients (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  category_id  TEXT        NOT NULL REFERENCES categories(id),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_fridge_unique_name ON fridge_ingredients (LOWER(name));
CREATE INDEX        idx_fridge_category    ON fridge_ingredients (category_id);

-- =====================================================================
-- 2. 편의용 뷰
-- =====================================================================

-- 2-1. 레시피 + 재료/단계 배열로 합쳐서 한 번에 조회
CREATE VIEW recipe_full AS
SELECT
  r.id,
  r.name,
  r.emoji,
  r.cook_time,
  r.difficulty,
  r.tip,
  r.created_at,
  COALESCE((
    SELECT array_agg(ri.ingredient ORDER BY ri.sort_order, ri.ingredient)
    FROM recipe_ingredients ri WHERE ri.recipe_id = r.id
  ), ARRAY[]::TEXT[]) AS ingredients,
  COALESCE((
    SELECT array_agg(rs.instruction ORDER BY rs.step_no)
    FROM recipe_steps rs WHERE rs.recipe_id = r.id
  ), ARRAY[]::TEXT[]) AS steps
FROM recipes r;

-- 2-2. 현재 냉장고 재료 기준 매칭률 뷰
--   * matched / total / missing / percent 까지 한 방에
CREATE VIEW recipe_match_view AS
WITH have AS (
  SELECT LOWER(TRIM(name)) AS h FROM fridge_ingredients
)
SELECT
  r.id,
  r.name,
  r.emoji,
  r.cook_time,
  r.difficulty,
  COUNT(*)                                           AS total,
  COUNT(*) FILTER (WHERE m.is_have)                  AS matched,
  COUNT(*) FILTER (WHERE NOT m.is_have)              AS missing_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE m.is_have) / NULLIF(COUNT(*),0))::INT AS percent,
  ARRAY_AGG(ri.ingredient ORDER BY ri.sort_order)
    FILTER (WHERE NOT m.is_have)                     AS missing_ingredients
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN LATERAL (
  SELECT EXISTS (
    SELECT 1 FROM have
    WHERE have.h = LOWER(ri.ingredient)
       OR have.h LIKE '%' || LOWER(ri.ingredient) || '%'
       OR LOWER(ri.ingredient) LIKE '%' || have.h || '%'
  ) AS is_have
) m ON TRUE
GROUP BY r.id, r.name, r.emoji, r.cook_time, r.difficulty
ORDER BY percent DESC NULLS LAST, missing_count ASC, r.name ASC;

-- =====================================================================
-- 3. 데모 데이터 — 카테고리
-- =====================================================================
INSERT INTO categories (id, label, color_class, sort_order) VALUES
  ('vegetable', '🥬 채소',    'bg-green-100 text-green-800',   1),
  ('meat',      '🥩 육류',    'bg-red-100 text-red-800',       2),
  ('seafood',   '🐟 해산물',  'bg-blue-100 text-blue-800',     3),
  ('dairy',     '🥛 유제품',  'bg-yellow-100 text-yellow-800', 4),
  ('grain',     '🌾 곡물/면', 'bg-amber-100 text-amber-800',   5),
  ('sauce',     '🧂 양념',    'bg-purple-100 text-purple-800', 6),
  ('etc',       '🍳 기타',    'bg-gray-100 text-gray-800',     7);

-- =====================================================================
-- 4. 데모 데이터 — 레시피 (15개)
-- =====================================================================
INSERT INTO recipes (id, name, emoji, cook_time, difficulty, tip) VALUES
  ('kimchi-fried-rice', '김치볶음밥',  '🍚', 15, '쉬움', '버터 한 조각을 넣으면 풍미가 살아나요.'),
  ('tomato-pasta',      '토마토 파스타','🍝', 20, '쉬움', '면수를 한 국자 넣으면 소스가 면에 잘 묻어요.'),
  ('egg-roll',          '계란말이',    '🥚', 10, '쉬움', '약불에서 천천히 말아야 모양이 예뻐요.'),
  ('kimchi-stew',       '김치찌개',    '🍲', 30, '보통', '신김치일수록 맛이 깊어져요.'),
  ('bibimbap',          '비빔밥',      '🥗', 25, '보통', '돌솥이 있으면 누룽지까지 즐겨보세요.'),
  ('omurice',           '오므라이스',  '🍳', 20, '보통', '계란이 살짝 덜 익었을 때 덮어야 부드러워요.'),
  ('salad',             '간단 샐러드', '🥗',  5, '쉬움', '치즈나 견과류를 토핑하면 든든해져요.'),
  ('ramen-upgrade',     '계란 라면',   '🍜',  8, '쉬움', '치즈 한 장 추가하면 부드러운 라면이 돼요.'),
  ('fried-tofu',        '두부 부침',   '🟨', 10, '쉬움', '겉면에 밀가루를 살짝 묻히면 더 바삭해요.'),
  ('cabbage-stir',      '양배추 볶음', '🥬', 10, '쉬움', '굴소스 한 스푼이면 풍미가 폭발해요.'),
  ('shrimp-garlic',     '갈릭 새우',   '🦐', 15, '보통', '바게트와 함께 먹으면 환상의 짝꿍.'),
  ('cream-pasta',       '크림 파스타', '🍝', 20, '보통', '치즈를 추가하면 카르보나라 느낌이 나요.'),
  ('doenjang-stew',     '된장찌개',    '🥘', 25, '보통', '멸치 육수로 끓이면 깊은 맛이 나요.'),
  ('tteokbokki',        '떡볶이',      '🍢', 20, '쉬움', '어묵 국물을 함께 사용하면 감칠맛이 살아요.'),
  ('budae-stew',        '부대찌개',    '🍲', 30, '보통', '라면 사리는 마지막 5분 전에 넣으세요.');

-- =====================================================================
-- 5. 데모 데이터 — 레시피 재료
-- =====================================================================
INSERT INTO recipe_ingredients (recipe_id, ingredient, sort_order) VALUES
  -- 김치볶음밥
  ('kimchi-fried-rice','김치',1),('kimchi-fried-rice','밥',2),('kimchi-fried-rice','계란',3),
  ('kimchi-fried-rice','파',4),('kimchi-fried-rice','간장',5),('kimchi-fried-rice','참기름',6),
  -- 토마토 파스타
  ('tomato-pasta','파스타',1),('tomato-pasta','토마토',2),('tomato-pasta','마늘',3),
  ('tomato-pasta','양파',4),('tomato-pasta','올리브유',5),('tomato-pasta','소금',6),
  -- 계란말이
  ('egg-roll','계란',1),('egg-roll','파',2),('egg-roll','소금',3),('egg-roll','식용유',4),
  -- 김치찌개
  ('kimchi-stew','김치',1),('kimchi-stew','돼지고기',2),('kimchi-stew','두부',3),
  ('kimchi-stew','파',4),('kimchi-stew','마늘',5),('kimchi-stew','고춧가루',6),
  -- 비빔밥
  ('bibimbap','밥',1),('bibimbap','계란',2),('bibimbap','시금치',3),
  ('bibimbap','당근',4),('bibimbap','고추장',5),('bibimbap','참기름',6),
  -- 오므라이스
  ('omurice','밥',1),('omurice','계란',2),('omurice','양파',3),
  ('omurice','당근',4),('omurice','케첩',5),('omurice','소금',6),
  -- 간단 샐러드
  ('salad','양상추',1),('salad','토마토',2),('salad','오이',3),
  ('salad','올리브유',4),('salad','소금',5),
  -- 계란 라면
  ('ramen-upgrade','라면',1),('ramen-upgrade','계란',2),('ramen-upgrade','파',3),
  -- 두부 부침
  ('fried-tofu','두부',1),('fried-tofu','식용유',2),('fried-tofu','간장',3),
  ('fried-tofu','파',4),('fried-tofu','마늘',5),
  -- 양배추 볶음
  ('cabbage-stir','양배추',1),('cabbage-stir','마늘',2),('cabbage-stir','간장',3),
  ('cabbage-stir','식용유',4),('cabbage-stir','소금',5),
  -- 갈릭 새우
  ('shrimp-garlic','새우',1),('shrimp-garlic','마늘',2),('shrimp-garlic','버터',3),
  ('shrimp-garlic','올리브유',4),('shrimp-garlic','소금',5),('shrimp-garlic','후추',6),
  -- 크림 파스타
  ('cream-pasta','파스타',1),('cream-pasta','우유',2),('cream-pasta','버터',3),
  ('cream-pasta','마늘',4),('cream-pasta','소금',5),('cream-pasta','후추',6),
  -- 된장찌개
  ('doenjang-stew','된장',1),('doenjang-stew','두부',2),('doenjang-stew','애호박',3),
  ('doenjang-stew','감자',4),('doenjang-stew','양파',5),('doenjang-stew','파',6),('doenjang-stew','마늘',7),
  -- 떡볶이
  ('tteokbokki','떡',1),('tteokbokki','어묵',2),('tteokbokki','고추장',3),
  ('tteokbokki','설탕',4),('tteokbokki','파',5),('tteokbokki','간장',6),
  -- 부대찌개
  ('budae-stew','김치',1),('budae-stew','소시지',2),('budae-stew','햄',3),
  ('budae-stew','두부',4),('budae-stew','라면',5),('budae-stew','파',6),('budae-stew','고춧가루',7);

-- =====================================================================
-- 6. 데모 데이터 — 레시피 조리 단계
-- =====================================================================
INSERT INTO recipe_steps (recipe_id, step_no, instruction) VALUES
  ('kimchi-fried-rice',1,'김치를 잘게 썰고 파를 송송 썬다.'),
  ('kimchi-fried-rice',2,'팬에 기름을 두르고 김치를 볶는다.'),
  ('kimchi-fried-rice',3,'밥을 넣고 간장으로 간을 한 뒤 함께 볶는다.'),
  ('kimchi-fried-rice',4,'계란 후라이를 올리고 파, 참기름을 뿌려 마무리.'),

  ('tomato-pasta',1,'파스타를 끓는 소금물에 8분간 삶는다.'),
  ('tomato-pasta',2,'팬에 올리브유, 다진 마늘, 양파를 볶는다.'),
  ('tomato-pasta',3,'토마토를 넣고 으깨면서 5분간 졸인다.'),
  ('tomato-pasta',4,'삶은 면을 넣고 소스와 잘 버무린다.'),

  ('egg-roll',1,'계란 3개를 풀고 송송 썬 파, 소금을 섞는다.'),
  ('egg-roll',2,'약불 팬에 기름을 두르고 계란물을 절반 붓는다.'),
  ('egg-roll',3,'익으면 한쪽으로 말고 남은 계란물을 부어 다시 만다.'),
  ('egg-roll',4,'한 김 식힌 뒤 먹기 좋은 크기로 썬다.'),

  ('kimchi-stew',1,'돼지고기를 썰어 냄비에 볶는다.'),
  ('kimchi-stew',2,'김치와 김치국물을 넣고 함께 볶는다.'),
  ('kimchi-stew',3,'물을 붓고 고춧가루, 다진 마늘을 넣어 끓인다.'),
  ('kimchi-stew',4,'두부와 파를 넣고 5분 더 끓이면 완성.'),

  ('bibimbap',1,'시금치를 데쳐 참기름과 소금에 무친다.'),
  ('bibimbap',2,'당근은 채 썰어 살짝 볶는다.'),
  ('bibimbap',3,'밥 위에 나물과 계란 후라이를 올린다.'),
  ('bibimbap',4,'고추장과 참기름을 넣고 비벼 먹는다.'),

  ('omurice',1,'양파, 당근을 잘게 썰어 팬에 볶는다.'),
  ('omurice',2,'밥과 케첩을 넣고 볶아 케첩라이스를 만든다.'),
  ('omurice',3,'계란 3개를 풀어 얇게 부친다.'),
  ('omurice',4,'케첩라이스 위에 계란을 덮고 케첩으로 마무리.'),

  ('salad',1,'양상추는 한 입 크기로 뜯는다.'),
  ('salad',2,'토마토와 오이를 먹기 좋게 썬다.'),
  ('salad',3,'그릇에 담고 올리브유, 소금을 뿌린다.'),
  ('salad',4,'레몬즙을 살짝 더하면 더 상큼하다.'),

  ('ramen-upgrade',1,'물 550ml를 끓이고 스프와 면을 넣는다.'),
  ('ramen-upgrade',2,'4분 후 계란을 톡 깨서 넣는다.'),
  ('ramen-upgrade',3,'파를 송송 썰어 올린다.'),
  ('ramen-upgrade',4,'뚜껑을 1분 덮어두면 더 진하게.'),

  ('fried-tofu',1,'두부를 1cm 두께로 썰어 키친타월로 물기를 뺀다.'),
  ('fried-tofu',2,'팬에 기름을 두르고 두부를 노릇하게 굽는다.'),
  ('fried-tofu',3,'간장, 다진 마늘, 파로 양념장을 만든다.'),
  ('fried-tofu',4,'구운 두부 위에 양념장을 올린다.'),

  ('cabbage-stir',1,'양배추를 한 입 크기로 썬다.'),
  ('cabbage-stir',2,'팬에 기름과 다진 마늘을 볶는다.'),
  ('cabbage-stir',3,'양배추를 넣고 센 불에 볶는다.'),
  ('cabbage-stir',4,'간장, 소금으로 간을 맞춘다.'),

  ('shrimp-garlic',1,'새우의 등을 따 내장을 제거한다.'),
  ('shrimp-garlic',2,'팬에 올리브유와 다진 마늘을 약불에 볶는다.'),
  ('shrimp-garlic',3,'새우를 넣고 노릇해질 때까지 굽는다.'),
  ('shrimp-garlic',4,'버터, 소금, 후추로 마무리.'),

  ('cream-pasta',1,'파스타를 끓는 소금물에 7분 삶는다.'),
  ('cream-pasta',2,'팬에 버터와 다진 마늘을 볶는다.'),
  ('cream-pasta',3,'우유를 붓고 약불에서 졸인다.'),
  ('cream-pasta',4,'면을 넣고 소금, 후추로 간한다.'),

  ('doenjang-stew',1,'멸치로 육수를 우려낸다.'),
  ('doenjang-stew',2,'육수에 된장을 풀고 감자, 양파를 넣어 끓인다.'),
  ('doenjang-stew',3,'애호박과 두부를 넣고 5분 더 끓인다.'),
  ('doenjang-stew',4,'다진 마늘, 파를 넣고 마무리한다.'),

  ('tteokbokki',1,'떡은 미지근한 물에 5분 불린다.'),
  ('tteokbokki',2,'냄비에 물 2컵, 고추장, 설탕, 간장을 풀어 끓인다.'),
  ('tteokbokki',3,'떡과 어묵을 넣고 8분간 졸인다.'),
  ('tteokbokki',4,'파를 송송 썰어 올려 마무리.'),

  ('budae-stew',1,'소시지, 햄을 먹기 좋게 썬다.'),
  ('budae-stew',2,'냄비에 김치, 햄, 소시지, 두부를 둘러 담는다.'),
  ('budae-stew',3,'육수와 고춧가루를 넣고 끓인다.'),
  ('budae-stew',4,'마지막에 라면 사리와 파를 넣어 5분 더 끓인다.');

-- =====================================================================
-- 7. 데모 데이터 — 냉장고 (사용자 보유 재료)
-- =====================================================================
INSERT INTO fridge_ingredients (name, category_id) VALUES
  -- 채소
  ('김치',     'vegetable'),
  ('파',       'vegetable'),
  ('양파',     'vegetable'),
  ('마늘',     'vegetable'),
  ('당근',     'vegetable'),
  ('애호박',   'vegetable'),
  ('양상추',   'vegetable'),
  ('토마토',   'vegetable'),
  -- 유제품
  ('우유',     'dairy'),
  ('버터',     'dairy'),
  -- 곡물/면
  ('밥',       'grain'),
  ('파스타',   'grain'),
  ('라면',     'grain'),
  -- 양념
  ('간장',     'sauce'),
  ('참기름',   'sauce'),
  ('고추장',   'sauce'),
  ('된장',     'sauce'),
  ('올리브유', 'sauce'),
  ('소금',     'sauce'),
  ('후추',     'sauce'),
  -- 기타
  ('계란',     'etc'),
  ('두부',     'etc');

-- =====================================================================
-- 8. 동작 확인 쿼리 (실행 후 확인용)
-- =====================================================================
-- (1) 카테고리/레시피/재료/단계 갯수
-- SELECT 'categories'  AS t, COUNT(*) FROM categories
-- UNION ALL SELECT 'recipes',            COUNT(*) FROM recipes
-- UNION ALL SELECT 'recipe_ingredients', COUNT(*) FROM recipe_ingredients
-- UNION ALL SELECT 'recipe_steps',       COUNT(*) FROM recipe_steps
-- UNION ALL SELECT 'fridge_ingredients', COUNT(*) FROM fridge_ingredients;

-- (2) 현재 냉장고로 만들 수 있는 레시피 매칭률 보기
-- SELECT * FROM recipe_match_view;

-- (3) 한 레시피의 전체 정보 (재료/단계 배열로)
-- SELECT * FROM recipe_full WHERE id = 'kimchi-fried-rice';

-- =====================================================================
-- 9. (선택) Supabase Row Level Security
-- ---------------------------------------------------------------------
-- 데모 단계에서는 RLS 비활성. 운영 시 아래처럼 켜고 정책을 추가하세요.
-- ALTER TABLE fridge_ingredients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anon read"  ON fridge_ingredients FOR SELECT USING (true);
-- CREATE POLICY "anon write" ON fridge_ingredients FOR INSERT WITH CHECK (true);
-- CREATE POLICY "anon del"   ON fridge_ingredients FOR DELETE USING (true);
-- =====================================================================
