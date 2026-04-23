/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Shield, Zap, Target, Swords, Play, Github, LayoutGrid, Lock, Coins, ShoppingBag, Car, Gamepad2, Gamepad, Dices, X } from 'lucide-react';
import GameEngine from './components/Game/GameEngine';
import CarRacingGame from './components/Games/CarRacingGame';
import PuzzleGame from './components/Games/PuzzleGame';
import TetrisGame from './components/Games/TetrisGame';
import SnakeGame from './components/Games/SnakeGame';
import { TANK_MODELS, AVAILABLE_COLORS, DIFFICULTIES } from './constants';

export default function App() {
  const [score, setScore] = useState(0);
  const [pull, setPull] = useState(1500000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameMode, setGameMode] = useState<'SINGLE' | 'VERSUS' | 'TEAM'>('SINGLE');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(() => Number(localStorage.getItem('tank_unlocked_level')) || 0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('tank_highscore')) || 0);
  const [purchasedTankIds, setPurchasedTankIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('tank_purchased');
    return saved ? JSON.parse(saved) : ['basic'];
  });
  const [p1TankIdx, setP1TankIdx] = useState(0);
  const [p2TankIdx, setP2TankIdx] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [showHangar, setShowHangar] = useState(false);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('NORMAL');
  const [p1Color, setP1Color] = useState('#4CAF50');
  const [p2Color, setP2Color] = useState('#2196F3');
  const [purchasedColorIds, setPurchasedColorIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('tank_colors_purchased');
    return saved ? JSON.parse(saved) : ['green'];
  });
  const [activeGame, setActiveGame] = useState<'TANK' | 'RACE' | 'PUZZLE' | 'TETRIS' | 'SNAKE'>('TANK');

  const handleColorPurchase = (colorId: string, cost: number) => {
    if (pull >= cost && !purchasedColorIds.includes(colorId)) {
      const newPurchased = [...purchasedColorIds, colorId];
      setPurchasedColorIds(newPurchased);
      setPull(prev => prev - cost);
      localStorage.setItem('tank_colors_purchased', JSON.stringify(newPurchased));
    }
  };

  const handleStartGame = () => {
    if (activeGame === 'TANK') {
      setShowDifficultySelect(true);
    } else {
      setIsPlaying(true);
    }
  };

  const finalizeGameStart = (diff: 'EASY' | 'NORMAL' | 'HARD') => {
    setSelectedDifficulty(diff);
    setShowDifficultySelect(false);
    setIsPlaying(true);
  };

  const handleGameSwitch = (game: 'TANK' | 'RACE' | 'PUZZLE') => {
    setActiveGame(game);
    setShowGamesMenu(false);
    setIsPlaying(false); // Stop current game if switching
  };

  const handlePurchase = (tankIdx: number) => {
    const tank = TANK_MODELS[tankIdx];
    if (pull >= tank.cost && !purchasedTankIds.includes(tank.id)) {
      const newPurchased = [...purchasedTankIds, tank.id];
      setPurchasedTankIds(newPurchased);
      setPull(prev => prev - tank.cost);
      localStorage.setItem('tank_purchased', JSON.stringify(newPurchased));
    }
  };

  const handleLevelWin = (levelIdx: number) => {
    const baseReward = (levelIdx + 1) * 500000;
    const diffMod = selectedDifficulty === 'HARD' ? 1.5 : selectedDifficulty === 'EASY' ? 0.7 : 1.0;
    const totalReward = Math.floor(baseReward * diffMod);
    
    setPull(prev => prev + totalReward);
    
    if (levelIdx >= unlockedLevel && levelIdx < 14) {
      const next = levelIdx + 1;
      setUnlockedLevel(next);
      localStorage.setItem('tank_unlocked_level', String(next));
    }
  };

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('tank_highscore', String(newScore));
    }
  };

  const menuVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' }
    })
  };

  const [showGamesMenu, setShowGamesMenu] = useState(false);

  const handleNextLevel = () => {
    if (selectedLevel < 14) {
      setSelectedLevel(prev => prev + 1);
      // We don't need to manually set isPlaying to true here because it already is, 
      // but we need to trigger a remount or state reset of GameEngine.
      // Easiest way is to toggle isPlaying briefly or ensure GameEngine reacts to levelIndex.
      // Since levelIndex is in GameEngine's dependency array of useEffect, it will reset.
    } else {
      setIsPlaying(false);
      alert("Tabriklaymiz! Siz barcha bosqichlarni muvaffaqiyatli yakunladingiz!");
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-300 font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      {/* Tactical Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
         <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
      </div>

      {/* Floating Header - Repositioned to Bottom Right Area */}
      <div className="fixed bottom-8 right-8 z-50 p-4 pointer-events-none">
          <button 
            onClick={() => { setShowGamesMenu(true); }}
            className="pointer-events-auto flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl border-2 border-red-600/50 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest text-white hover:bg-red-600 hover:border-red-600 transition-all group shadow-[0_0_30px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
          >
              <LayoutGrid className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Boshqa o'yinlar
          </button>
      </div>

      {/* Other Games Menu Overlay */}
      <AnimatePresence>
        {showGamesMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 p-8 relative overflow-hidden"
            >
               {/* Decorative background */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] translate-y-1/2 -translate-x-1/2" />

               <div className="relative z-10">
                 <div className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-6">
                    <div>
                       <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">MARKET MARKAZI</h2>
                       <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mt-2">Dastur versiyasi: 2.0.4 // Markaziy boshqaruv</p>
                    </div>
                    <button 
                      onClick={() => setShowGamesMenu(false)}
                      className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                    >
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { id: 'RACE', name: 'X-Race: Tezlik', icon: Car, color: 'text-blue-500', desc: 'Ko\'cha poygalari va manyovrlar jangi', type: 'mashinali', available: true },
                      { id: 'TETRIS', name: 'Tetris Pro', icon: LayoutGrid, color: 'text-purple-500', desc: 'Klassik bloklar jangi va mantiq', type: 'mantiq', available: true },
                      { id: 'PUZZLE', name: 'Mantiqiy Duel', icon: Dices, color: 'text-yellow-500', desc: 'Strategik jumboqlar to\'plami', type: 'mantiq', available: true },
                      { id: 'SNAKE', name: 'Ilon O\'yini', icon: Zap, color: 'text-green-500', desc: 'Tezlik va ehtiyotkorlik sinovi', type: 'arcade', available: true },
                      { id: 'TANK', name: 'Classic Tanker', icon: Swords, color: 'text-green-500', desc: 'Tanklar jangi klassik varianti', type: 'strategik', available: true }
                    ].map((game, i) => (
                      <motion.div 
                        key={i}
                        whileHover={game.available ? { y: -5, scale: 1.02 } : { y: -5 }}
                        onClick={() => game.available && handleGameSwitch(game.id as any)}
                        className={`bg-zinc-900/50 border p-6 group transition-all relative overflow-hidden ${game.available ? 'cursor-pointer hover:border-zinc-300 border-zinc-800' : 'cursor-not-allowed grayscale border-zinc-900 opacity-60'}`}
                      >
                         <div className="absolute top-0 right-0 p-2">
                            {!game.available ? (
                               <span className="text-[8px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">Tez kunda</span>
                            ) : (
                               <span className="text-[8px] font-black bg-green-600/20 text-green-500 px-2 py-0.5 rounded uppercase border border-green-600/30">O'ynash</span>
                            )}
                         </div>
                         <div className={`w-12 h-12 rounded-lg bg-zinc-950 flex items-center justify-center mb-4 border border-zinc-800 group-hover:scale-110 transition-transform ${game.color.replace('text', 'bg')}/10`}>
                            <game.icon className={`w-6 h-6 ${game.color}`} />
                         </div>
                         <h4 className="text-white font-black uppercase text-lg mb-2">{game.name}</h4>
                         <p className="text-zinc-500 text-[10px] uppercase font-mono leading-relaxed">{game.desc}</p>
                         <div className="mt-4 flex items-center gap-2">
                           <span className="text-[8px] font-black text-zinc-600 uppercase border border-zinc-800 px-2 py-1">{game.type}</span>
                         </div>
                      </motion.div>
                    ))}
                 </div>

                 <div className="mt-12 p-6 border-l-4 border-red-600 bg-red-600/5">
                    <p className="text-[10px] text-zinc-400 font-mono uppercase italic tracking-widest leading-relaxed">
                       Diqqat: Yangi o'yinlarni yuklab olish uchun markaziy serverga ulanish talab qilinadi. Ba'zi o'yinlar hali ishlab chiqish bosqichida.
                    </p>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-12">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8 border-b border-zinc-800/50 pb-8">
          <div className="flex items-center gap-6">
            <div className="relative group">
               <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
               <div className="relative w-20 h-20 bg-zinc-900 border-2 border-red-600 flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Swords className="w-10 h-10 text-red-600" />
               </div>
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter uppercase leading-none text-white italic">
                {activeGame === 'TANK' ? 'Tanklar Jangi' : activeGame === 'RACE' ? 'X-Race: Tezlik' : activeGame === 'PUZZLE' ? 'Mantiqiy Duel' : activeGame === 'TETRIS' ? 'Tetris Pro' : 'Ilon O\'yini'}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                 <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
                    Sektor: {activeGame === 'TANK' ? 'OPERATSIYA_15' : 'GLOBAL_HUB'}
                 </span>
                 <div className="h-px w-12 bg-zinc-800" />
                 <span className="text-[10px] font-mono text-red-600 animate-pulse uppercase">SIGNAL_STABIL</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
             {activeGame === 'TANK' ? (
               <>
                 <div className="flex-1 lg:flex-none border-l-2 border-zinc-800 pl-4 py-1">
                    <span className="block text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Mablag' (Pull)</span>
                    <span className="text-3xl font-mono text-green-500 tracking-tight flex items-center gap-2">
                       <Coins className="w-6 h-6" />
                       {pull.toLocaleString()}
                    </span>
                 </div>
                 <div className="flex-1 lg:flex-none border-l-2 border-zinc-800 pl-4 py-1">
                    <button 
                      onClick={() => setShowHangar(true)}
                      className="group flex flex-col items-start"
                    >
                       <span className="block text-[9px] font-black uppercase text-green-500 tracking-widest mb-1 group-hover:text-red-600 transition-colors">Market & Angar (Shop)</span>
                       <span className="text-2xl font-black italic text-white uppercase flex items-center gap-2 group-hover:text-red-500 transition-colors">
                          <ShoppingBag className="w-5 h-5 text-red-600" />
                          Sotib olish
                       </span>
                    </button>
                 </div>
                 <div className="flex-1 lg:flex-none border-l-2 border-zinc-800 pl-4 py-1">
                    <span className="block text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Joriy Ball</span>
                    <span className="text-3xl font-mono text-white tracking-tight">{score.toString().padStart(6, '0')}</span>
                 </div>
               </>
             ) : (
               <div className="flex-1 lg:flex-none border-l-2 border-red-600 pl-4 py-1">
                  <span className="block text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Holat</span>
                  <span className="text-2xl font-black italic text-white uppercase group flex items-center gap-2">
                     <Gamepad className="w-5 h-5 text-red-600 animate-pulse" />
                     Boshqaruv Faol
                  </span>
               </div>
             )}
             <div className="flex-1 lg:flex-none border-l-2 border-zinc-800 pl-4 py-1">
                <span className="block text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Rekord (Tank)</span>
                <span className="text-3xl font-mono text-yellow-500 tracking-tight">{highScore.toString().padStart(6, '0')}</span>
             </div>
          </div>
        </header>

        <main className="flex flex-col lg:flex-row gap-12 items-start">
          <AnimatePresence mode="wait">
            {activeGame === 'RACE' ? (
              <motion.div key="race" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center">
                 <div className="w-full flex justify-between items-center bg-zinc-900 border border-zinc-800 px-6 py-3 mb-6">
                    <span className="text-[10px] font-black text-blue-500 uppercase">X-Race: Tezlik Rejimi</span>
                    <button onClick={() => setActiveGame('TANK')} className="text-[10px] font-black uppercase text-zinc-500">Menyuga qaytish</button>
                 </div>
                 <CarRacingGame difficulty={selectedDifficulty} />
              </motion.div>
            ) : activeGame === 'PUZZLE' ? (
              <motion.div key="puzzle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center">
                 <div className="w-full flex justify-between items-center bg-zinc-900 border border-zinc-800 px-6 py-3 mb-6">
                    <span className="text-[10px] font-black text-yellow-500 uppercase">Mantiqiy Duel</span>
                    <button onClick={() => setActiveGame('TANK')} className="text-[10px] font-black uppercase text-zinc-500">Menyuga qaytish</button>
                 </div>
                 <PuzzleGame difficulty={selectedDifficulty} />
              </motion.div>
            ) : activeGame === 'TETRIS' ? (
              <motion.div key="tetris" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center">
                 <div className="w-full flex justify-between items-center bg-zinc-900 border border-zinc-800 px-6 py-3 mb-6">
                    <span className="text-[10px] font-black text-purple-500 uppercase">Tetris Pro: Bloklar</span>
                    <button onClick={() => setActiveGame('TANK')} className="text-[10px] font-black uppercase text-zinc-500">Menyuga qaytish</button>
                 </div>
                 <TetrisGame difficulty={selectedDifficulty} />
              </motion.div>
            ) : activeGame === 'SNAKE' ? (
              <motion.div key="snake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center">
                 <div className="w-full flex justify-between items-center bg-zinc-900 border border-zinc-800 px-6 py-3 mb-6">
                    <span className="text-[10px] font-black text-green-500 uppercase">Ilon O'yini: Klassik</span>
                    <button onClick={() => setActiveGame('TANK')} className="text-[10px] font-black uppercase text-zinc-500">Menyuga qaytish</button>
                 </div>
                 <SnakeGame difficulty={selectedDifficulty} />
              </motion.div>
            ) : !isPlaying ? (
              <motion.div 
                key="launcher"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 w-full"
              >
                 <div className="grid grid-cols-1 gap-8">
                    {/* Game Setup */}
                    <section className="space-y-8">
                       <div>
                          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 mb-6 flex items-center gap-3">
                             <span className="w-8 h-px bg-zinc-800" /> O'yin Rejimi
                          </h2>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                             <button 
                               onClick={() => setGameMode('SINGLE')}
                               className={`p-6 border transition-all ${gameMode === 'SINGLE' ? 'bg-white text-black border-white' : 'bg-transparent border-zinc-800 hover:border-zinc-500 text-zinc-500'}`}
                             >
                                <div className="text-left">
                                   <div className="font-black uppercase tracking-tighter text-xl mb-1">Solo</div>
                                   <div className="text-[9px] uppercase font-mono opacity-60 italic tracking-widest">Botlarga qarshi</div>
                                </div>
                             </button>
                             <button 
                               onClick={() => setGameMode('VERSUS')}
                               className={`p-6 border transition-all ${gameMode === 'VERSUS' ? 'bg-white text-black border-white' : 'bg-transparent border-zinc-800 hover:border-zinc-500 text-zinc-500'}`}
                             >
                                <div className="text-left">
                                   <div className="font-black uppercase tracking-tighter text-xl mb-1">1 VS 1</div>
                                   <div className="text-[9px] uppercase font-mono opacity-60 italic tracking-widest">Duel</div>
                                </div>
                             </button>
                             <button 
                               onClick={() => setGameMode('TEAM')}
                               className={`p-6 border transition-all ${gameMode === 'TEAM' ? 'bg-white text-black border-white' : 'bg-transparent border-zinc-800 hover:border-zinc-500 text-zinc-500'}`}
                             >
                                <div className="text-left">
                                   <div className="font-black uppercase tracking-tighter text-xl mb-1">2 VS 2</div>
                                   <div className="text-[9px] uppercase font-mono opacity-60 italic tracking-widest">Jamoaviy</div>
                                </div>
                             </button>
                          </div>
                       </div>

                       <div>
                          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 mb-6 flex items-center gap-3">
                             <span className="w-8 h-px bg-zinc-800" /> Operatsiya Hududi (15 Missiya)
                          </h3>
                          <div className="grid grid-cols-5 gap-3">
                             {Array.from({ length: 15 }).map((_, i) => {
                                const isLocked = i > unlockedLevel;
                                return (
                                  <button 
                                    key={i}
                                    disabled={isLocked}
                                    onClick={() => setSelectedLevel(i)}
                                    className={`aspect-square border flex flex-col items-center justify-center font-mono transition-all relative overflow-hidden ${selectedLevel === i ? 'bg-red-600 border-red-600 text-white animate-pulse' : isLocked ? 'bg-zinc-950 border-zinc-900 text-zinc-800 cursor-not-allowed opacity-50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-500 text-zinc-500'}`}
                                  >
                                     <span className="text-lg">{(i + 1).toString().padStart(2, '0')}</span>
                                     {isLocked && (
                                       <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                         <Lock className="w-4 h-4 opacity-40" />
                                       </div>
                                     )}
                                  </button>
                                );
                             })}
                          </div>
                       </div>

                       <div className="pt-6">
                          <button 
                            onClick={() => setIsPlaying(true)}
                            className="group relative w-full flex items-center justify-between p-8 bg-zinc-100 hover:bg-yellow-500 text-black transition-all duration-300"
                          >
                             <div className="flex flex-col items-start translate-x-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Tayyorgarlik yakunlandi</span>
                                <span className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                                   Jangga Kirish
                                   <Play className="w-8 h-8 fill-black" />
                                </span>
                             </div>
                             <div className="w-12 h-12 border-2 border-black/10 flex items-center justify-center">
                                <Swords className="w-6 h-6" />
                             </div>
                          </button>
                       </div>
                    </section>
                 </div>
              </motion.div>
            ) : (
              <motion.div 
                key="battle"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center gap-6"
              >
                 <div className="w-full flex justify-between items-center bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-sm">
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                          <span className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">Missiya Hududi 0{selectedLevel + 1}</span>
                       </div>
                    </div>
                    <button 
                      onClick={() => setIsPlaying(false)}
                      className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors"
                    >
                       Taktik Chekinish [ESC]
                    </button>
                 </div>
                 
                 <GameEngine 
                   mode={gameMode} 
                   levelIndex={selectedLevel} 
                   difficulty={selectedDifficulty}
                   p1Color={p1Color}
                   p2Color={p2Color}
                   onScoreUpdate={handleScoreUpdate} 
                   onPullUpdate={(p) => setPull(prev => prev + p)}
                   onLevelWin={() => handleLevelWin(selectedLevel)}
                   onGameOver={() => setIsPlaying(false)} 
                   onNextLevel={handleNextLevel}
                   p1Tank={TANK_MODELS[p1TankIdx]}
                   p2Tank={TANK_MODELS[p2TankIdx]}
                 />
                 
                 <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest text-center mt-4">
                    Tizim: Real vaqtda taktika tahlili faol // Aloqa: 100% // Signal: Barqaror
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rules Sidebar */}
          <aside className="w-full lg:w-72 space-y-6 flex-shrink-0">
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-sm">
              <h3 className="text-white font-black uppercase italic mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600" />
                {activeGame === 'TANK' ? 'Tanklar Jangi Qoidalari' : 
                 activeGame === 'RACE' ? 'Poyga Qoidalari' : 
                 activeGame === 'TETRIS' ? 'Tetris Qoidalari' :
                 activeGame === 'SNAKE' ? 'Ilon O\'yini Qoidalari' :
                 'Jumboq Qoidalari'}
              </h3>
              <ul className="space-y-4">
                {activeGame === 'TANK' ? (
                  <>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Har bir dushman uchun <span className="text-green-500">50 PULL</span> beriladi.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        P1: <span className="text-white">WASD + Q/SPACE</span> | P2: <span className="text-white">ARROWs + 1</span>
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Barcha dushmanlarni yo'q qilib, keyingi bosqichga o'ting.
                      </p>
                    </li>
                  </>
                ) : activeGame === 'RACE' ? (
                  <>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Boshqaruv: <span className="text-white">A/D</span> yoki <span className="text-white">←/→</span>
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Qizil to'siqlardan qoching. To'qnashuv o'yinni tugatadi.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Vaqt o'tishi bilan tezlik ortib boradi!
                      </p>
                    </li>
                  </>
                ) : activeGame === 'TETRIS' ? (
                  <>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Burish: <span className="text-white">W / Up Arrow</span>
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Tez tushirish: <span className="text-white">SPACE</span>
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Qancha ko'p qator yopsangiz shuncha ko'p ball.
                      </p>
                    </li>
                  </>
                ) : activeGame === 'SNAKE' ? (
                  <>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Yo'nalish: <span className="text-white">WASD / ARROWs</span>
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        O'zingizga yoki devorga urilmang!
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Har bir olma ballingizni oshiradi.
                      </p>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Boshqaruv: Suringiz kelgan katakni ustiga <span className="text-white">BO'SING</span>.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Raqamlarni <span className="text-white">1-15</span> tartibida joylashtiring.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-1.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed text-zinc-400 uppercase font-mono">
                        Eng kam qadamda tugatishga harakat qiling.
                      </p>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {activeGame === 'TANK' && (
              <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-sm">
                <h3 className="text-white font-black uppercase italic mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Bonuslar
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-zinc-950 p-2 border border-zinc-800">
                    <div className="w-6 h-6 bg-green-600/20 border border-green-600 flex items-center justify-center text-[10px] text-green-500 font-bold">S</div>
                    <span className="text-[9px] text-zinc-500 uppercase font-mono">Zirh - Himoya qobig'i</span>
                  </div>
                  <div className="flex items-center gap-3 bg-zinc-950 p-2 border border-zinc-800">
                    <div className="w-6 h-6 bg-orange-600/20 border border-orange-600 flex items-center justify-center text-[10px] text-orange-500 font-bold">D</div>
                    <span className="text-[9px] text-zinc-500 uppercase font-mono">Ikktil o'q - Kuchli hujum</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border border-red-600/20 bg-red-600/5 rounded-sm">
               <span className="text-[8px] font-black text-red-600 uppercase tracking-widest block mb-2">Tizim holati</span>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-mono text-zinc-500">OPERATSIYA_ONLAYN_24/7</span>
               </div>
            </div>
          </aside>
        </main>

        <footer className="mt-24 pt-12 border-t border-zinc-800/40">
           <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-8">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Dasturiy Ta'minot</span>
                    <span className="text-[10px] font-mono text-zinc-400">Ver. 1.15.0_PRO_STRATEGIC</span>
                 </div>
                 <div className="h-4 w-px bg-zinc-800" />
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Xavfsizlik Sathi</span>
                    <span className="text-[10px] font-mono text-green-600">MIL_SPEC_ENCRYPTED</span>
                 </div>
              </div>
              
              <div className="flex gap-8 text-[10px] uppercase font-black tracking-widest text-zinc-600">
                 <a href="#" className="hover:text-white transition-colors">Taktika_Markazi</a>
                 <a href="#" className="hover:text-white transition-colors">Arxiv</a>
                 <a href="#" className="hover:text-white transition-colors flex items-center gap-2 group">
                    <Github className="w-3 h-3 group-hover:text-red-600 transition-colors" /> GitHub
                 </a>
              </div>
           </div>
        </footer>

        {/* Hangar / Shop Overlay */}
        <AnimatePresence>
          {showHangar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            >
              <div className="w-full max-w-5xl h-[85vh] bg-zinc-950 border border-zinc-800 flex flex-col relative">
                <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                   <div>
                     <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">MARKET & MODIFIKATSIYA</h2>
                     <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase">Mablag': <span className="text-green-500">{pull.toLocaleString()} PULL</span></p>
                   </div>
                   <button onClick={() => setShowHangar(false)} className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   {/* Tank Selection */}
                   <div className="mb-12">
                      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 mb-8 flex items-center gap-3 underline decoration-red-600 underline-offset-8">
                         Market: Tanklar
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {TANK_MODELS.map((tank, idx) => {
                           const isOwned = purchasedTankIds.includes(tank.id);
                           const isSelectedP1 = p1TankIdx === idx;
                           const isSelectedP2 = p2TankIdx === idx;
                           const canAfford = pull >= tank.cost;
                           return (
                             <div key={tank.id} className={`p-6 border transition-all relative ${isSelectedP1 || isSelectedP2 ? 'border-red-600 bg-red-600/5' : 'border-zinc-800 bg-zinc-900/30'}`}>
                               <div className="flex justify-between items-start mb-4">
                                  <div>
                                     <h4 className="font-black uppercase text-xl text-white">{tank.name}</h4>
                                     <p className="text-[9px] text-zinc-500 uppercase font-mono mt-1">{tank.description}</p>
                                  </div>
                                  {!isOwned && <span className="text-green-500 font-mono font-bold">{tank.cost.toLocaleString()}</span>}
                               </div>
                               <div className="space-y-2 mb-6">
                                  <div className="flex justify-between text-[10px] uppercase font-mono"><span className="text-zinc-600">Sog'liq:</span> <span className="text-white">{tank.health}</span></div>
                                  <div className="flex justify-between text-[10px] uppercase font-mono"><span className="text-zinc-600">Tezlik:</span> <span className="text-white">{tank.speed}</span></div>
                                  <div className="flex justify-between text-[10px] uppercase font-mono border-t border-zinc-800 pt-1 mt-1 text-red-500 font-bold"><span>Kuchi:</span> <span>{tank.power}x</span></div>
                               </div>
                               <div className="flex gap-2">
                                  {!isOwned ? (
                                     <button 
                                       onClick={() => handlePurchase(idx)}
                                       disabled={!canAfford}
                                       className={`flex-1 py-3 font-black uppercase text-xs ${canAfford ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                                     >
                                        Sotib olish
                                     </button>
                                  ) : (
                                    <div className="flex w-full gap-2">
                                       <button onClick={() => setP1TankIdx(idx)} className={`flex-1 py-2 font-black uppercase text-[10px] border ${isSelectedP1 ? 'bg-red-600 text-white' : 'border-zinc-800 text-zinc-500'}`}>P1</button>
                                       {gameMode !== 'SINGLE' && <button onClick={() => setP2TankIdx(idx)} className={`flex-1 py-2 font-black uppercase text-[10px] border ${isSelectedP2 ? 'bg-blue-600 text-white' : 'border-zinc-800 text-zinc-500'}`}>P2</button>}
                                    </div>
                                  )}
                               </div>
                             </div>
                           );
                        })}
                      </div>
                   </div>

                   {/* Color Customization */}
                   <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 mb-8 flex items-center gap-3 underline decoration-blue-600 underline-offset-8">
                         Vizual Modifikatsiya (Ranglar)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                         {AVAILABLE_COLORS.map((color) => {
                            const isOwned = purchasedColorIds.includes(color.id);
                            const isSelectedP1 = p1Color === color.color;
                            const isSelectedP2 = p2Color === color.color;
                            const canAfford = pull >= color.cost;
                            return (
                              <div key={color.id} className="flex flex-col gap-2">
                                 <button 
                                   onClick={() => isOwned ? setP1Color(color.color) : handleColorPurchase(color.id, color.cost)}
                                   disabled={!isOwned && !canAfford}
                                   className={`aspect-square w-full border-4 transition-all flex items-center justify-center ${isSelectedP1 ? 'border-red-600' : 'border-zinc-800 hover:border-zinc-500'}`}
                                   style={{ backgroundColor: color.color }}
                                 >
                                    {!isOwned && <Lock className="w-5 h-5 text-white/50" />}
                                    {isSelectedP1 && <div className="text-white font-black text-[8px] bg-black/40 px-1">P1 SELETED</div>}
                                 </button>
                                 <div className="text-center">
                                    <p className="text-[10px] font-black uppercase truncate">{color.name}</p>
                                    {!isOwned && <p className="text-[9px] font-mono text-green-500">{color.cost} PULL</p>}
                                    {isOwned && gameMode !== 'SINGLE' && (
                                       <button onClick={() => setP2Color(color.color)} className={`mt-1 text-[8px] font-black uppercase w-full py-1 border ${isSelectedP2 ? 'bg-blue-600 text-white' : 'border-zinc-800'}`}>P2 ga</button>
                                    )}
                                 </div>
                              </div>
                            );
                         })}
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Difficulty Selection Overlay */}
        <AnimatePresence>
          {showDifficultySelect && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
            >
               <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 p-12 text-center"
               >
                  <h2 className="text-4xl font-black uppercase italic italic tracking-tighter text-white mb-4">Tayyorgarlik Sathi</h2>
                  <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-12">Missiya qiyinchilik darajasini tanlang</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(DIFFICULTIES).map(([key, diff]) => (
                       <button 
                         key={key}
                         onClick={() => finalizeGameStart(key as any)}
                         className="group relative p-8 border border-zinc-800 bg-zinc-900/30 hover:border-white transition-all overflow-hidden"
                       >
                          <div className="absolute top-0 right-0 w-2 h-full opacity-50" style={{ backgroundColor: diff.color }} />
                          <div className="relative z-10">
                             <div className="text-2xl font-black uppercase italic mb-2 text-white">{diff.label}</div>
                             <div className="text-[10px] font-mono text-zinc-500 mb-4">MODIFIER: x{diff.multiplier}</div>
                             <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center mx-auto group-hover:bg-white group-hover:text-black transition-all">
                                <Play className="w-4 h-4 fill-current" />
                             </div>
                          </div>
                       </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setShowDifficultySelect(false)}
                    className="mt-12 text-zinc-600 hover:text-white uppercase font-black text-[10px] tracking-widest transition-colors"
                  >
                     Orqaga qaytish
                  </button>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


