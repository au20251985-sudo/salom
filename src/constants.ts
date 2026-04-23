/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TANK_COLORS = {
  PLAYER: '#4CAF50', // Green
  ENEMY: '#F44336',  // Red
  ENEMY_FAST: '#FFEB3B', // Yellow
  ENEMY_HEAVY: '#795548', // Brown
};

export const WALL_COLORS = {
  BRICK: '#8D6E63',
  STEEL: '#BDBDBD',
  BUSH: '#2E7D32',
  WATER: '#0277BD',
};

export const DIFFICULTIES = {
  EASY: { label: 'Osson', multiplier: 0.7, color: '#4CAF50' },
  NORMAL: { label: 'O\'rtacha', multiplier: 1.0, color: '#FFEB3B' },
  HARD: { label: 'Qiyin', multiplier: 1.5, color: '#F44336' },
};

export const AVAILABLE_COLORS = [
  { id: 'green', name: 'Yashil Kamuflyaj', color: '#4CAF50', cost: 650000 },
  { id: 'blue', name: 'Moviy Okean', color: '#2196F3', cost: 300000 },
  { id: 'desert', name: 'Sahro Sariq', color: '#FFC107', cost: 500000 },
  { id: 'navy', name: 'To\'q Ko\'k', color: '#1A237E', cost: 800000 },
  { id: 'lava', name: 'Lava Qizil', color: '#D50000', cost: 1200000 },
  { id: 'purple', name: 'Siyohrang', color: '#9C27B0', cost: 1500000 },
  { id: 'gold', name: 'Oltin Zirh', color: '#FFD700', cost: 5000000 },
];

export const TANK_MODELS = [
  { id: 'basic', name: 'Standart T-34', cost: 0, health: 8, speed: 2.5, power: 1, color: '#4CAF50', description: 'Boshlang\'ich - muvozanatli tank.' },
  { id: 'scout', name: 'Leopard Pro', cost: 250000, health: 12, speed: 3.5, power: 1.5, color: '#8BC34A', description: 'Tezkor va kuchliroq manyovrlar uchun.' },
  { id: 'heavy', name: 'Tiger Elite', cost: 750000, health: 25, speed: 4.2, power: 2, color: '#388E3C', description: 'Zirhi va hujum kuchi 2 baravar oshirilgan.' },
  { id: 'predator', name: 'Predator X', cost: 1800000, health: 35, speed: 4.5, power: 3, color: '#2E7D32', description: '3 baravar kuchli va o\'ta chidamli.' },
  { id: 'titan', name: 'Titan M1 Ultra', cost: 3000000, health: 50, speed: 5.0, power: 5, color: '#1B5E20', description: 'Shturm tanki. 5 baravar vayronkor kuch.' },
  { id: 'obliterators', name: 'Obliterator 9000', cost: 5000000, health: 80, speed: 5.5, power: 8, color: '#0A3D0C', description: 'Dahshatli kuch. 8 baravar zarar yetkazadi.' },
  { id: 'supernova', name: 'Supernova S1', cost: 10000000, health: 150, speed: 6.5, power: 20, color: '#004D40', description: 'O\'yinning eng kuchli tanki. 20 baravar o\'lim kuchi.' },
];

export const GAME_CONFIG = {
  TANK_SPEED: 2.5,
  BULLET_SPEED: 6,
  RELOAD_TIME: 500, // ms
  LEVELS: [
    { enemies: 3, speed: 1 },
    { enemies: 5, speed: 1.2 },
    { enemies: 8, speed: 1.5 },
  ]
};
