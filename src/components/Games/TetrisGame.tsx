import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, ArrowDown, ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
};

type TetrominoKey = keyof typeof TETROMINOS;

export default function TetrisGame({ difficulty = 'NORMAL' }: { difficulty?: 'EASY' | 'NORMAL' | 'HARD' }) {
  const [grid, setGrid] = useState<string[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
  const [activePiece, setActivePiece] = useState<{ pos: { x: number, y: number }, shape: number[][], color: string } | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(difficulty === 'EASY' ? 1000 : difficulty === 'HARD' ? 400 : 700);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const spawnPiece = useCallback(() => {
    const keys = Object.keys(TETROMINOS) as TetrominoKey[];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const piece = TETROMINOS[key];
    const newPiece = {
      pos: { x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2), y: 0 },
      shape: piece.shape,
      color: piece.color,
    };

    if (checkCollision(newPiece.pos, newPiece.shape)) {
      setGameOver(true);
      return;
    }
    setActivePiece(newPiece);
  }, [grid]);

  const checkCollision = (pos: { x: number, y: number }, shape: number[][]) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newY = pos.y + y;
          const newX = pos.x + x;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX] !== '')) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const lockPiece = () => {
    if (!activePiece) return;
    const newGrid = grid.map(row => [...row]);
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const finalY = activePiece.pos.y + y;
          const finalX = activePiece.pos.x + x;
          if (finalY >= 0) newGrid[finalY][finalX] = activePiece.color;
        }
      });
    });

    // Clear lines
    let linesCleared = 0;
    const filteredGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== '');
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill(''));
    }

    if (linesCleared > 0) {
      setScore(s => s + [0, 100, 300, 500, 800][linesCleared]);
    }

    setGrid(filteredGrid);
    setActivePiece(null);
    spawnPiece();
  };

  const move = (dir: { x: number, y: number }) => {
    if (!activePiece || gameOver) return;
    const newPos = { x: activePiece.pos.x + dir.x, y: activePiece.pos.y + dir.y };
    if (!checkCollision(newPos, activePiece.shape)) {
      setActivePiece({ ...activePiece, pos: newPos });
    } else if (dir.y > 0) {
      lockPiece();
    }
  };

  const rotate = () => {
    if (!activePiece || gameOver) return;
    const newShape = activePiece.shape[0].map((_, index) =>
      activePiece.shape.map(col => col[index]).reverse()
    );
    if (!checkCollision(activePiece.pos, newShape)) {
      setActivePiece({ ...activePiece, shape: newShape });
    }
  };

  const drop = () => move({ x: 0, y: 1 });

  useEffect(() => {
    if (gameOver) return;
    if (!activePiece) {
      spawnPiece();
      return;
    }
    timerRef.current = setInterval(drop, speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activePiece, gameOver, speed, drop, spawnPiece]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') move({ x: -1, y: 0 });
      if (e.key === 'ArrowRight' || e.key === 'd') move({ x: 1, y: 0 });
      if (e.key === 'ArrowDown' || e.key === 's') drop();
      if (e.key === 'ArrowUp' || e.key === 'w') rotate();
      if (e.key === ' ') {
          // Hard drop
          let currentPos = { ...activePiece!.pos };
          while (!checkCollision({ ...currentPos, y: currentPos.y + 1 }, activePiece!.shape)) {
              currentPos.y++;
          }
          setActivePiece({ ...activePiece!, pos: currentPos });
          lockPiece();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePiece, gameOver]);

  const reset = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
    setScore(0);
    setGameOver(false);
    setActivePiece(null);
  };

  return (
    <div className="w-full max-w-4xl flex flex-col md:flex-row gap-12 items-start justify-center p-8 bg-zinc-950 border border-zinc-800 rounded-sm">
      <div className="relative border-4 border-zinc-800 bg-black p-1 shadow-2xl">
        <div 
          className="grid gap-[1px]" 
          style={{ gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`, gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)` }}
        >
          {grid.map((row, y) => row.map((cell, x) => (
            <div 
              key={`${x}-${y}`} 
              className="w-full h-full border-[0.1px] border-white/5" 
              style={{ backgroundColor: cell || 'transparent' }}
            />
          )))}
          
          {activePiece && activePiece.shape.map((row, y) => row.map((value, x) => {
            if (value === 0) return null;
            const finalY = activePiece.pos.y + y;
            const finalX = activePiece.pos.x + x;
            if (finalY < 0) return null;
            return (
              <div 
                key={`active-${x}-${y}`}
                className="absolute border border-white/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]"
                style={{ 
                  width: BLOCK_SIZE, 
                  height: BLOCK_SIZE, 
                  left: finalX * BLOCK_SIZE + 4, 
                  top: finalY * BLOCK_SIZE + 4,
                  backgroundColor: activePiece.color 
                }}
              />
            );
          }))}
        </div>

        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-50">
             <Trophy className="w-16 h-16 text-red-600 mb-6 animate-bounce" />
             <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">O'yin Tugadi</h2>
             <p className="text-zinc-500 font-mono mb-8 uppercase text-xs tracking-widest">Natija: {score}</p>
             <button 
               onClick={reset}
               className="w-full py-4 bg-white text-black font-black uppercase text-sm hover:bg-yellow-500 transition-all flex items-center justify-center gap-3"
             >
               <RotateCcw className="w-5 h-5" /> Yangitdan
             </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8 w-full max-w-xs">
         <div className="p-6 bg-zinc-900 border border-zinc-800 text-center">
            <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Jami Ball</span>
            <span className="text-5xl font-black text-white italic tracking-tighter">{score.toLocaleString()}</span>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
               <span className="block text-[8px] font-black text-zinc-600 uppercase mb-1">Qiyinchilik</span>
               <span className="text-xs font-mono text-zinc-300 uppercase">{difficulty}</span>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
               <span className="block text-[8px] font-black text-zinc-600 uppercase mb-1">Tezlik</span>
               <span className="text-xs font-mono text-zinc-300 uppercase">{1100 - speed}ms</span>
            </div>
         </div>

         <div className="space-y-4">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Boshqaruv</h4>
            <div className="grid grid-cols-2 gap-3">
               <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] uppercase font-bold"><ArrowLeft className="w-4 h-4"/></div>
                  <span className="text-[9px] uppercase font-mono">Chapga</span>
               </div>
               <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] uppercase font-bold"><ArrowRight className="w-4 h-4"/></div>
                  <span className="text-[9px] uppercase font-mono">O'ngga</span>
               </div>
               <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] uppercase font-bold"><ArrowDown className="w-4 h-4"/></div>
                  <span className="text-[9px] uppercase font-mono">Tezlatish</span>
               </div>
               <div className="flex items-center gap-3 text-zinc-400">
                  <div className="w-8 h-8 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] uppercase font-bold"><RotateCw className="w-4 h-4"/></div>
                  <span className="text-[9px] uppercase font-mono">Burish</span>
               </div>
            </div>
            <div className="pt-4 p-4 border border-zinc-800/50 bg-zinc-900/20 rounded-sm">
               <p className="text-[9px] text-zinc-500 font-mono leading-relaxed uppercase">
                  <span className="text-white font-bold">[SPACE]</span> - Bir varrakaga tushurish (Hard Drop).
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
