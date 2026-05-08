export function formatKRW(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function previewLines(text: string, maxLines = 3): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}
