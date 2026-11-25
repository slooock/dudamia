"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBlockedCells, isComplete, type CellState } from "@/lib/game-rules";
import { findLogicalStep, getPuzzle } from "@/lib/puzzle-generator";

type Difficulty = "normal" | "hard" | "ultra";
type MessageKind = "info" | "error" | "success";

const DIFFICULTIES: Record<Difficulty, { size: number; label: string }> = {
  normal: { size: 6, label: "Normal" },
  hard: { size: 7, label: "Difícil" },
  ultra: { size: 8, label: "Ultra" },
};

const REGION_COLORS = ["#7eb3d5", "#abd28e", "#c88aba", "#e7cc60", "#77c1bd", "#c790aa", "#e99d78", "#91c4a9"];

function createInitialBoard(size: number) {
  return Array<CellState>(size * size).fill(0);
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" className="icon-glyph">{children}</span>;
}

export function Game() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [level, setLevel] = useState(1);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const size = DIFFICULTIES[difficulty].size;
  const puzzle = useMemo(() => getPuzzle(size, level), [size, level]);
  const { regions } = puzzle;
  const [board, setBoard] = useState<CellState[]>(() => createInitialBoard(6));
  const boardRef = useRef(board);
  const clickTimers = useRef(new Map<number, number>());
  const [history, setHistory] = useState<CellState[][]>([]);
  const [message, setMessage] = useState("Comece procurando uma casa logicamente obrigatória.");
  const [messageKind, setMessageKind] = useState<MessageKind>("info");
  const [mistakeIndex, setMistakeIndex] = useState<number | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => () => {
    clickTimers.current.forEach((timer) => window.clearTimeout(timer));
    clickTimers.current.clear();
  }, []);

  const reset = useCallback((nextDifficulty = difficulty) => {
    const nextSize = DIFFICULTIES[nextDifficulty].size;
    const initialBoard = createInitialBoard(nextSize);
    clickTimers.current.forEach((timer) => window.clearTimeout(timer));
    clickTimers.current.clear();
    boardRef.current = initialBoard;
    setBoard(initialBoard);
    setHistory([]);
    setMessage("Comece procurando uma casa logicamente obrigatória.");
    setMessageKind("info");
    setMistakeIndex(null);
    setHintIndex(null);
  }, [difficulty]);

  const chooseDifficulty = (next: Difficulty) => {
    setDifficulty(next);
    reset(next);
  };

  const commitBoard = (next: CellState[]) => {
    setHistory((items) => [...items, boardRef.current]);
    boardRef.current = next;
    setBoard(next);
  };

  const applySingleClick = (index: number) => {
    const current = boardRef.current;
    if (current[index] === 2) return;
    setMistakeIndex(null);
    setHintIndex(null);

    const next = [...current];
    next[index] = current[index] === 0 ? 1 : 0;
    commitBoard(next);
    setMessage(next[index] === 1 ? "Célula marcada como impossível." : "Marca removida.");
    setMessageKind("info");
  };

  const applyDoubleClick = (index: number) => {
    const current = boardRef.current;
    if (current[index] === 2) return;
    setHintIndex(null);

    const row = Math.floor(index / size);
    const column = index % size;
    const foundCat = puzzle.solution[row] === column;
    const next = [...current];
    next[index] = foundCat ? 2 : 3;
    commitBoard(next);

    if (!foundCat) {
      setMistakeIndex(index);
      setMessage("Não há gato nesta casa.");
      setMessageKind("error");
    } else if (isComplete(next, size, regions)) {
      setMistakeIndex(null);
      setMessage("Perfeito! Todas as regras foram cumpridas. ✨");
      setMessageKind("success");
    } else {
      setMistakeIndex(null);
      setMessage("Gato encontrado! Continue deduzindo.");
      setMessageKind("info");
    }
  };

  const handleCellClick = (index: number) => {
    const pending = clickTimers.current.get(index);
    if (pending) {
      window.clearTimeout(pending);
      clickTimers.current.delete(index);
      return;
    }

    const timer = window.setTimeout(() => {
      clickTimers.current.delete(index);
      applySingleClick(index);
    }, 230);
    clickTimers.current.set(index, timer);
  };

  const handleCellDoubleClick = (index: number) => {
    const pending = clickTimers.current.get(index);
    if (pending) window.clearTimeout(pending);
    clickTimers.current.delete(index);
    applyDoubleClick(index);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    boardRef.current = previous;
    setBoard(previous);
    setHistory((items) => items.slice(0, -1));
    setMessage("Última jogada desfeita.");
    setMessageKind("info");
    setMistakeIndex(null);
    setHintIndex(null);
  };

  const hint = () => {
    const step = findLogicalStep(board, size, regions);
    setMistakeIndex(null);
    if (!step) {
      if (isComplete(board, size, regions)) {
        setMessage("O tabuleiro já está completo!");
        setMessageKind("success");
      } else {
        setMessage("Há uma contradição nas marcações atuais. Desfaça uma jogada e tente novamente.");
        setMessageKind("error");
      }
      return;
    }

    const row = Math.floor(step.index / size) + 1;
    const column = step.index % size + 1;
    const explanation = step.reason === "region"
      ? `a região ${step.group + 1} só tem uma casa possível`
      : step.reason === "row"
        ? `a linha ${step.group + 1} só tem uma casa possível`
        : `a coluna ${step.group + 1} só tem uma casa possível`;
    setHintIndex(step.index);
    setMessage(`Dica: ${explanation}. Descubra o gato em L${row} C${column}.`);
    setMessageKind("info");
  };

  const placed = board.filter((cell) => cell === 2).length;
  const blockedCells = useMemo(() => getBlockedCells(board, size, regions), [board, size, regions]);
  const completed = useMemo(() => isComplete(board, size, regions), [board, size, regions]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#game" aria-label="MeowMaria início">
          <span className="brand-mark">🐱</span>
          <span><strong>MeowMaria</strong><small>Logic puzzle</small></span>
        </a>
        <button className="round-button menu" aria-label="Abrir menu"><Icon>☰</Icon></button>
      </header>

      <section className="game-shell" id="game">
        <div className="game-heading">
          <div className="progress-pill"><span className="cat-face">🐱</span><strong>{placed}</strong><span>/{size}</span></div>
          <div className="title-block"><p>Fase {level}</p><span>Dificuldade</span></div>
          <div className="game-actions">
            <button className="round-button" onClick={() => setLevelsOpen(true)} aria-label="Selecionar fase"><Icon>▦</Icon></button>
            <button className="round-button" onClick={hint} aria-label="Mostrar dica"><Icon>♧</Icon></button>
            <button className="round-button" onClick={undo} disabled={!history.length} aria-label="Desfazer"><Icon>↶</Icon></button>
            <button className="round-button" onClick={() => reset()} aria-label="Reiniciar"><Icon>↻</Icon></button>
            <button className="round-button" onClick={() => setRulesOpen(true)} aria-label="Abrir regras"><Icon>?</Icon></button>
          </div>
        </div>

        <div className="difficulty-tabs" role="group" aria-label="Dificuldade">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((item) => (
            <button key={item} className={difficulty === item ? "active" : ""} onClick={() => chooseDifficulty(item)}>{DIFFICULTIES[item].label}</button>
          ))}
        </div>

        <div className="board-card">
          <div className="board" style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
          }}>
            {board.map((state, index) => (
              <button
                key={index}
                className={`cell ${blockedCells.has(index) && state === 0 ? "blocked" : ""} ${mistakeIndex === index ? "mistake" : ""} ${hintIndex === index ? "hinted" : ""}`}
                style={{ backgroundColor: REGION_COLORS[regions[index] % REGION_COLORS.length] }}
                onClick={() => handleCellClick(index)}
                onDoubleClick={() => handleCellDoubleClick(index)}
                aria-label={`Linha ${Math.floor(index / size) + 1}, coluna ${(index % size) + 1}, região ${regions[index] + 1}${state === 1 ? ", marcada" : state === 2 ? ", gato" : state === 3 ? ", tentativa incorreta" : blockedCells.has(index) ? ", bloqueada pelas regras" : ""}`}
              >
                {state === 1 && <span className="x-mark">×</span>}
                {state === 3 && <span className="x-mark wrong">×</span>}
                {state === 2 && <span className="placed-cat">🐱</span>}
                {state === 0 && blockedCells.has(index) && <span className="blocked-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p className={`game-message ${messageKind}`} aria-live="polite">{message}</p>
          {completed && <button className="next-level-button" onClick={() => { const nextLevel = level === 12 ? 1 : level + 1; setLevel(nextLevel); reset(difficulty); }}>Próxima fase</button>}
        </div>
      </section>

      <section className="intro-section">
        <div>
          <span className="eyebrow">QUEBRA-CABEÇA FELINO</span>
          <h1>Uma pausa tranquila<br />para pensar e <em>ronronar.</em></h1>
        </div>
        <div className="intro-copy">
          <p>Coloque um gato em cada região colorida. Eles não podem dividir linhas, colunas ou encostar uns nos outros — nem pelas diagonais.</p>
          <a href="#how-to-play">Aprenda as regras</a>
        </div>
      </section>

      <section className="rules-section" id="how-to-play">
        <span className="eyebrow">COMO JOGAR</span>
        <h2>Três regras. Muitas possibilidades.</h2>
        <div className="rule-grid">
          <article><span>01</span><div className="rule-icon blue">▦</div><h3>Um por região</h3><p>Cada território colorido deve receber exatamente um gatinho.</p></article>
          <article><span>02</span><div className="rule-icon green">↔</div><h3>Sem linhas iguais</h3><p>Dois gatos nunca podem ficar na mesma linha ou coluna.</p></article>
          <article><span>03</span><div className="rule-icon pink">🐾</div><h3>Sem encostar</h3><p>As oito casas ao redor de um gato ficam automaticamente bloqueadas.</p></article>
        </div>
      </section>

      <footer><div className="brand"><span className="brand-mark">🐱</span><span><strong>MeowMaria</strong><small>Feito para mentes curiosas.</small></span></div><p>Projeto independente inspirado em jogos de lógica felinos.</p></footer>

      {rulesOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setRulesOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button className="modal-close" onClick={() => setRulesOpen(false)} aria-label="Fechar regras">×</button>
            <span className="modal-cat">🐱</span>
            <h2 id="rules-title">Como jogar</h2>
            <p>Um clique marca ou remove um <strong>×</strong>. Dois cliques rápidos revelam um gato correto ou mostram um <strong>× vermelho</strong> quando a tentativa está errada.</p>
            <div className="mini-flow"><span>×</span><b>1×</b><span>🐱</span><b>2×</b><span className="wrong-example">×</span></div>
            <ul><li>Um gato em cada região colorida</li><li>Um gato por linha e coluna</li><li>Nenhum gato pode tocar outro</li></ul>
            <button className="primary-button" onClick={() => setRulesOpen(false)}>Vamos jogar</button>
          </div>
        </div>
      )}

      {levelsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setLevelsOpen(false)}>
          <div className="modal level-modal" role="dialog" aria-modal="true" aria-labelledby="levels-title">
            <button className="modal-close" onClick={() => setLevelsOpen(false)} aria-label="Fechar fases">×</button>
            <h2 id="levels-title">Escolha uma fase</h2>
            <div className="level-grid">{Array.from({ length: 12 }, (_, index) => <button key={index} className={level === index + 1 ? "selected" : ""} onClick={() => { const nextLevel = index + 1; setLevel(nextLevel); reset(difficulty); setLevelsOpen(false); }}>{index + 1}</button>)}</div>
          </div>
        </div>
      )}
    </main>
  );
}
