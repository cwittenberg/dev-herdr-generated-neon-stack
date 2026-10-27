import {
  defineApp,
  createGameView,
  GameHUD,
  drawGameText,
  drawGame2DPanel,
  loadGameAtlas,
  CommandRegistry,
  AppCapabilityRegistry,
} from '@ricewm/app';
import { Tetris, shapes } from './model.mjs';

export default defineApp({
  async start({ app, bus, services, createWindow }) {
    const model = new Tetris();
    let view;
    let art;
    let help = false;
    let repeat = 0;
    let direction = 0;
    const colors = [
      0, 0xfff0de43, 0xff65d3f6, 0xffff85ba, 0xff9cdf61, 0xff9378ff, 0xffff8f69, 0xff62adff,
    ];
    const hud = new GameHUD({ theme: { accent: 0xfff0de43 }, drawText: drawGameText });
    const run = (operation) => {
      if (!view.playing || model.over || help) return false;
      const result = operation();
      if (model.over) view.pause();
      view.refresh();
      return result !== false;
    };
    const commands = new CommandRegistry([
      { id: 'drop', label: 'Instant drop', run: () => run(() => model.drop()) },
      {
        id: 'restart',
        label: 'New game',
        run: () => {
          view.restart();
          return true;
        },
      },
      { id: 'hold', label: 'Hold', run: () => run(() => model.hold()) },
    ]);
    const block = (
      scene,
      column,
      row,
      type,
      size = 16,
      originX = 207,
      originY = 20,
      ghost = false,
    ) => {
      const bounds = [originX + column * size + 1, originY + row * size + 1, size - 2, size - 2];
      if (ghost) {
        scene.rect(bounds, 0xffffffff);
        scene.rect([bounds[0] + 2, bounds[1] + 2, size - 6, size - 6], 0xff5a4430);
      } else {
        scene.rect(bounds, colors[type]);
        scene.rect([bounds[0] + 2, bounds[1] + 2, size - 6, 2], 0x66ffffff);
      }
    };
    const preview = (scene, type, x, y) => {
      if (!type) return;
      shapes[type].forEach((row, rowIndex) =>
        row.forEach((cell, column) => {
          if (cell) block(scene, column, rowIndex, type, 12, x, y);
        }),
      );
    };
    const label = (scene, text, x, y, size = 12, color = 0xfff7ede7) =>
      drawGameText(scene, text, { x, y, size, color, maxWidth: 180 });
    const button = (id, text, rect, activate, enabled = true) =>
      hud.set(id, { type: 'button', text, rect, activate, enabled });
    view = createGameView({
      createWindow,
      hud,
      instructions:
        'Left/Right or A/D move. Up/W rotates. Z reverses. Down/S/Space instantly drops and locks. C holds. P/Escape pauses. R restarts. N steps. H help.',
      continuous: true,
      pointer: ({ button }) => {
        if (button !== 1 || view.playing || model.over) return;
        help = false;
        view.play();
        view.refresh();
      },
      commandKeys: { help: null },
      actions: [
        { name: 'left', text: 'Left', keys: [113, 38], run: () => run(() => model.move(-1)) },
        { name: 'right', text: 'Right', keys: [114, 40], run: () => run(() => model.move(1)) },
        { name: 'rotate', text: 'Rotate', keys: [111, 25], run: () => run(() => model.rotate(1)) },
        { name: 'reverse', text: 'Reverse', keys: [52], run: () => run(() => model.rotate(-1)) },
        { name: 'drop', text: 'Drop', keys: [116, 39, 65], run: () => commands.execute('drop') },
        { name: 'hold', text: 'Hold', keys: [54], run: () => commands.execute('hold') },
        {
          name: 'help',
          text: 'Help',
          keys: [43],
          run: () => {
            help = !help;
            view.pause();
            view.refresh();
          },
        },
      ],
      reset: () => {
        model.reset();
        help = false;
        direction = 0;
        repeat = 0;
      },
      inspectState: () => ({
        ...model.inspect(),
        help,
        playing: !!view?.playing,
        ghostY: model.ghostY(),
        ghostCells: model.cells(model.active, model.ghostY()),
        artworkLoaded: !!art,
      }),
      update: (delta, { input }) => {
        if (help || model.over) return;
        const nextDirection = input.axis('left', 'right');
        if (nextDirection !== direction) {
          direction = nextDirection;
          repeat = 0;
        }
        if (direction) {
          repeat += delta;
          if (repeat > 0.16) {
            model.move(direction);
            repeat -= 0.045;
          }
        }
        model.tick(delta);
        if (model.over) view.pause();
      },
      layoutHud: () => {
        button(
          'play',
          view?.playing ? 'Pause' : 'Play',
          [395, 220, 108, 30],
          () => {
            help = false;
            if (!model.over) {
              if (view.playing) view.pause();
              else view.play();
            }
            view.refresh();
          },
          !model.over,
        );
        button('restart', 'New game', [395, 258, 108, 30], () => commands.execute('restart'));
        button('help', help ? 'Close help' : 'Help', [395, 296, 108, 30], () => {
          help = !help;
          view.pause();
          view.refresh();
        });
        button(
          'hold',
          'Hold · C',
          [71, 110, 108, 30],
          () => commands.execute('hold'),
          !!view?.playing && !model.usedHold,
        );
        button(
          'drop',
          'Drop · Down',
          [71, 296, 108, 30],
          () => commands.execute('drop'),
          !!view?.playing && !model.over,
        );
      },
      render: (scene) => {
        scene.rect([0, 0, 640, 360], 0xff20100b);
        if (art) {
          const scale = Math.max(640 / 768, 360 / 512);
          art.draw(scene, 40, 'background', {
            x: (640 - 768 * scale) / 2,
            y: (360 - 512 * scale) / 2,
            scale,
            opacity: 0.85,
          });
        }
        drawGame2DPanel(scene, [55, 14, 135, 332], {
          fill: 0xdd24140b,
          border: 0xff8a7453,
          radius: 8,
          id: 103,
        });
        drawGame2DPanel(scene, [383, 14, 132, 332], {
          fill: 0xdd24140b,
          border: 0xff8a7453,
          radius: 8,
          id: 104,
        });
        drawGame2DPanel(scene, [201, 14, 172, 332], {
          fill: 0xff24140b,
          border: 0xff8a7453,
          radius: 6,
          id: 100,
        });
        for (let row = 0; row < 20; row++) {
          for (let column = 0; column < 10; column++) {
            scene.rect([207 + column * 16, 20 + row * 16, 15, 15], 0xff382217);
            if (model.board[row][column]) block(scene, column, row, model.board[row][column]);
          }
        }
        if (!model.over) {
          model.cells(model.active, model.ghostY()).forEach(([column, row]) => {
            if (row >= 0) block(scene, column, row, model.active.type, 16, 207, 20, true);
          });
          model.cells().forEach(([column, row]) => {
            if (row >= 0) block(scene, column, row, model.active.type);
          });
        }
        label(scene, 'HOLD', 71, 28, 12, 0xffc5a892);
        preview(scene, model.held, 94, 61);
        if (!help) {
          label(scene, 'SCORE', 71, 165, 12, 0xffc5a892);
          label(scene, String(model.score), 71, 185, 25);
          label(scene, `Level ${model.level}`, 71, 235, 15);
          label(scene, `${model.lines} lines`, 71, 261, 14);
        }
        label(scene, 'NEXT', 395, 28, 12, 0xffc5a892);
        model.queue
          .slice(0, 4)
          .forEach((type, index) => preview(scene, type, 417, 57 + index * 38));
        if (!view?.playing || model.over || help) {
          drawGame2DPanel(scene, [215, 125, 144, 100], {
            fill: 0xf5321c10,
            border: 0xffaa8d70,
            radius: 8,
            id: 101,
          });
          label(scene, model.over ? 'Game over' : help ? 'Controls' : 'Paused', 229, 145, 20);
          label(
            scene,
            model.over ? 'New game to retry' : help ? 'Arrows move / rotate' : 'Click to play · P',
            229,
            179,
            10,
          );
          label(scene, help ? 'Down: instant drop' : 'H for controls', 229, 198, 10);
        }
        if (help) {
          drawGame2DPanel(scene, [55, 146, 135, 140], {
            fill: 0xff321c10,
            border: 0xff8a7453,
            radius: 8,
            id: 102,
          });
          [
            'A/D: move',
            'W/Up: rotate',
            'Z: reverse',
            'C: hold',
            'Space/Down: drop',
            'R: new game',
            'N: single step',
          ].forEach((text, index) => label(scene, text, 65, 158 + index * 17, 10));
        }
      },
    });
    loadGameAtlas({
      services,
      path: 'assets/arcade-art.png',
      maximumWidth: 768,
      maximumHeight: 512,
      maximumPixels: 393216,
      frames: {
        background: { x: 0, y: 0, width: 768, height: 512, pivotX: 0, pivotY: 0 },
      },
    })
      .then((atlas) => {
        art = atlas;
        view.refresh();
      })
      .catch((error) => view.setStatus(`Artwork: ${error.message}`));
    const registry = new AppCapabilityRegistry({ app, bus, services });
    await registry.bind({
      window: view.window,
      context: async () => ({ revision: model.locked, ready: true, document: model.inspect() }),
      commands,
      bindings: { hardDrop: 'drop', newGame: 'restart' },
      onAction: () => {
        help = true;
        view.pause();
        view.refresh();
      },
    });
    return view.window;
  },
});
