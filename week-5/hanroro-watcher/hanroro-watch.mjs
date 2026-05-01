// 한로로 공식 유튜브 채널 RSS를 주기적으로 체크해
// 새 영상이 올라왔는지 알려주는 미니 워처.
//
// 의존성 0개 (Node.js 18+ 빌트인 fetch 사용).
// 사용법:
//   node hanroro-watch.mjs            # 한 번 실행 (마지막 본 영상과 비교)
//   node hanroro-watch.mjs --reset    # 마지막 기억 초기화 후 최신 5개 표시
//
// last-seen.json 에 마지막으로 본 영상 ID를 저장하므로,
// cron 또는 윈도우 작업 스케줄러에 등록하면 자동 워처가 됨.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CHANNEL_ID = 'UCrDa_5OU-rhvXqWlPx5hgKQ'; // 한로로 HANRORO 공식 아티스트 채널
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(HERE, 'last-seen.json');

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf-8'));
  } catch {
    return { lastVideoId: null, lastChecked: null };
  }
}

async function writeState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function parseEntries(xml) {
  const entries = [];
  const blockRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = blockRe.exec(xml))) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
      return (block.match(r) || [])[1] || '';
    };
    const id = get('yt:videoId').trim();
    const title = get('title').trim();
    const published = get('published').trim();
    const link = (block.match(/<link[^>]+href="([^"]+)"/) || [])[1] || '';
    if (id) entries.push({ id, title, published, link });
  }
  return entries;
}

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString('ko-KR') : '-';
}

async function main() {
  const reset = process.argv.includes('--reset');

  const res = await fetch(RSS_URL);
  if (!res.ok) {
    console.error(`[ERROR] RSS fetch 실패: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const xml = await res.text();
  const entries = parseEntries(xml);

  if (entries.length === 0) {
    console.error('[ERROR] RSS에 영상이 0개 — 채널 ID 확인 필요');
    process.exit(1);
  }

  const state = reset ? { lastVideoId: null, lastChecked: null } : await readState();

  console.log('');
  console.log(`=== 한로로 채널 RSS 체크 ===`);
  console.log(`현재 시각:        ${new Date().toLocaleString('ko-KR')}`);
  console.log(`마지막 체크 시각: ${fmt(state.lastChecked)}`);
  console.log(`마지막 본 영상:   ${state.lastVideoId || '(없음 — 첫 실행)'}`);
  console.log('');

  if (state.lastVideoId === null) {
    console.log('첫 실행 — 최근 영상 5개를 보여줍니다:\n');
    entries.slice(0, 5).forEach((e, i) => {
      console.log(`${i + 1}. [${e.published.slice(0, 10)}] ${e.title}`);
      console.log(`   ${e.link}`);
    });
  } else {
    const newOnes = [];
    for (const e of entries) {
      if (e.id === state.lastVideoId) break;
      newOnes.push(e);
    }
    if (newOnes.length === 0) {
      console.log('새 영상 없음. 다음 체크 때 다시 봅니다.');
    } else {
      console.log(`🔔 새 영상 ${newOnes.length}개 발견!\n`);
      newOnes.forEach((e, i) => {
        console.log(`${i + 1}. [${e.published.slice(0, 10)}] ${e.title}`);
        console.log(`   ${e.link}`);
      });
    }
  }

  await writeState({
    lastVideoId: entries[0].id,
    lastChecked: new Date().toISOString(),
  });

  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
