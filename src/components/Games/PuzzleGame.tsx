import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, RotateCcw } from 'lucide-react';

export default function PuzzleGame({ difficulty = 'NORMAL' }: { difficulty?: 'EASY' | 'NORMAL' | 'HARD' }) {
  const gridSize = difficulty === 'EASY' ? 3 : difficulty === 'HARD' ? 5 : 4;
  const tileCount = gridSize * gridSize;
  
  const [tiles1, setTiles1] = useState<number[]>([]);
  const [tiles2, setTiles2] = useState<number[]>([]);
  const [moves1, setMoves1] = useState(0);
  const [moves2, setMoves2] = useState(0);
  const [win, setWin] = useState<number | null>(null); // 1 or 2
  const [isDuo, setIsDuo] = useState(false);

  const generateSolvable = () => {
    let arr = Array.from({ length: tileCount - 1 }, (_, i) => i + 1);
    arr.push(0);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const init = () => {
    setTiles1(generateSolvable());
    setTiles2(generateSolvable());
    setMoves1(0);
    setMoves2(0);
    setWin(null);
  };

  useEffect(() => {
    init();
  }, [difficulty]);

  const moveTile = (index: number, player: 1 | 2) => {
    if (win) return;
    const tiles = player === 1 ? tiles1 : tiles2;
    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const emptyRow = Math.floor(emptyIndex / gridSize);
    const emptyCol = emptyIndex % gridSize;

    const distance = Math.abs(row - emptyRow) + Math.abs(col - emptyCol);
    if (distance === 1) {
      const nextTiles = [...tiles];
      [nextTiles[index], nextTiles[emptyIndex]] = [nextTiles[emptyIndex], nextTiles[index]];
      
      const isWin = nextTiles.slice(0, tileCount - 1).every((val, i) => val === i + 1);
      
      if (player === 1) {
        setTiles1(nextTiles);
        setMoves1(m => m + 1);
        if (isWin) setWin(1);
      } else {
        setTiles2(nextTiles);
        setMoves2(m => m + 1);
        if (isWin) setWin(2);
      }
    }
  };

  const renderBoard = (player: 1 | 2) => {
    const tiles = player === 1 ? tiles1 : tiles2;
    const moves = player === 1 ? moves1 : moves2;
    return (
      <div className="flex-1 min-w-[300px] bg-zinc-900 border border-zinc-800 p-6 rounded-sm relative">
        <div className="flex justify-between items-center mb-6">
           <h3 className={`font-black uppercase italic text-xs ${player === 1 ? 'text-blue-500' : 'text-red-500'}`}>Player {player}</h3>
           <div className="text-[10px] font-mono text-zinc-500">Qadamlar: {moves}</div>
        </div>
        <div 
          className="grid gap-1 aspect-square" 
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {tiles.map((tile, i) => (
            <motion.button 
              key={i}
              layout
              onClick={() => moveTile(i, player)}
              className={`flex items-center justify-center text-sm font-black rounded-sm transition-colors aspect-square ${tile === 0 ? 'bg-zinc-950 opacity-20' : 'bg-zinc-800 border border-zinc-700 text-white hover:border-white'}`}
            >
              {tile !== 0 ? tile : ''}
            </motion.button>
          ))}
        </div>
        {win === player && (
           <div className="absolute inset-0 bg-green-600/20 backdrop-blur-sm flex flex-center items-center justify-center">
              <div className="text-center bg-black/80 p-4 border border-green-500">
                 <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                 <p className="text-white font-black uppercase text-xs">G'alaba!</p>
              </div>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl flex flex-col items-center">
      <div className="flex gap-4 mb-8">
         <button onClick={() => setIsDuo(false)} className={`px-4 py-2 border font-black uppercase text-[10px] transition-all ${!isDuo ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-600'}`}>Yagona</button>
         <button onClick={() => setIsDuo(true)} className={`px-4 py-2 border font-black uppercase text-[10px] transition-all ${isDuo ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-600'}`}>Duo Duel</button>
         <button onClick={init} className="px-4 py-2 border border-zinc-800 text-zinc-400 font-black uppercase text-[10px] hover:text-white"><RotateCcw className="w-4 h-4" /></button>
      </div>

      <div className="w-full flex flex-col md:flex-row gap-8 justify-center">
        {renderBoard(1)}
        {isDuo && renderBoard(2)}
      </div>
    </div>
  );
}
