import { validatePlacement, type CellState } from "./game-rules";

type BasePuzzle = {
  size: number;
  solution: number[];
  regions: number[];
};

export type Puzzle = BasePuzzle;

export type LogicalStep = {
  index: number;
  reason: "row" | "column" | "region";
  group: number;
};

const BASE_PUZZLES: Record<number, BasePuzzle[]> = {
  6: [
    {
      size: 6,
      solution: [3, 0, 2, 4, 1, 5],
      regions: [
        0, 0, 0, 0, 0, 0,
        1, 0, 0, 0, 0, 0,
        1, 1, 2, 0, 0, 0,
        4, 4, 4, 3, 3, 5,
        4, 4, 4, 5, 5, 5,
        4, 4, 4, 4, 5, 5,
      ],
    },
    {
      size: 6,
      solution: [5, 3, 0, 2, 4, 1],
      regions: [
        2, 2, 0, 0, 0, 0,
        2, 2, 2, 1, 0, 4,
        2, 2, 2, 3, 4, 4,
        2, 2, 3, 3, 4, 4,
        2, 3, 3, 3, 4, 4,
        2, 5, 4, 4, 4, 4,
      ],
    },
  ],
  7: [
    {
      size: 7,
      solution: [5, 1, 6, 4, 2, 0, 3],
      regions: [
        1, 1, 1, 1, 1, 0, 0,
        1, 1, 1, 1, 0, 0, 0,
        1, 1, 1, 3, 3, 3, 2,
        1, 4, 4, 4, 3, 3, 3,
        5, 5, 4, 4, 4, 4, 3,
        5, 5, 6, 6, 6, 6, 6,
        5, 6, 6, 6, 6, 6, 6,
      ],
    },
    {
      size: 7,
      solution: [0, 3, 1, 4, 6, 2, 5],
      regions: [
        0, 1, 1, 1, 1, 1, 1,
        2, 2, 1, 1, 1, 1, 1,
        2, 2, 5, 1, 1, 3, 3,
        2, 5, 5, 1, 3, 3, 3,
        5, 5, 5, 5, 3, 3, 4,
        5, 5, 5, 6, 3, 3, 3,
        5, 5, 6, 6, 6, 6, 6,
      ],
    },
  ],
  8: [
    {
      size: 8,
      solution: [3, 0, 2, 4, 7, 5, 1, 6],
      regions: [
        0, 0, 0, 0, 0, 0, 3, 3,
        1, 1, 0, 0, 0, 3, 3, 3,
        6, 6, 2, 0, 3, 3, 3, 3,
        6, 6, 6, 3, 3, 3, 3, 3,
        6, 6, 6, 3, 3, 3, 3, 4,
        6, 6, 6, 3, 6, 5, 5, 7,
        6, 6, 6, 6, 6, 7, 7, 7,
        6, 6, 6, 6, 7, 7, 7, 7,
      ],
    },
    {
      size: 8,
      solution: [0, 2, 7, 3, 5, 1, 4, 6],
      regions: [
        0, 1, 1, 3, 3, 2, 2, 2,
        1, 1, 1, 3, 3, 2, 2, 2,
        1, 3, 3, 3, 3, 4, 4, 2,
        3, 3, 3, 3, 4, 4, 4, 4,
        5, 3, 3, 6, 4, 4, 4, 7,
        5, 5, 5, 6, 6, 4, 4, 7,
        5, 6, 6, 6, 6, 7, 7, 7,
        6, 6, 6, 6, 7, 7, 7, 7,
      ],
    },
  ],
};

function transformCoordinate(row: number, column: number, size: number, transform: number) {
  switch (transform % 6) {
    case 1: return [column, size - 1 - row] as const;
    case 2: return [size - 1 - row, size - 1 - column] as const;
    case 3: return [size - 1 - column, row] as const;
    case 4: return [row, size - 1 - column] as const;
    case 5: return [column, row] as const;
    default: return [row, column] as const;
  }
}

export function getPuzzle(size: number, level: number): Puzzle {
  const choices = BASE_PUZZLES[size];
  if (!choices) throw new Error(`Unsupported puzzle size: ${size}`);

  const zeroBasedLevel = Math.max(0, level - 1);
  const base = choices[zeroBasedLevel % choices.length];
  const transform = Math.floor(zeroBasedLevel / choices.length) % 6;
  const regions = Array(size * size).fill(0);
  const solution = Array(size).fill(0);

  base.regions.forEach((region, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    const [nextRow, nextColumn] = transformCoordinate(row, column, size, transform);
    regions[nextRow * size + nextColumn] = region;
  });

  base.solution.forEach((column, row) => {
    const [nextRow, nextColumn] = transformCoordinate(row, column, size, transform);
    solution[nextRow] = nextColumn;
  });

  return { size, solution, regions };
}

function groupHasCat(board: CellState[], size: number, regions: number[], reason: LogicalStep["reason"], group: number) {
  return board.some((state, index) => state === 2 && (
    reason === "row" ? Math.floor(index / size) === group
      : reason === "column" ? index % size === group
        : regions[index] === group
  ));
}

export function findLogicalStep(board: CellState[], size: number, regions: number[]): LogicalStep | null {
  const candidates = board.flatMap((state, index) => state === 0 && !validatePlacement(index, board, size, regions) ? [index] : []);

  for (const reason of ["region", "row", "column"] as const) {
    for (let group = 0; group < size; group += 1) {
      if (groupHasCat(board, size, regions, reason, group)) continue;
      const groupCandidates = candidates.filter((index) => (
        reason === "row" ? Math.floor(index / size) === group
          : reason === "column" ? index % size === group
            : regions[index] === group
      ));
      if (groupCandidates.length === 1) return { index: groupCandidates[0], reason, group };
    }
  }

  return null;
}

export function solveByLogic(puzzle: Puzzle) {
  const board = Array<CellState>(puzzle.size * puzzle.size).fill(0);
  const steps: LogicalStep[] = [];

  while (board.filter((state) => state === 2).length < puzzle.size) {
    const step = findLogicalStep(board, puzzle.size, puzzle.regions);
    if (!step) return null;
    board[step.index] = 2;
    steps.push(step);
  }

  return steps;
}

export function countSolutions(puzzle: Puzzle, limit = 2) {
  const columns: number[] = [];
  const usedRegions = new Set<number>();
  let count = 0;

  const search = (row: number) => {
    if (count >= limit) return;
    if (row === puzzle.size) {
      count += 1;
      return;
    }

    const options = Array.from({ length: puzzle.size }, (_, column) => column);
    for (const column of options) {
      const region = puzzle.regions[row * puzzle.size + column];
      if (columns.includes(column) || usedRegions.has(region)) continue;
      if (row > 0 && Math.abs(columns[row - 1] - column) <= 1) continue;
      columns.push(column);
      usedRegions.add(region);
      search(row + 1);
      usedRegions.delete(region);
      columns.pop();
    }
  };

  search(0);
  return count;
}
