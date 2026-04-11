const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// 미들웨어
// ========================================

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ========================================
// 📦 포켓몬 인메모리 데이터
// ========================================

const pokemons = [
  {
    id: 25,
    name: "피카츄",
    nameEn: "Pikachu",
    types: ["전기"],
    description: "뺨의 전기 주머니에서 전기를 방출하여 적을 공격한다.",
    stats: { hp: 35, attack: 55, defense: 40, speed: 90 },
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    typeColors: ["bg-yellow-400 text-yellow-900"],
  },
  {
    id: 6,
    name: "리자몽",
    nameEn: "Charizard",
    types: ["불꽃", "비행"],
    description: "강한 상대를 찾아 하늘을 난다. 입에서 뜨거운 불꽃을 뿜는다.",
    stats: { hp: 78, attack: 84, defense: 78, speed: 100 },
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
    typeColors: ["bg-orange-500 text-white", "bg-sky-400 text-white"],
  },
  {
    id: 150,
    name: "뮤츠",
    nameEn: "Mewtwo",
    types: ["에스퍼"],
    description: "유전자 조작으로 만들어진 포켓몬. 강력한 초능력을 가지고 있다.",
    stats: { hp: 106, attack: 110, defense: 90, speed: 130 },
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png",
    typeColors: ["bg-purple-500 text-white"],
  },
  {
    id: 143,
    name: "잠만보",
    nameEn: "Snorlax",
    types: ["노말"],
    description: "하루에 400kg의 음식을 먹지 않으면 만족하지 못한다. 먹고 나면 바로 잠든다.",
    stats: { hp: 160, attack: 110, defense: 65, speed: 30 },
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png",
    typeColors: ["bg-gray-400 text-gray-900"],
  },
  {
    id: 94,
    name: "팬텀",
    nameEn: "Gengar",
    types: ["고스트", "독"],
    description: "어둠 속에 숨어 있다가 목표물의 그림자에 몰래 다가간다.",
    stats: { hp: 60, attack: 65, defense: 60, speed: 110 },
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png",
    typeColors: ["bg-indigo-700 text-white", "bg-purple-700 text-white"],
  },
];

// ========================================
// 📡 API 엔드포인트
// ========================================

// GET /api/pokemons — 전체 목록 (검색 쿼리 지원)
app.get('/api/pokemons', (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({ success: true, data: pokemons });
    }

    const query = q.trim().toLowerCase();
    const filtered = pokemons.filter(
      (p) =>
        p.name.includes(query) ||
        p.nameEn.toLowerCase().includes(query) ||
        p.types.some((t) => t.includes(query))
    );

    res.json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: '포켓몬 목록 조회 실패' });
  }
});

// GET /api/pokemons/:id — 개별 포켓몬 조회
app.get('/api/pokemons/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pokemon = pokemons.find((p) => p.id === id);

    if (!pokemon) {
      return res.status(404).json({ success: false, message: '포켓몬을 찾을 수 없습니다' });
    }

    res.json({ success: true, data: pokemon });
  } catch (err) {
    res.status(500).json({ success: false, message: '포켓몬 조회 실패' });
  }
});

// ========================================
// SPA 폴백
// ========================================

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========================================
// 서버 시작 (로컬) / Export (Vercel)
// ========================================

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
