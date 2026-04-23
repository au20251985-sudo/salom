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
  const miniMapRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const requestRef = useRef<number>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });
  const lastShotP1 = useRef<number>(0);
  const lastShotP2 = useRef<number>(0);
  const lastPowerupSpawn = useRef<number>(0);

  const lastPullUpdateScore = useRef<number>(0);

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
          angle: 0,
          turretAngle: 0,
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
      angle: 0,
      turretAngle: 0,
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
            angle: mode === 'VERSUS' ? Math.PI : 0,
            turretAngle: mode === 'VERSUS' ? Math.PI : 0,
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
            angle: Math.PI,
            turretAngle: Math.PI,
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

  const checkCollision = (rect1: any, rect2: any, padding = 4) => {
    return rect1.x + padding < rect2.x + rect2.width &&
           rect1.x + rect1.width - padding > rect2.x &&
           rect1.y + padding < rect2.y + rect2.height &&
           rect1.y + rect1.height - padding > rect2.y;
  };

  const update = useCallback((time: number) => {
    setGameState(prev => {
      if (!prev || prev.status !== 'PLAYING') return prev;

      let { player1, player2, enemies, bullets, walls, water, powerups, score } = prev;
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

      // Player 1 Aiming (Mouse)
      const p1cx = nextP1.x + nextP1.width / 2;
      const p1cy = nextP1.y + nextP1.height / 2;
      nextP1.turretAngle = Math.atan2(mousePos.current.x - p1cx, -(mousePos.current.y - p1cy));

      // Player 1 Controls (WASD)
      let p1moveX = 0, p1moveY = 0;
      if (keysPressed.current['w']) p1moveY -= 1;
      if (keysPressed.current['s']) p1moveY += 1;
      if (keysPressed.current['a']) p1moveX -= 1;
      if (keysPressed.current['d']) p1moveX += 1;

      let p1dx = 0, p1dy = 0;
      if (p1moveX !== 0 || p1moveY !== 0) {
          const mag = Math.sqrt(p1moveX * p1moveX + p1moveY * p1moveY);
          p1dx = (p1moveX / mag) * nextP1.speed;
          p1dy = (p1moveY / mag) * nextP1.speed;
          nextP1.angle = Math.atan2(p1moveX, -p1moveY);
          
          // Legacy direction for some parts that might still use it
          if (Math.abs(p1moveX) > Math.abs(p1moveY)) {
              nextP1.direction = p1moveX > 0 ? 'RIGHT' : 'LEFT';
          } else {
              nextP1.direction = p1moveY > 0 ? 'DOWN' : 'UP';
          }
      }

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
        let p2moveX = 0, p2moveY = 0;
        if (keysPressed.current['arrowup']) p2moveY -= 1;
        if (keysPressed.current['arrowdown']) p2moveY += 1;
        if (keysPressed.current['arrowleft']) p2moveX -= 1;
        if (keysPressed.current['arrowright']) p2moveX += 1;

        let p2dx = 0, p2dy = 0;
        if (p2moveX !== 0 || p2moveY !== 0) {
            const mag = Math.sqrt(p2moveX * p2moveX + p2moveY * p2moveY);
            p2dx = (p2moveX / mag) * nextP2.speed;
            p2dy = (p2moveY / mag) * nextP2.speed;
            nextP2.angle = Math.atan2(p2moveX, -p2moveY);
            nextP2.turretAngle = nextP2.angle; // Non-mouse player turret follows body
            
            if (Math.abs(p2moveX) > Math.abs(p2moveY)) {
                nextP2.direction = p2moveX > 0 ? 'RIGHT' : 'LEFT';
            } else {
                nextP2.direction = p2moveY > 0 ? 'DOWN' : 'UP';
            }
        }

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
        
        bx += Math.sin(tank.turretAngle) * offset;
        by -= Math.cos(tank.turretAngle) * offset;

        return {
          id: `${ownerId}-b-${Math.random()}`,
          type: 'BULLET' as const,
          x: bx,
          y: by,
          direction: tank.direction,
          angle: tank.turretAngle,
          turretAngle: tank.turretAngle,
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
        nb.x += Math.sin(b.angle) * b.speed;
        nb.y -= Math.cos(b.angle) * b.speed;
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
                    // Move callback out of here
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
        const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const eCollidables = [...remWalls, ...water, nextP1, ...(nextP2 ? [nextP2] : []), ...nextEnemies.filter(o => o.id !== e.id)];
        
        let ex = 0, ey = 0;
        if (ne.direction === 'UP') ey = -ne.speed;
        else if (ne.direction === 'DOWN') ey = ne.speed;
        else if (ne.direction === 'LEFT') ex = -ne.speed;
        else if (ne.direction === 'RIGHT') ex = ne.speed;
        
        ne.x += ex; ne.y += ey;

        const hasCollision = eCollidables.some(w => checkCollision(ne, w)) || 
                           ne.x < 0 || ne.x + ne.width > CANVAS_WIDTH || 
                           ne.y < 0 || ne.y + ne.height > CANVAS_HEIGHT;

        if (hasCollision || Math.random() < 0.01) { // Change direction on collision or randomly
           ne.x -= ex; ne.y -= ey;
           
           // Shuffling directions to add some variety
           const shuffledDirs = [...dirs].sort(() => Math.random() - 0.5);
           let foundPath = false;
           
           for (const dir of shuffledDirs) {
               let tx = 0, ty = 0;
               if (dir === 'UP') ty = -ne.speed;
               else if (dir === 'DOWN') ty = ne.speed;
               else if (dir === 'LEFT') tx = -ne.speed;
               else if (dir === 'RIGHT') tx = ne.speed;
               
               const testPos = { ...ne, x: ne.x + tx, y: ne.y + ty };
               if (!eCollidables.some(w => checkCollision(testPos, w)) && 
                   testPos.x >= 0 && testPos.x + testPos.width <= CANVAS_WIDTH && 
                   testPos.y >= 0 && testPos.y + testPos.height <= CANVAS_HEIGHT) {
                   ne.direction = dir;
                   const angleMap = { UP: 0, RIGHT: Math.PI/2, DOWN: Math.PI, LEFT: -Math.PI/2 };
                   ne.angle = angleMap[dir];
                   ne.turretAngle = ne.angle;
                   foundPath = true;
                   break;
               }
           }
           
           // If no clear path found, just pick any direction to avoid freezing
           if (!foundPath) {
               ne.direction = dirs[Math.floor(Math.random() * dirs.length)];
               const angleMap = { UP: 0, RIGHT: Math.PI/2, DOWN: Math.PI, LEFT: -Math.PI/2 };
               ne.angle = angleMap[ne.direction];
               ne.turretAngle = ne.angle;
           }
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
          // Callbacks moved to useEffect
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

  // Handle side effects of internal game state changes
  useEffect(() => {
    if (!gameState) {
        lastPullUpdateScore.current = 0;
        return;
    }

    // Track score updates
    onScoreUpdate(gameState.score);
    
    // Trigger pull updates based on score increases (kills)
    if (gameState.score > lastPullUpdateScore.current) {
        const killCount = (gameState.score - lastPullUpdateScore.current) / 100;
        if (killCount > 0) {
            onPullUpdate(killCount * 50000);
            lastPullUpdateScore.current = gameState.score;
        }
    }

    if (gameState.status === 'GAMEOVER') {
        onGameOver();
    } else if (gameState.status === 'VICTORY') {
        if (gameState.mode === 'SINGLE') {
            onLevelWin();
        }
    }
  }, [gameState?.status, gameState?.score]);

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

    const handleMouseMove = (e: MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        mousePos.current = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
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
      ctx.rotate(b.angle);
      
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
      
      // --- Draw Body ---
      ctx.save();
      ctx.rotate(tank.angle);
      
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
      ctx.restore();

      // --- Draw Turret & Cannon ---
      ctx.save();
      ctx.rotate(tank.turretAngle);

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

    // --- MINI-MAP RENDERING ---
    if (miniMapRef.current) {
      const mCtx = miniMapRef.current.getContext('2d');
      if (mCtx) {
        const mmWidth = 160;
        const mmHeight = 120;
        const scale = mmWidth / CANVAS_WIDTH;

        mCtx.clearRect(0, 0, mmWidth, mmHeight);
        mCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        mCtx.fillRect(0, 0, mmWidth, mmHeight);

        // Draw Walls
        mCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        gameState.walls.forEach(w => {
           mCtx.fillRect(w.x * scale, w.y * scale, w.width * scale, w.height * scale);
        });

        // Draw Water
        mCtx.fillStyle = '#0277BD55';
        gameState.water.forEach(w => {
           mCtx.fillRect(w.x * scale, w.y * scale, w.width * scale, w.height * scale);
        });

        // Draw Player 1
        mCtx.fillStyle = p1Color;
        mCtx.beginPath();
        mCtx.arc(gameState.player1.x * scale + (gameState.player1.width/2 * scale), 
                 gameState.player1.y * scale + (gameState.player1.height/2 * scale), 
                 3, 0, Math.PI * 2);
        mCtx.fill();

        // Draw Player 2
        if (gameState.player2 && gameState.player2.health > 0) {
            mCtx.fillStyle = p2Color;
            mCtx.beginPath();
            mCtx.arc(gameState.player2.x * scale + (gameState.player2.width/2 * scale), 
                     gameState.player2.y * scale + (gameState.player2.height/2 * scale), 
                     3, 0, Math.PI * 2);
            mCtx.fill();
        }

        // Draw Enemies
        mCtx.fillStyle = '#f00';
        gameState.enemies.forEach(e => {
            mCtx.beginPath();
            mCtx.arc(e.x * scale + (e.width/2 * scale), 
                     e.y * scale + (e.height/2 * scale), 
                     2, 0, Math.PI * 2);
            mCtx.fill();
        });
      }
    }

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

      {/* Mini-Map Overlay */}
      <div className="absolute top-4 right-4 group">
          <div className="bg-black/60 border border-white/10 backdrop-blur-sm p-1 rounded-sm overflow-hidden shadow-2xl">
              <canvas 
                ref={miniMapRef}
                width={160}
                height={120}
                className="block opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <div className="mt-1 flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Tactical Map</span>
                  <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,44,44,0.5)]" />
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
