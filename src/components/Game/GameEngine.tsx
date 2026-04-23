/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Direction, GRID_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, Bullet, GameEntity, TankModel } from '../../types';
import { TANK_COLORS, WALL_COLORS, GAME_CONFIG, TANK_MODELS, DIFFICULTIES } from '../../constants';
import { LEVELS } from '../../levels';
import { Trophy } from 'lucide-react';

export default function GameEngine({ 
  mode, 
  levelIndex, 
  difficulty = 'NORMAL',
  p1Color = '#4CAF50',
  p2Color = '#2196F3',
  onScoreUpdate, 
  onPullUpdate,
  onGameOver,
  onNextLevel,
  onLevelWin,
  p1Tank = TANK_MODELS[0],
  p2Tank = TANK_MODELS[0]
}: { 
  mode: 'SINGLE' | 'VERSUS' | 'TEAM', 
  levelIndex: number, 
  difficulty?: 'EASY' | 'NORMAL' | 'HARD',
  p1Color?: string,
  p2Color?: string,
  onScoreUpdate: (s: number) => void, 
  onPullUpdate: (p: number) => void,
  onGameOver: () => void,
  onNextLevel: () => void,
  onLevelWin: () => void,
  p1Tank?: TankModel,
  p2Tank?: TankModel
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const requestRef = useRef<number>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastShotP1 = useRef<number>(0);
  const lastShotP2 = useRef<number>(0);
  const lastPowerupSpawn = useRef<number>(0);

  // Initialize Game
  useEffect(() => {
    const levelMap = LEVELS[levelIndex] || LEVELS[0];
    const MAP_HEIGHT = levelMap.length;
    const MAP_WIDTH = levelMap[0].split(' ').length;
    
    const walls: GameEntity[] = [];
    const water: GameEntity[] = [];
    const bushes: GameEntity[] = [];
    
    levelMap.forEach((row, y) => {
      row.split(' ').forEach((cell, x) => {
        const entityBase = {
          id: `${x}-${y}`,
          x: x * GRID_SIZE,
          y: y * GRID_SIZE,
          width: GRID_SIZE,
          height: GRID_SIZE,
          direction: 'UP' as Direction,
          speed: 0,
          health: 1,
          maxHealth: 1,
          power: 1,
        };
        
        if (cell === 'B') walls.push({ ...entityBase, type: 'WALL_BRICK' });
        else if (cell === 'S') walls.push({ ...entityBase, type: 'WALL_STEEL', health: 999 });
        else if (cell === 'W') water.push({ ...entityBase, type: 'WATER' });
        else if (cell === 'U') bushes.push({ ...entityBase, type: 'BUSH' });
      });
    });

    const player1: GameEntity = {
      id: 'player1',
      type: 'PLAYER',
      x: GRID_SIZE * 1,
      y: GRID_SIZE * (MAP_HEIGHT - 2),
      width: GRID_SIZE - 4,
      height: GRID_SIZE - 4,
      direction: 'UP',
      speed: p1Tank.speed,
      health: p1Tank.health,
      maxHealth: p1Tank.health,
      power: p1Tank.power,
      color: p1Tank.color as any 
    };

    let player2: GameEntity | undefined = undefined;
    if (mode === 'VERSUS' || mode === 'TEAM') {
        player2 = {
            id: 'player2',
            type: 'PLAYER',
            x: mode === 'VERSUS' ? GRID_SIZE * (MAP_WIDTH - 2) : GRID_SIZE * 3,
            y: mode === 'VERSUS' ? GRID_SIZE * 1 : GRID_SIZE * (MAP_HEIGHT - 2), 
            width: GRID_SIZE - 4,
            height: GRID_SIZE - 4,
            direction: mode === 'VERSUS' ? 'DOWN' : 'UP',
            speed: p2Tank.speed,
            health: p2Tank.health,
            maxHealth: p2Tank.health,
            power: p2Tank.power,
            color: '#3b82f6' // Clear blue for Player 2
        };
    }

    const diffMultiplier = DIFFICULTIES[difficulty].multiplier;
    const enemyCount = mode === 'VERSUS' ? 0 : mode === 'TEAM' ? 2 : Math.ceil((levelIndex + 2) * diffMultiplier);
    const levelEnemies: GameEntity[] = [];
    for (let i = 0; i < enemyCount; i++) {
        levelEnemies.push({
            id: `e${i}`,
            type: 'ENEMY',
            x: GRID_SIZE * (2 + (i * 3) % 15),
            y: GRID_SIZE * 1,
            width: GRID_SIZE - 4,
            height: GRID_SIZE - 4,
            direction: 'DOWN',
            speed: (1.2 + (levelIndex * 0.15)) * diffMultiplier, 
            health: Math.ceil(2.5 * diffMultiplier),
            maxHealth: Math.ceil(2.5 * diffMultiplier),
            power: Math.ceil(1 * diffMultiplier)
        });
    }

      setGameState({
      player1,
      player2,
      mode,
      enemies: levelEnemies,
      bullets: [],
      walls,
      water,
      bushes,
      powerups: [],
      score: 0,
      pull: 0,
      level: levelIndex + 1,
      status: 'START', // Start with an animation or just PLAYING
    });

    // Set to playing after a small delay or instantly
    setTimeout(() => {
        setGameState(curr => curr ? { ...curr, status: 'PLAYING' } : null);
    }, 100);
  }, [levelIndex, mode, difficulty, p1Tank, p2Tank, p1Color, p2Color]);

  const checkCollision = (rect1: any, rect2: any, padding = 1) => {
    return rect1.x + padding < rect2.x + rect2.width &&
           rect1.x + rect1.width - padding > rect2.x &&
           rect1.y + padding < rect2.y + rect2.height &&
           rect1.y + rect1.height - padding > rect2.y;
  };

  const update = useCallback((time: number) => {
    setGameState(prev => {
      if (!prev || prev.status !== 'PLAYING') return prev;

      let { player1, player2, enemies, bullets, walls, powerups, score } = prev;
      const nextP1 = { ...player1 };
      const nextP2 = player2 ? { ...player2 } : undefined;

      // Power-up Spawning (Every 15 seconds)
      if (time - lastPowerupSpawn.current > 15000) {
        lastPowerupSpawn.current = time;
        const px = Math.random() * (CANVAS_WIDTH - GRID_SIZE);
        const py = Math.random() * (CANVAS_HEIGHT - GRID_SIZE);
        powerups.push({
          id: `p-${time}`,
          type: 'POWERUP',
          x: px,
          y: py,
          width: 30,
          height: 30,
          direction: 'UP',
          speed: 0,
          health: 1,
          maxHealth: 1,
          power: 0,
          powerupType: Math.random() > 0.5 ? 'SHIELD' : 'DOUBLE_SHOT'
        });
      }

      // Player 1 Controls (WASD + Q)
      let p1dx = 0, p1dy = 0;
      if (keysPressed.current['w']) { p1dy = -nextP1.speed; nextP1.direction = 'UP'; }
      else if (keysPressed.current['s']) { p1dy = nextP1.speed; nextP1.direction = 'DOWN'; }
      else if (keysPressed.current['a']) { p1dx = -nextP1.speed; nextP1.direction = 'LEFT'; }
      else if (keysPressed.current['d']) { p1dx = nextP1.speed; nextP1.direction = 'RIGHT'; }

      const p1Collidables = [...walls, ...prev.water, ...enemies, ...(nextP2 ? [nextP2] : [])];
      
      // Separate X and Y movement to allow sliding along walls
      if (p1dx !== 0) {
          nextP1.x += p1dx;
          if (p1Collidables.some(w => checkCollision(nextP1, w)) || nextP1.x < 0 || nextP1.x + nextP1.width > CANVAS_WIDTH) {
              nextP1.x -= p1dx;
          }
      }
      if (p1dy !== 0) {
          nextP1.y += p1dy;
          if (p1Collidables.some(w => checkCollision(nextP1, w)) || nextP1.y < 0 || nextP1.y + nextP1.height > CANVAS_HEIGHT) {
              nextP1.y -= p1dy;
          }
      }

      // Player 2 Controls (Arrows + 1)
      if (nextP2) {
        let p2dx = 0, p2dy = 0;
        if (keysPressed.current['arrowup']) { p2dy = -nextP2.speed; nextP2.direction = 'UP'; }
        else if (keysPressed.current['arrowdown']) { p2dy = nextP2.speed; nextP2.direction = 'DOWN'; }
        else if (keysPressed.current['arrowleft']) { p2dx = -nextP2.speed; nextP2.direction = 'LEFT'; }
        else if (keysPressed.current['arrowright']) { p2dx = nextP2.speed; nextP2.direction = 'RIGHT'; }

        const p2Collidables = [...walls, ...prev.water, ...enemies, nextP1];
        
        if (p2dx !== 0) {
            nextP2.x += p2dx;
            if (p2Collidables.some(w => checkCollision(nextP2, w)) || nextP2.x < 0 || nextP2.x + nextP2.width > CANVAS_WIDTH) {
                nextP2.x -= p2dx;
            }
        }
        if (p2dy !== 0) {
            nextP2.y += p2dy;
            if (p2Collidables.some(w => checkCollision(nextP2, w)) || nextP2.y < 0 || nextP2.y + nextP2.height > CANVAS_HEIGHT) {
                nextP2.y -= p2dy;
            }
        }
      }

      // Bullet Spawning Helper
      const spawnBullet = (tank: GameEntity, ownerId: string) => {
        let bx = tank.x + tank.width / 2 - 4;
        let by = tank.y + tank.height / 2 - 4;
        const offset = tank.width / 2 + 8;
        
        if (tank.direction === 'UP') by -= offset;
        else if (tank.direction === 'DOWN') by += offset;
        else if (tank.direction === 'LEFT') bx -= offset;
        else if (tank.direction === 'RIGHT') bx += offset;

        return {
          id: `${ownerId}-b-${Math.random()}`,
          type: 'BULLET' as const,
          x: bx,
          y: by,
          direction: tank.direction,
          speed: GAME_CONFIG.BULLET_SPEED,
          health: 1,
          maxHealth: 1,
          power: tank.power, // Bullet carries tank's power
          ownerId,
          width: 8,
          height: 8
        };
      };

      // Shooting Logic
      if ((keysPressed.current['q'] || keysPressed.current[' ']) && time - lastShotP1.current > GAME_CONFIG.RELOAD_TIME) {
        lastShotP1.current = time;
        bullets.push(spawnBullet(nextP1, 'player1'));
        if (nextP1.doubleShot) {
            setTimeout(() => {
                setGameState(curr => {
                    if (!curr) return curr;
                    return { ...curr, bullets: [...curr.bullets, spawnBullet(nextP1, 'player1')] };
                });
            }, 100);
        }
      }

      if (nextP2 && (keysPressed.current['1'] || keysPressed.current['numpad1']) && time - lastShotP2.current > GAME_CONFIG.RELOAD_TIME) {
        lastShotP2.current = time;
        bullets.push(spawnBullet(nextP2, 'player2'));
        if (nextP2.doubleShot) {
            setTimeout(() => {
                setGameState(curr => {
                    if (!curr) return curr;
                    return { ...curr, bullets: [...curr.bullets, spawnBullet(nextP2, 'player2')] };
                });
            }, 100);
        }
      }

      // Update Bullets
      const nextBullets = bullets.map(b => {
        const nb = { ...b };
        if (b.direction === 'UP') nb.y -= b.speed;
        else if (b.direction === 'DOWN') nb.y += b.speed;
        else if (b.direction === 'LEFT') nb.x -= b.speed;
        else if (b.direction === 'RIGHT') nb.x += b.speed;
        return nb;
      }).filter(b => b.x > -20 && b.x < CANVAS_WIDTH + 20 && b.y > -20 && b.y < CANVAS_HEIGHT + 20);

      // Collisions
      const remWalls = [...walls];
      const nextEnemies = [...enemies];
      const finalBullets: Bullet[] = [];

      nextBullets.forEach(b => {
        let hit = false;
        // Hit Walls
        for (let i = 0; i < remWalls.length; i++) {
          if (checkCollision(b, remWalls[i])) {
            hit = true;
            if (remWalls[i].type === 'WALL_BRICK') remWalls.splice(i, 1);
            break;
          }
        }
        // Hit Enemies (Don't hit self and don't hit other enemies if bot)
        if (!hit) {
          for (let i = 0; i < nextEnemies.length; i++) {
            // Logic: If bullet is from player, it hits any enemy. 
            // If bullet is from enemy, it only hits players (not self and not other enemies).
            const isEnemyBullet = b.ownerId.startsWith('e');
            const targetIsCurrentEnemy = b.ownerId === nextEnemies[i].id;
            
            if (isEnemyBullet) {
                // Enemy bullets skip all enemies (no friendly fire)
                continue;
            }

            if (checkCollision(b, nextEnemies[i])) {
              hit = true;
              nextEnemies[i].health -= b.power;
              if (nextEnemies[i].health <= 0) {
                  nextEnemies.splice(i, 1);
                  if (b.ownerId.includes('player')) {
                    score += 100;
                    onScoreUpdate(score);
                    onPullUpdate(50000); // Give 50,000 Pull per kill to match "ming" scale
                  }
              }
              break;
            }
          }
        }
        // Hit Players (Don't hit self)
        if (!hit && b.ownerId !== 'player1' && nextP1.health > 0 && checkCollision(b, nextP1)) {
           // Skip friendly fire in TEAM mode
           if (!(mode === 'TEAM' && b.ownerId === 'player2')) {
              hit = true;
              if (nextP1.shield) {
                  nextP1.shield = false;
              } else {
                  nextP1.health -= b.power;
              }
           }
        }
        if (!hit && nextP2 && b.ownerId !== 'player2' && nextP2.health > 0 && checkCollision(b, nextP2)) {
           // Skip friendly fire in TEAM mode
           if (!(mode === 'TEAM' && b.ownerId === 'player1')) {
              hit = true;
              if (nextP2.shield) {
                  nextP2.shield = false;
              } else {
                  nextP2.health -= b.power;
              }
           }
        }
        if (!hit) finalBullets.push(b);
      });

      // Enemy AI
      const finalEnemies = nextEnemies.map(e => {
        const ne = { ...e };
        if (Math.random() < 0.02) {
          const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
          ne.direction = dirs[Math.floor(Math.random() * dirs.length)];
        }
        let ex = 0, ey = 0;
        if (ne.direction === 'UP') ey = -ne.speed;
        else if (ne.direction === 'DOWN') ey = ne.speed;
        else if (ne.direction === 'LEFT') ex = -ne.speed;
        else if (ne.direction === 'RIGHT') ex = ne.speed;
        ne.x += ex; ne.y += ey;

        const eCollidables = [...remWalls, ...prev.water, nextP1, ...(nextP2 ? [nextP2] : []), ...nextEnemies.filter(o => o.id !== e.id)];
        if (eCollidables.some(w => checkCollision(ne, w)) || ne.x < 0 || ne.x + ne.width > CANVAS_WIDTH || ne.y < 0 || ne.y + ne.height > CANVAS_HEIGHT) {
           ne.x -= ex; ne.y -= ey;
           const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
           ne.direction = dirs[Math.floor(Math.random() * dirs.length)];
        }

        if (Math.random() < (0.01 + levelIndex * 0.005)) { // Aggressive firing per level
             finalBullets.push(spawnBullet(ne, ne.id));
        }
        return ne;
      });

      // Power-up Collision
      const remainingPowerups = powerups.filter(p => {
        if (checkCollision(nextP1, p)) {
            if (p.powerupType === 'SHIELD') nextP1.shield = true;
            else nextP1.doubleShot = true;
            return false;
        }
        if (nextP2 && checkCollision(nextP2, p)) {
            if (p.powerupType === 'SHIELD') nextP2.shield = true;
            else nextP2.doubleShot = true;
            return false;
        }
        return true;
      });

      const p1Alive = nextP1.health > 0;
      const p2Alive = nextP2 ? nextP2.health > 0 : false;
      
      let gameStatus: GameState['status'] = 'PLAYING';
      if (mode === 'SINGLE' && !p1Alive) gameStatus = 'GAMEOVER';
      else if (mode === 'VERSUS') {
          if (!p1Alive || !p2Alive) gameStatus = 'VICTORY';
      }
      else if (finalEnemies.length === 0) gameStatus = 'VICTORY';

      if (gameStatus !== 'PLAYING') {
          onGameOver();
          if (gameStatus === 'VICTORY' && mode === 'SINGLE') {
              onLevelWin();
          }
      }

      return {
        ...prev,
        player1: nextP1,
        player2: nextP2,
        enemies: finalEnemies,
        bullets: finalBullets,
        walls: remWalls,
        powerups: remainingPowerups,
        score,
        status: gameStatus
      };
    });
    requestRef.current = requestAnimationFrame(update);
  }, [mode, onScoreUpdate, onGameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        keysPressed.current[k] = true;
        
        // Prevent scrolling for game controls
        if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
            e.preventDefault();
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        keysPressed.current[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !gameState) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    gameState.walls.forEach(w => {
      ctx.fillStyle = w.type === 'WALL_BRICK' ? WALL_COLORS.BRICK : WALL_COLORS.STEEL;
      // Slighly larger visual walls (scale up by index or fixed amount)
      const padding = -2; // Negative padding makes it larger
      ctx.fillRect(w.x + padding, w.y + padding, w.width - padding*2, w.height - padding*2);
      if (w.type === 'WALL_BRICK') {
        ctx.strokeStyle = '#222';
        ctx.strokeRect(w.x + padding, w.y + padding, w.width - padding*2, w.height - padding*2);
      }
    });

    gameState.water.forEach(w => {
      ctx.fillStyle = WALL_COLORS.WATER;
      ctx.fillRect(w.x, w.y, w.width, w.height);
    });

    gameState.bullets.forEach(b => {
      ctx.save();
      ctx.fillStyle = '#fff';
      
      // Glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.ownerId.includes('player') ? '#fff' : '#f00';
      
      // Bullet Shape (Longer in direction of travel)
      ctx.beginPath();
      const hw = b.width / 2;
      const hh = b.height / 2;
      ctx.translate(b.x + hw, b.y + hh);
      const rot = { UP: 0, RIGHT: Math.PI/2, DOWN: Math.PI, LEFT: -Math.PI/2 };
      ctx.rotate(rot[b.direction]);
      
      // Tear drop / Bullet shape
      ctx.moveTo(0, -6);
      ctx.lineTo(3, 2);
      ctx.lineTo(-3, 2);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    });

    const drawTank = (tank: GameEntity, color: string, label: string) => {
      if (tank.health <= 0) return;
      
      const tankColor = tank.id === 'player1' ? p1Tank.color : (tank.id === 'player2' ? p2Tank.color : color);

      // Shield visual
      if (tank.shield) {
        ctx.save();
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(tank.x + tank.width / 2, tank.y + tank.height / 2, tank.width, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(tank.x + tank.width / 2, tank.y + tank.height / 2);
      const rot = { UP: 0, RIGHT: Math.PI/2, DOWN: Math.PI, LEFT: -Math.PI/2 };
      ctx.rotate(rot[tank.direction]);
      
      // Shadow
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';

      // Tracks
      ctx.fillStyle = '#222';
      ctx.fillRect(-tank.width/2 - 2, -tank.height/2, 6, tank.height);
      ctx.fillRect(tank.width/2 - 4, -tank.height/2, 6, tank.height);

      // Body
      ctx.fillStyle = tankColor;
      ctx.fillRect(-tank.width/2 + 2, -tank.height/2, tank.width - 4, tank.height);

      // Detail
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-tank.width/4, -tank.height/3, tank.width/2, tank.height/1.5);

      // Cannon
      ctx.fillStyle = '#333';
      ctx.fillRect(-4, -tank.height/2 - 8, 8, 16);

      // Turret
      ctx.fillStyle = tankColor;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, tank.width/4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.stroke();

      ctx.restore();

      // Nametag
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, tank.x + tank.width/2, tank.y - 12);
      
      // Healthbar
      ctx.fillStyle = '#f00';
      ctx.fillRect(tank.x, tank.y - 8, tank.width, 3);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(tank.x, tank.y - 8, tank.width * (tank.health / tank.maxHealth), 3);
    };

    gameState.enemies.forEach(e => drawTank(e, TANK_COLORS.ENEMY, 'BOT'));
    drawTank(gameState.player1, p1Color, 'P1');
    if (gameState.player2) drawTank(gameState.player2, p2Color, 'P2');

    // Power-ups
    gameState.powerups.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.powerupType === 'SHIELD' ? '#4CAF50' : '#FF9800';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.powerupType === 'SHIELD' ? 'S' : 'D', p.x + p.width/2, p.y + p.height/2 + 5);
        ctx.restore();
    });

    gameState.bushes.forEach(b => {
      ctx.fillStyle = WALL_COLORS.BUSH;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.globalAlpha = 1.0;
    });

  }, [gameState]);

  return (
    <div className="relative overflow-hidden bg-black shadow-2xl scale-90 md:scale-100 origin-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
        style={{
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: '#0a0a25',
          borderRadius: '0px',
          width: '800px',
          height: '600px',
          marginLeft: '0px'
        }}
      />
      
      {gameState?.status === 'GAMEOVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center">
          <h2 className="text-7xl font-black mb-4 text-red-600 tracking-tighter uppercase italic">Mag'lubiyat</h2>
          <p className="text-zinc-400 mb-8 max-w-sm">Shtab: Biz barcha tanklarimizni yo'qotdik. Hujum to'xtatildi.</p>
          <button onClick={() => window.location.reload()} className="px-12 py-4 bg-white text-black font-black uppercase text-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">Yana Urinish</button>
        </div>
      )}

      {gameState?.status === 'VICTORY' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center animate-in fade-in duration-500">
          <div className="mb-6 relative">
              <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20 scale-150 animate-pulse" />
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto relative z-10" />
          </div>
          
          <h2 className="text-8xl font-black mb-2 text-yellow-500 tracking-tighter uppercase italic drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]">
            {gameState.mode === 'VERSUS' ? "BATTLE OVER!" : "G'ALABA!"}
          </h2>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 px-8 py-4 rounded-sm mb-8">
            <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">
              {gameState.mode === 'VERSUS' 
                ? (gameState.player1.health > 0 
                  ? "🏆 G'OLIB: 1-O'YINCHI (YASHIL)" 
                  : "🏆 G'OLIB: 2-O'YINCHI (KO'K)")
                : "Shtab: Missiya bajarildi. Barcha dushmanlar yo'q qilindi."}
            </p>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
            {gameState.mode === 'SINGLE' && (
               <button onClick={onNextLevel} className="w-full py-5 bg-yellow-500 text-black font-black uppercase text-xl hover:bg-yellow-400 transition-all active:scale-95 shadow-[0_10px_30px_rgba(234,179,8,0.3)]">Keyingi Bosqich</button>
            )}
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-zinc-800 text-white font-black uppercase text-sm hover:bg-zinc-700 transition-all tracking-[0.2em]">Asosiy Menyu</button>
          </div>
        </div>
      )}

      {/* Mini HUD Overlay */}
      <div className="absolute top-4 left-4 flex gap-4 pointer-events-none">
          <div className="bg-black/60 border border-white/10 backdrop-blur-sm px-3 py-1 rounded-sm flex flex-col">
             <span className="text-[8px] text-zinc-500 uppercase font-black">Level</span>
             <span className="text-xl font-mono leading-none">{gameState?.level || 1}</span>
          </div>
          <div className="bg-black/60 border border-white/10 backdrop-blur-sm px-3 py-1 rounded-sm flex flex-col">
             <span className="text-[8px] text-zinc-500 uppercase font-black">Dushmanlar</span>
             <span className="text-xl font-mono leading-none text-red-500">{gameState?.enemies.length || 0}</span>
          </div>
      </div>
    </div>
  );
}
