// 0 = empty, 1 = player mark, 2 = revealed cat, 3 = incorrect red mark
export type CellState = 0 | 1 | 2 | 3;
export type RuleViolation = "row" | "column" | "region" | "adjacent";

export const RULE_MESSAGES: Record<RuleViolation, string> = {
  row: "Esta linha já tem um gato.",
  column: "Esta coluna já tem um gato.",
  region: "Esta região colorida já tem um gato.",
  adjacent: "Gatos não podem se tocar, nem pelas diagonais.",
};

export function validatePlacement(
  index: number,
  board: CellState[],
  size: number,
  regions: number[],
): RuleViolation | null {
  const row = Math.floor(index / size);
  const column = index % size;
  const region = regions[index];

  for (let other = 0; other < board.length; other += 1) {
    if (other === index || board[other] !== 2) continue;

    const otherRow = Math.floor(other / size);
    const otherColumn = other % size;

    if (otherRow === row) return "row";
    if (otherColumn === column) return "column";
    if (regions[other] === region) return "region";
    if (Math.abs(otherRow - row) <= 1 && Math.abs(otherColumn - column) <= 1) return "adjacent";
  }

  return null;
}

export function isComplete(board: CellState[], size: number, regions: number[]) {
  const cats = board.flatMap((state, index) => state === 2 ? [index] : []);
  if (cats.length !== size) return false;

  const rows = new Set<number>();
  const columns = new Set<number>();
  const usedRegions = new Set<number>();

  for (const index of cats) {
    const row = Math.floor(index / size);
    const column = index % size;
    if (rows.has(row) || columns.has(column) || usedRegions.has(regions[index])) return false;

    rows.add(row);
    columns.add(column);
    usedRegions.add(regions[index]);
  }

  for (let first = 0; first < cats.length; first += 1) {
    const firstRow = Math.floor(cats[first] / size);
    const firstColumn = cats[first] % size;
    for (let second = first + 1; second < cats.length; second += 1) {
      const secondRow = Math.floor(cats[second] / size);
      const secondColumn = cats[second] % size;
      if (Math.abs(firstRow - secondRow) <= 1 && Math.abs(firstColumn - secondColumn) <= 1) return false;
    }
  }

  return rows.size === size && columns.size === size && usedRegions.size === size;
}

export function getBlockedCells(board: CellState[], size: number, regions: number[]) {
  return new Set(board.flatMap((state, index) => state !== 2 && validatePlacement(index, board, size, regions) ? [index] : []));
}
