/**
 * Level Layouts & Custom Level Serialization
 * Grid dimensions: 8 rows x 11 columns
 * Brick Legend:
 *  0 = Empty space
 *  1 = Standard Neon Brick (1 HP)
 *  2 = Armored Brick (2 HP)
 *  3 = Heavy Reactor Brick (3 HP)
 *  4 = Explosive TNT Brick (Detonates adjacent bricks)
 *  9 = Indestructible Steel Barrier
 */

export const GRID_ROWS = 8;
export const GRID_COLS = 11;

export const LEVELS = [
  {
    name: '1. Classic Neon',
    subtitle: 'Warm-up Stage — Chain your combos!',
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 2, 2, 2, 4, 2, 2, 2, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 4, 1, 1, 1, 4, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    name: '2. Twin Citadels',
    subtitle: 'Break through the armored towers and TNT cores',
    grid: [
      [3, 3, 2, 2, 0, 0, 0, 2, 2, 3, 3],
      [3, 4, 4, 2, 0, 1, 0, 2, 4, 4, 3],
      [2, 4, 4, 2, 0, 1, 0, 2, 4, 4, 2],
      [2, 2, 2, 2, 0, 4, 0, 2, 2, 2, 2],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 9, 9, 0, 0, 0, 0, 0, 9, 9, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    name: '3. Chain Reaction',
    subtitle: 'Aim for the red TNT bricks to trigger massive blasts',
    grid: [
      [2, 2, 4, 2, 2, 4, 2, 2, 4, 2, 2],
      [2, 4, 3, 4, 2, 4, 2, 4, 3, 4, 2],
      [4, 3, 4, 3, 4, 4, 4, 3, 4, 3, 4],
      [2, 4, 3, 4, 2, 4, 2, 4, 3, 4, 2],
      [1, 1, 4, 1, 1, 4, 1, 1, 4, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    name: '4. Cyber Invader',
    subtitle: 'Defeat the arcade space invader formation',
    grid: [
      [0, 0, 3, 0, 0, 0, 0, 0, 3, 0, 0],
      [0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0],
      [0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
      [0, 2, 2, 4, 2, 2, 2, 4, 2, 2, 0],
      [2, 2, 2, 2, 2, 4, 2, 2, 2, 2, 2],
      [2, 0, 2, 2, 2, 2, 2, 2, 2, 0, 2],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0],
    ],
  },
  {
    name: '5. Core Reactor',
    subtitle: 'Navigate past steel shields to shatter the inner core',
    grid: [
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [3, 9, 9, 2, 4, 4, 4, 2, 9, 9, 3],
      [2, 9, 4, 4, 3, 4, 3, 4, 4, 9, 2],
      [2, 2, 4, 3, 4, 4, 4, 3, 4, 2, 2],
      [1, 9, 9, 2, 2, 4, 2, 2, 9, 9, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 9, 0, 0, 0, 0, 0, 9, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
];

const CUSTOM_LEVEL_KEY = 'neon_breakout_custom_level';

export function loadCustomGrid() {
  try {
    const saved = localStorage.getItem(CUSTOM_LEVEL_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Ignore storage errors
  }
  // Default starter template for the level editor
  return [
    [1, 2, 3, 2, 1, 4, 1, 2, 3, 2, 1],
    [1, 1, 2, 1, 4, 3, 4, 1, 2, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
}

export function saveCustomGrid(grid) {
  try {
    localStorage.setItem(CUSTOM_LEVEL_KEY, JSON.stringify(grid));
  } catch (e) {
    // Ignore storage errors
  }
}
