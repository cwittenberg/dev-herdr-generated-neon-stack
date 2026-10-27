export const shapes = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
];

export class Tetris {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: 20 }, () => Array(10).fill(0));
    this.queue = [];
    this.held = 0;
    this.usedHold = false;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.locked = 0;
    this.over = false;
    this.combo = -1;
    this.spawn();
  }

  refill() {
    while (this.queue.length < 7) {
      const bag = [1, 2, 3, 4, 5, 6, 7];
      for (let index = 6; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [bag[index], bag[other]] = [bag[other], bag[index]];
      }
      this.queue.push(...bag);
    }
  }

  spawn(type) {
    this.refill();
    const selected = type || this.queue.shift();
    this.active = {
      type: selected,
      matrix: shapes[selected].map((row) => [...row]),
      x: 3,
      y: 0,
      rotation: 0,
    };
    this.fall = 0;
    this.lockDelay = 0;
    this.resets = 0;
    this.refill();
    if (!this.valid()) this.over = true;
  }

  cells(piece = this.active, y = piece.y) {
    const cells = [];
    piece.matrix.forEach((row, rowIndex) =>
      row.forEach((cell, column) => {
        if (cell) cells.push([piece.x + column, y + rowIndex]);
      }),
    );
    return cells;
  }

  valid(piece = this.active) {
    return this.cells(piece).every(
      ([column, row]) =>
        column >= 0 && column < 10 && row < 20 && (row < 0 || !this.board[row][column]),
    );
  }

  move(amount) {
    if (this.over) return false;
    const candidate = { ...this.active, x: this.active.x + amount };
    if (!this.valid(candidate)) return false;
    this.active = candidate;
    this.resetLock();
    return true;
  }

  resetLock() {
    if (this.resets < 15) {
      this.lockDelay = 0;
      this.resets++;
    }
  }

  rotate(direction) {
    if (this.over) return false;
    const source = this.active.matrix;
    const matrix = source.map((row, rowIndex) =>
      row.map((cell, column) =>
        direction > 0
          ? source[source.length - 1 - column][rowIndex]
          : source[column][source.length - 1 - rowIndex],
      ),
    );
    for (const [offsetX, offsetY] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1],
      [0, -2],
    ]) {
      const candidate = {
        ...this.active,
        matrix,
        x: this.active.x + offsetX,
        y: this.active.y + offsetY,
        rotation: (this.active.rotation + direction + 4) % 4,
      };
      if (this.valid(candidate)) {
        this.active = candidate;
        this.resetLock();
        return true;
      }
    }
    return false;
  }

  ghostY() {
    let row = this.active.y;
    while (this.valid({ ...this.active, y: row + 1 })) row++;
    return row;
  }

  drop() {
    if (this.over) return false;
    const destination = this.ghostY();
    this.score += (destination - this.active.y) * 2;
    this.active.y = destination;
    this.lock();
    return true;
  }

  hold() {
    if (this.usedHold || this.over) return false;
    const previous = this.held;
    this.held = this.active.type;
    this.spawn(previous);
    this.usedHold = true;
    return true;
  }

  lock() {
    for (const [column, row] of this.cells()) {
      if (row < 0) {
        this.over = true;
        return;
      }
      this.board[row][column] = this.active.type;
    }
    const remaining = this.board.filter((row) => row.some((cell) => !cell));
    const cleared = 20 - remaining.length;
    while (remaining.length < 20) remaining.unshift(Array(10).fill(0));
    this.board = remaining;
    if (cleared) {
      this.combo++;
      this.score += ([0, 100, 300, 500, 800][cleared] + this.combo * 50) * this.level;
      this.lines += cleared;
      this.level = 1 + Math.floor(this.lines / 10);
    } else this.combo = -1;
    this.locked++;
    this.usedHold = false;
    this.spawn();
  }

  tick(delta) {
    if (this.over) return;
    this.fall += delta;
    const interval = Math.max(0.06, 0.8 * Math.pow(0.8, this.level - 1));
    while (this.fall >= interval) {
      this.fall -= interval;
      if (this.valid({ ...this.active, y: this.active.y + 1 })) {
        this.active.y++;
        this.lockDelay = 0;
      }
    }
    if (!this.valid({ ...this.active, y: this.active.y + 1 })) {
      this.lockDelay += delta;
      if (this.lockDelay >= 0.5) this.lock();
    }
  }

  inspect() {
    return {
      activeX: this.active.x,
      activeY: this.active.y,
      rotation: this.active.rotation,
      type: this.active.type,
      score: this.score,
      lines: this.lines,
      level: this.level,
      locked: this.locked,
      held: this.held,
      usedHold: this.usedHold,
      over: this.over,
      occupied: this.board.flat().filter(Boolean).length,
    };
  }
}
