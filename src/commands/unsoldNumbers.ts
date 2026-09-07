// Tickets that were never sold are entered before the game starts, as a list
// that accepts runs: "3, 7, 20-35". The same text is written back out whenever
// the numbers are picked on the grid instead, so the two stay in step.

export type UnsoldParseResult = { error: string } | { ids: number[] };

// Parses the typed list. Blank means nothing was left unsold.
export const parseUnsoldList = (text: string, total: number): UnsoldParseResult => {
  const trimmed = text.trim();
  if (trimmed === "") return { ids: [] };

  const ids = new Set<number>();
  for (const rawEntry of trimmed.split(",")) {
    // A trailing comma is where the next number is about to go, so a blank
    // entry is skipped rather than reported while the list is still being typed
    const entry = rawEntry.trim();
    if (entry === "") continue;

    const range = entry.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (from < 1 || to > total) return { error: `Out of range (1-${total}): ${entry}` };
      if (from > to) return { error: `Backwards range: ${entry}` };
      for (let n = from; n <= to; n++) ids.add(n);
      continue;
    }

    if (!/^\d+$/.test(entry)) return { error: `Not a number: ${entry}` };
    const n = Number(entry);
    if (n < 1 || n > total) return { error: `Out of range (1-${total}): ${entry}` };
    ids.add(n);
  }

  return { ids: [...ids].sort((a, b) => a - b) };
};

// Renders a set of numbers back as the shortest list that would parse to it,
// so picking 20 through 35 on the grid reads as "20-35" rather than sixteen
// numbers. A run of two is left as a pair, since "20-21" saves nothing.
export const formatUnsoldList = (ids: number[]): string => {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; ) {
    let end = i;
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) end++;
    const runLength = end - i + 1;
    if (runLength >= 3) {
      parts.push(`${sorted[i]}-${sorted[end]}`);
    } else {
      for (let j = i; j <= end; j++) parts.push(String(sorted[j]));
    }
    i = end + 1;
  }

  return parts.join(", ");
};
