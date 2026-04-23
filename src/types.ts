/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export type EntityType = 'PLAYER' | 'ENEMY' | 'BULLET' | 'WALL_BRICK' | 'WALL_STEEL' | 'BUSH' | 'WATER' | 'POWERUP';

export interface GameEntity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  angle: number; // In radians
  turretAngle: number; // In radians
  speed: number;
  health: number;
  maxHealth: number;
  power: number;
  color?: string;
  shield?: boolean;
  doubleShot?: boolean;
  powerupType?: 'SHIELD' | 'DOUBLE_SHOT';
  // AI related
  aiType?: 'STALKER' | 'SNIPER' | 'BOMBER';
  lastPathUpdate?: number;
  path?: Point[];
}

export interface Bullet extends GameEntity {
  ownerId: string;
}

export interface TankModel {
  id: string;
  name: string;
  cost: number;
  health: number;
  speed: number;
  power: number;
  color: string;
  description: string;
}

export interface GameState {
  player1: GameEntity;
  player2?: GameEntity;
  mode: 'SINGLE' | 'VERSUS' | 'TEAM';
  enemies: GameEntity[];
  bullets: Bullet[];
  walls: GameEntity[];
  bushes: GameEntity[];
  water: GameEntity[];
  powerups: GameEntity[];
  score: number;
  pull: number;
  level: number;
  status: 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';
}

export const GRID_SIZE = 40;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
