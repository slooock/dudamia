"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBlockedCells, isComplete, type CellState } from "@/lib/game-rules";
import { findLogicalStep, getPuzzle } from "@/lib/puzzle-generator";

type Difficulty = "normal" | "hard" | "ultra";
type MessageKind = "info" | "error" | "success";
type DragState = {
  active: boolean;
  pointerId: number | null;
  startIndex: number | null;
  dragging: boolean;
  visited: Set<number>;
};

const DIFFICULTIES: Record<Difficulty, { size: number; label: string }> = {
  normal: { size: 6, label: "Normal" },
  hard: { size: 7, label: "Difícil" },
  ultra: { size: 8, label: "Ultra" },
};

const REGION_COLORS = ["#7eb3d5", "#abd28e", "#c88aba", "#e7cc60", "#77c1bd", "#c790aa", "#e99d78", "#91c4a9"];
const MARIA_PORTRAITS = [
  "/maria-face.png",
  "/maria-face-party.png",
  "/maria-face-smile.png",
  "/maria-face-pizza.png",
  "/maria-face-square.png",
  "/maria-face-child.png",
  "/maria-face-baby.png",
  "/maria-face-laugh-1.png",
  "/maria-face-laugh-2.png",
  "/maria-face-pose.png",
  "/maria-face-adjusting.png",
  "/maria-face-painting.png",
  "/maria-face-cap-close.png",
];
const MOTIVATIONAL_MESSAGES = [
  "Se não conseguir vencer o dia, pelo menos empate. Amanhã tem jogo de volta.",
  "Não tome decisões definitivas com base em emoções temporárias ou de estômago vazio.",
  "Um problema de cada vez, porque sofrer por atacado não dá desconto.",
  "Você não precisa dar conta de tudo. Nem Deus criou o mundo em um único dia.",
  "Antes de questionar todas as suas escolhas de vida, experimente dormir oito horas.",
  "Não sofra por antecipação. Respeite a ordem cronológica dos problemas.",
  "Viva um dia de cada vez. Até porque viver dois simultaneamente seria desvio de função.",
  "O futuro pertence a Deus. Pare de tentar assumir o departamento administrativo dele.",
  "Seja paciente com o processo. Nem o décimo terceiro cai todo mês.",
  "Não precisa ter um plano para tudo. Até o Google Maps recalcula a rota.",
  "Entregue seus problemas a Deus e pare de pedir o código de rastreamento.",
  "Não confunda uma crise existencial com necessidade de férias.",
  "Antes de desistir de tudo, confira se você já almoçou.",
  "Se a vida fechar uma porta, verifique se não é de puxar.",
  "Descansar não é procrastinar. É manutenção preventiva.",
  "Não tente controlar o universo. Você nem controla o horário que o ônibus chega.",
  "Tudo passa. Até o salário, infelizmente.",
  "Deus está no controle, apesar das suas constantes tentativas de assumir a gerência.",
  "Até Jesus dormiu durante uma tempestade. Tire seu cochilo sem culpa.",
  "Não deixe a ansiedade consumir uma energia que poderia ser utilizada para fazer carinho em gatos.",
  "Nem todo problema precisa de uma solução imediata. Alguns precisam de um abraço e uma sobremesa.",
  "Você não precisa ser uma Mulher-Maravilha todos os dias. Até super-heróis têm direito a folga.",
  "Não tente resolver os próximos dez anos numa quarta-feira.",
  "A vida já é complicada demais para você ficar inventando problemas que ainda nem existem.",
  "Nem toda batalha merece sua energia. Algumas merecem apenas um sonoro ‘é sobre isso’ e uma soneca.",
  "Nem toda incerteza precisa ser resolvida. Algumas precisam apenas ser atravessadas.",
  "Você não precisa conhecer o destino para dar o próximo passo.",
  "Não confunda um momento difícil com uma vida difícil.",
  "Algumas estações da vida não são para florescer, mas para fortalecer as raízes.",
  "Há uma diferença entre estar perdida e estar descobrindo um novo caminho.",
  "Nem tudo que foge do seu controle está destinado a dar errado.",
  "Você não precisa sentir-se em casa imediatamente. O pertencimento também leva tempo.",
  "A vida não precisa estar completamente organizada para ser bonita.",
  "O fato de você não compreender o caminho não significa que Deus tenha perdido a direção.",
  "Deus não exige que você conheça todo o percurso, apenas que confie nele durante a caminhada.",
  "A fé não elimina todas as perguntas, mas nos permite viver sem precisar de todas as respostas.",
  "Deus também trabalha nos dias em que você sente que nada está acontecendo.",
  "Você pode descansar mesmo enquanto algumas das suas orações ainda não foram respondidas.",
  "Deus não te ama menos nos dias em que você consegue orar menos.",
  "‘Não vos inquieteis, pois, pelo dia de amanhã.’ — Mateus 6:34",
  "‘Perto está o Senhor dos que têm o coração quebrantado.’ — Salmos 34:18",
  "‘A minha presença irá contigo, e eu te darei descanso.’ — Êxodo 33:14",
  "‘Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus.’ — Isaías 41:10",
  "‘Em qualquer tempo em que eu temer, confiarei em ti.’ — Salmos 56:3",
  "‘Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.’ — 1 Pedro 5:7",
  "Espero que você encontre tantos motivos para sorrir hoje quanto eu encontrei quando estava com você.",
  "Se hoje estiver faltando algum motivo para sorrir, posso disponibilizar um pouco do meu sotaque mineiro.",
  "Espero que, entre tantas responsabilidades, você encontre um tempinho para simplesmente ser Maria.",
];

function createInitialBoard(size: number) {
  return Array<CellState>(size * size).fill(0);
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" className="icon-glyph">{children}</span>;
}

function MariaPortrait({ variant = 0 }: { variant?: number }) {
  const src = MARIA_PORTRAITS[Math.abs(variant) % MARIA_PORTRAITS.length];
  return <Image className="maria-portrait" src={src} alt="" width={256} height={256} aria-hidden="true" />;
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
  const dragRef = useRef<DragState>({
    active: false,
    pointerId: null,
    startIndex: null,
    dragging: false,
    visited: new Set(),
  });
  const suppressClickRef = useRef(false);
  const [history, setHistory] = useState<CellState[][]>([]);
  const [message, setMessage] = useState("Comece procurando uma casa logicamente obrigatória.");
  const [messageKind, setMessageKind] = useState<MessageKind>("info");
  const [mistakeIndex, setMistakeIndex] = useState<number | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [motivation, setMotivation] = useState(MOTIVATIONAL_MESSAGES[0]);
  const motivationIndexRef = useRef(0);
  const wasCompletedRef = useRef(false);

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
    dragRef.current = { active: false, pointerId: null, startIndex: null, dragging: false, visited: new Set() };
    suppressClickRef.current = false;
    boardRef.current = initialBoard;
    setBoard(initialBoard);
    setHistory([]);
    setMessage("Comece procurando uma casa logicamente obrigatória.");
    setMessageKind("info");
    setMistakeIndex(null);
    setHintIndex(null);
    setVictoryOpen(false);
    wasCompletedRef.current = false;
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
    if (isComplete(current, size, regions)) return;
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
    if (isComplete(current, size, regions)) return;
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

  const markDraggedCell = (index: number) => {
    if (isComplete(boardRef.current, size, regions)) return;
    const drag = dragRef.current;
    if (drag.visited.has(index)) return;
    drag.visited.add(index);

    const current = boardRef.current;
    if (current[index] === 1 || current[index] === 2) return;
    const next = [...current];
    next[index] = 1;
    boardRef.current = next;
    setBoard(next);
  };

  const handlePointerDown = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    if (isComplete(boardRef.current, size, regions)) return;
    if (event.button !== 0 || boardRef.current[index] === 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startIndex: index,
      dragging: false,
      visited: new Set(),
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isComplete(boardRef.current, size, regions)) return;
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId || drag.startIndex === null) return;

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-cell-index]");
    const targetIndex = target ? Number(target.dataset.cellIndex) : Number.NaN;
    if (!Number.isInteger(targetIndex) || targetIndex === drag.startIndex && !drag.dragging) return;

    if (!drag.dragging) {
      drag.dragging = true;
      suppressClickRef.current = true;
      clickTimers.current.forEach((timer) => window.clearTimeout(timer));
      clickTimers.current.clear();
      const historySnapshot = boardRef.current;
      setHistory((items) => [...items, historySnapshot]);
      markDraggedCell(drag.startIndex);
    }

    markDraggedCell(targetIndex);
    setMistakeIndex(null);
    setHintIndex(null);
    setMessage("Células marcadas como impossíveis.");
    setMessageKind("info");
  };

  const finishPointerGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    dragRef.current = { active: false, pointerId: null, startIndex: null, dragging: false, visited: new Set() };
    if (drag.dragging) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const handleCellClick = (index: number) => {
    if (isComplete(boardRef.current, size, regions)) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
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
    if (isComplete(boardRef.current, size, regions)) return;
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

  useEffect(() => {
    if (completed && !wasCompletedRef.current) {
      let nextIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
      while (MOTIVATIONAL_MESSAGES.length > 1 && nextIndex === motivationIndexRef.current) {
        nextIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
      }
      motivationIndexRef.current = nextIndex;
      setMotivation(MOTIVATIONAL_MESSAGES[nextIndex]);
      setVictoryOpen(true);
    }
    wasCompletedRef.current = completed;
  }, [completed]);

  const goToNextLevel = () => {
    const nextLevel = level === 12 ? 1 : level + 1;
    setVictoryOpen(false);
    setLevel(nextLevel);
    reset(difficulty);
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#game" aria-label="DudaMia início">
          <span className="brand-mark">🐱</span>
          <span><strong>DudaMia</strong><small>Logic puzzle</small></span>
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
            <button className="round-button" onClick={undo} disabled={completed || !history.length} aria-label="Desfazer"><Icon>↶</Icon></button>
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
          <div
            className="board"
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerGesture}
            onPointerCancel={finishPointerGesture}
            style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {board.map((state, index) => (
              <button
                key={index}
                data-cell-index={index}
                disabled={completed}
                className={`cell ${blockedCells.has(index) && state === 0 ? "blocked" : ""} ${mistakeIndex === index ? "mistake" : ""} ${hintIndex === index ? "hinted" : ""}`}
                style={{ backgroundColor: REGION_COLORS[regions[index] % REGION_COLORS.length] }}
                onPointerDown={(event) => handlePointerDown(index, event)}
                onClick={() => handleCellClick(index)}
                onDoubleClick={() => handleCellDoubleClick(index)}
                aria-label={`Linha ${Math.floor(index / size) + 1}, coluna ${(index % size) + 1}, região ${regions[index] + 1}${state === 1 ? ", marcada" : state === 2 ? ", gato" : state === 3 ? ", tentativa incorreta" : blockedCells.has(index) ? ", bloqueada pelas regras" : ""}`}
              >
                {state === 1 && <span className="x-mark">×</span>}
                {state === 3 && <span className="x-mark wrong">×</span>}
                {state === 2 && <span className="placed-cat"><MariaPortrait variant={(level - 1) * size + regions[index]} /></span>}
                {state === 0 && blockedCells.has(index) && <span className="blocked-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p className={`game-message ${messageKind}`} aria-live="polite">{message}</p>
          {completed && <button className="next-level-button" onClick={goToNextLevel}>Próxima fase</button>}
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

      <footer><div className="brand"><span className="brand-mark">🐱</span><span><strong>DudaMia</strong><small>Feito para mentes curiosas.</small></span></div><p>Projeto independente inspirado em jogos de lógica felinos.</p></footer>

      {victoryOpen && (
        <div className="modal-backdrop victory-backdrop" role="presentation">
          <div className="modal victory-modal" role="dialog" aria-modal="true" aria-labelledby="victory-title">
            <span className="modal-cat"><MariaPortrait variant={(level - 1) * size + placed} /></span>
            <span className="eyebrow">FASE CONCLUÍDA</span>
            <h2 id="victory-title">Você conseguiu! ✨</h2>
            <p className="motivation-message">{motivation}</p>
            <button className="primary-button" onClick={goToNextLevel}>Próxima fase</button>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setRulesOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button className="modal-close" onClick={() => setRulesOpen(false)} aria-label="Fechar regras">×</button>
            <span className="modal-cat">🐱</span>
            <h2 id="rules-title">Como jogar</h2>
            <p>Um clique marca ou remove um <strong>×</strong>. Clique e arraste para marcar várias casas. Dois cliques rápidos revelam um gato correto ou mostram um <strong>× vermelho</strong> quando a tentativa está errada.</p>
            <div className="mini-flow"><span>×</span><b>1×</b><span className="mini-portrait">🐱</span><b>2×</b><span className="wrong-example">×</span></div>
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
