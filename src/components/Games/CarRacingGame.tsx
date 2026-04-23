import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Car, Trophy, RotateCcw } from 'lucide-react';

export default function CarRacingGame({ difficulty = 'NORMAL' }: { difficulty?: 'EASY' | 'NORMAL' | 'HARD' }) {
  const [mode, setMode] = useState<'SOLO' | 'DUO' | 'BOT'>('SOLO');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [carPos, setCarPos] = useState(30); 
  const [car2Pos, setCar2Pos] = useState(70);
  const [obstacles, setObstacles] = useState<{ id: number; top: number; left: number }[]>([]);
  const gameRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const lastObstacleTime = useRef<number>(0);
  const keys = useRef<{ [key: string]: boolean }>({});

  const diffMultiplier = difficulty === 'EASY' ? 0.7 : difficulty === 'HARD' ? 1.5 : 1.0;

  const spawnObstacle = () => {
    setObstacles(prev => [
      ...prev,
      { id: Date.now(), top: -10, left: Math.random() * 80 + 10 }
    ]);
  };

  const update = (time: number) => {
    if (gameOver) return;

    if (time - lastObstacleTime.current > (1500 / diffMultiplier)) {
      spawnObstacle();
      lastObstacleTime.current = time;
    }

    // P1 Controls
    if (keys.current['a']) setCarPos(prev => Math.max(5, prev - 2));
    if (keys.current['d']) setCarPos(prev => Math.min(95, prev + 2));

    // P2 Controls (DUO)
    if (mode === 'DUO') {
      if (keys.current['ArrowLeft']) setCar2Pos(prev => Math.max(5, prev - 2));
      if (keys.current['ArrowRight']) setCar2Pos(prev => Math.min(95, prev + 2));
    }

    // BOT Logic
    if (mode === 'BOT' || mode === 'SOLO') {
       const targetObstacle = obstacles.find(o => o.top > 20 && o.top < 80);
       if (targetObstacle) {
          if (targetObstacle.left > car2Pos + 5) setCar2Pos(prev => Math.min(95, prev + 1.5));
          else if (targetObstacle.left < car2Pos - 5) setCar2Pos(prev => Math.max(5, prev - 1.5));
       }
    }

    setObstacles(prev => {
      const nextObstacles = prev
        .map(o => ({ ...o, top: o.top + (1.5 * diffMultiplier) }))
        .filter(o => o.top < 110);
      
      // Collision detection P1
      for (const o of nextObstacles) {
        if (o.top > 80 && o.top < 98) {
          if (Math.abs(o.left - carPos) < 10) setGameOver(true);
          if ((mode === 'DUO' || mode === 'BOT') && Math.abs(o.left - car2Pos) < 10) setGameOver(true);
        }
      }

      if (nextObstacles.length < prev.length) setScore(s => s + 10);
      return nextObstacles;
    });

    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    const handleDown = (e: KeyboardEvent) => keys.current[e.key] = true;
    const handleUp = (e: KeyboardEvent) => keys.current[e.key] = false;
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [gameOver, carPos]);

  const reset = () => {
    setScore(0);
    setGameOver(false);
    setObstacles([]);
    setCarPos(30);
    setCar2Pos(70);
  };

  return (
    <div className="w-full max-w-2xl aspect-[3/4] bg-zinc-900 border-x-4 border-zinc-800 relative overflow-hidden flex flex-col items-center">
      {/* Mode Selection */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
         {['SOLO', 'DUO', 'BOT'].map(m => (
           <button 
             key={m} 
             onClick={() => setMode(m as any)}
             className={`px-3 py-1 text-[8px] font-black uppercase border transition-all ${mode === m ? 'bg-white text-black border-white' : 'bg-black text-white border-zinc-800'}`}
           >
             {m}
           </button>
         ))}
      </div>

      {/* Road markings */}
      <div className="absolute inset-0 flex flex-col items-center gap-10 py-10 opacity-10">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="w-2 h-20 bg-white" />
        ))}
      </div>

      <div className="absolute top-4 right-4 bg-black/50 p-2 font-mono text-white text-xs border border-zinc-800 z-20">
        SCORE: {score.toString().padStart(5, '0')}
      </div>

      {/* Car 1 */}
      <motion.div 
        animate={{ left: `${carPos}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute bottom-10 w-12 h-20 flex items-center justify-center -translate-x-1/2 z-10"
      >
        <Car className="w-10 h-10 text-blue-500 fill-blue-500/20 rotate-[-90deg]" />
        <div className="absolute -top-6 text-[8px] font-black text-blue-500 bg-black/50 px-1">P1</div>
      </motion.div>

      {/* Car 2 (DUO or BOT) */}
      {(mode === 'DUO' || mode === 'BOT') && (
        <motion.div 
          animate={{ left: `${car2Pos}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute bottom-10 w-12 h-20 flex items-center justify-center -translate-x-1/2 z-10"
        >
          <Car className={`w-10 h-10 ${mode === 'DUO' ? 'text-red-500' : 'text-zinc-500'} fill-current/20 rotate-[-90deg]`} />
          <div className={`absolute -top-6 text-[8px] font-black px-1 ${mode === 'DUO' ? 'text-red-500' : 'text-zinc-400'}`}>
            {mode === 'DUO' ? 'P2' : 'BOT'}
          </div>
        </motion.div>
      )}

      {/* Obstacles */}
      {obstacles.map(o => (
        <div 
          key={o.id}
          className="absolute w-12 h-12 bg-red-600 border-2 border-red-900 flex items-center justify-center -translate-x-1/2"
          style={{ top: `${o.top}%`, left: `${o.left}%` }}
        >
           <div className="w-4 h-4 bg-white/20 rounded-full animate-ping" />
        </div>
      ))}

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-6 text-center">
           <Trophy className="w-16 h-16 text-yellow-500 mb-4 animate-bounce" />
           <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">Poyga Tugadi!</h2>
           <p className="text-zinc-500 font-mono mb-8 uppercase text-xs tracking-widest">Sizning natijangiz: {score}</p>
           <button 
             onClick={reset}
             className="flex items-center gap-2 bg-white text-black px-8 py-3 font-black uppercase text-xs hover:bg-yellow-500 transition-colors"
           >
             <RotateCcw className="w-4 h-4" /> Qayta urinish
           </button>
        </div>
      )}

      {!gameOver && (
        <div className="absolute bottom-4 left-4 text-[8px] font-mono text-zinc-600 uppercase">
          A/D yoki ←/→ — Boshqaruv
        </div>
      )}
    </div>
  );
}
