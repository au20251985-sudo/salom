import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Trophy, RotateCcw, Apple, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

export default function SnakeGame({ difficulty = 'NORMAL' }: { difficulty?: 'EASY' | 'NORMAL' | 'HARD' }) {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [dir, setDir] = useState({ x: 0, y: -1 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speed = difficulty === 'EASY' ? 200 : difficulty === 'HARD' ? 80 : 120;

  const moveSnake = useCallback(() => {
    if (!isPlaying || gameOver) return;

    setSnake(prev => {
      const newHead = { x: prev[0].x + dir.x, y: prev[0].y + dir.y };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        setIsPlaying(false);
        return prev;
      }

      // Self collision
      if (prev.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameOver(true);
        setIsPlaying(false);
        return prev;
      }

      const newSnake = [newHead, ...prev];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood({
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        });
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [dir, food, isPlaying, gameOver]);

  useEffect(() => {
    timerRef.current = setInterval(moveSnake, speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [moveSnake, speed]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (!isPlaying) setIsPlaying(true);

      const key = e.key;
      if ((key === 'ArrowUp' || key === 'w') && dir.y === 0) setDir({ x: 0, y: -1 });
      if ((key === 'ArrowDown' || key === 's') && dir.y === 0) setDir({ x: 0, y: 1 });
      if ((key === 'ArrowLeft' || key === 'a') && dir.x === 0) setDir({ x: -1, y: 0 });
      if ((key === 'ArrowRight' || key === 'd') && dir.x === 0) setDir({ x: 1, y: 0 });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dir, isPlaying, gameOver]);

  const reset = () => {
    setSnake([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
    setFood({ x: 5, y: 5 });
    setDir({ x: 0, y: -1 });
    setScore(0);
    setGameOver(false);
    setIsPlaying(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 py-8 bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden relative">
      <div className="flex flex-col md:flex-row gap-12 items-center justify-center w-full px-8">
        <div 
          className="relative border-4 border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
             {Array.from({ length: GRID_SIZE }).map((_, i) => (
                <div key={i} className="absolute h-full w-px bg-white" style={{ left: i * CELL_SIZE }} />
             ))}
             {Array.from({ length: GRID_SIZE }).map((_, i) => (
                <div key={i} className="absolute w-full h-px bg-white" style={{ top: i * CELL_SIZE }} />
             ))}
          </div>

          {/* Snake */}
          {snake.map((seg, i) => (
            <motion.div 
              key={i}
              initial={false}
              animate={{ x: seg.x * CELL_SIZE, y: seg.y * CELL_SIZE }}
              className={`absolute rounded-[2px] z-10 ${i === 0 ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-green-700/80'}`}
              style={{ width: CELL_SIZE - 2, height: CELL_SIZE - 2 }}
            />
          ))}

          {/* Food */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute bg-red-600 rounded-full flex items-center justify-center z-10 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            style={{ 
              width: CELL_SIZE - 4, 
              height: CELL_SIZE - 4, 
              left: food.x * CELL_SIZE + 2, 
              top: food.y * CELL_SIZE + 2 
            }}
          >
             <Apple className="w-3 h-3 text-white" />
          </motion.div>

          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
               <div className="text-white font-black text-2xl uppercase italic mb-4 tracking-tighter">Boshlashga Tayyor turing</div>
               <p className="text-zinc-400 font-mono text-[10px] uppercase animate-pulse">WASD yoki yo'nalish tugmalarini bosing</p>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-30">
               <Trophy className="w-16 h-16 text-yellow-500 mb-6 animate-bounce" />
               <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">Yutqizdingiz!</h2>
               <p className="text-zinc-500 font-mono mb-8 uppercase text-xs tracking-widest">Natija: {score}</p>
               <button 
                 onClick={reset}
                 className="px-12 py-4 bg-white text-black font-black uppercase text-sm hover:bg-green-500 transition-all flex items-center justify-center gap-3 active:scale-95"
               >
                 <RotateCcw className="w-5 h-5" /> Qayta O'ynash
               </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 w-72">
           <div className="p-6 bg-zinc-900 border border-zinc-800 text-center rounded-sm">
              <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Ball</span>
              <span className="text-5xl font-black text-white italic tracking-tighter">{score}</span>
           </div>

           <div className="space-y-4">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Boshqaruv</h4>
              <div className="grid grid-cols-3 gap-2">
                 <div className="col-start-2">
                    <div className="w-10 h-10 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white"><ChevronUp className="w-6 h-6"/></div>
                 </div>
                 <div className="col-start-1 row-start-2">
                    <div className="w-10 h-10 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white"><ChevronLeft className="w-6 h-6"/></div>
                 </div>
                 <div className="col-start-2 row-start-2">
                    <div className="w-10 h-10 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white"><ChevronDown className="w-6 h-6"/></div>
                 </div>
                 <div className="col-start-3 row-start-2">
                    <div className="w-10 h-10 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white"><ChevronRight className="w-6 h-6"/></div>
                 </div>
              </div>
              <div className="pt-2">
                 <p className="text-[9px] text-zinc-600 font-mono uppercase italic">
                    Tezlik {difficulty} rejimiga moslangan. Qancha ko'p olma yesangiz shuncha ball.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
