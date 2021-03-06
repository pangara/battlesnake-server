import { loadImage } from "./images";
import { add, sub, uniq } from "./point";
import * as P from "./point";

const gutter = 0.1;
const unit = 1 - gutter * 2;
const halfUnit = unit / 2;
const offset = unit / 2 * -1;
const padding = 2;
const coordCache: WeakMap<Snake, Array<Point>> = new WeakMap();

function coords(snake: Snake): Point[] {
  const coords = coordCache.get(snake);

  if (coords) {
    return coords;
  }

  const arr = uniq(snake.coords);

  coordCache.set(snake, arr);

  return arr;
}

function clear(ctx: Ctx) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
}

function drawFood(layer: Ctx, [x, y]: Food) {
  layer.beginPath();
  layer.arc(x, y, halfUnit, 0, 2 * Math.PI);
  layer.fill();
}

function drawGrid(layer: Ctx, width: number, height: number) {
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      layer.fillRect(i + gutter, j + gutter, unit, unit);
    }
  }
}

function setCoordinateSystem(layer: Ctx, world: Board): void {
  // Adjust coordinate system if the window has been resized
  // since the last draw.
  const clientWidth = layer.canvas.width;
  const clientHeight = layer.canvas.height;
  const width = world.width + padding * 2;
  const height = world.height + padding * 2;

  const h = clientHeight / height;
  const w = clientWidth / width;
  const sign = clientWidth / clientHeight > width / height;
  const scaler = sign ? h : w;

  const xT = sign ? (clientWidth - h * width) / 2 : 0;
  const yT = sign ? 0 : (clientHeight - w * height) / 2;

  // Scale the world and set the coordinate system so that 1
  // unit corresponds to a single tile and the world is
  // centered.
  layer.translate(xT, yT);
  layer.scale(scaler, scaler);
  layer.translate(padding / 2, padding / 2);
}

/**
 * Save the transform, apply a function, and restore the transform.
 */
function within<T>(ctx: Ctx, fn: ((...x: any[]) => T)): T {
  ctx.save();
  const result = fn();
  ctx.restore();
  return result;
}

function drawSnakeBody(layer: Ctx, snake: Snake, prepare?: Function) {
  const points = P.shrink(P.smooth(snake.coords), 0.12);

  within(layer, () => {
    prepare && prepare();

    layer.translate(0.5, 0.5);

    layer.strokeStyle = snake.color;

    layer.lineWidth = unit;

    layer.lineJoin = "round";

    layer.beginPath();

    layer.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i += 1) {
      const x0 = points[i];
      layer.lineTo(x0[0], x0[1]);
    }

    layer.stroke();
  });
}

function headImgId(snake: Snake): string {
  return `snake-head-${snake.headType}`;
}

function tailImgId(snake: Snake): string {
  return `snake-tail-${snake.tailType}`;
}

function drawImage(
  layer: Ctx,
  image: Image,
  h0: Point,
  h1: Point,
  prepare?: Function
) {
  const v = sub(h0, h1);

  let a = add([0.5, 0.5], h0);

  within(layer, () => {
    prepare && prepare();

    layer.translate(a[0], a[1]);

    switch (v.join(" ")) {
      case "0 -1":
        layer.rotate(-Math.PI / 2);
        break;

      case "0 1":
        layer.rotate(Math.PI / 2);
        break;

      case "-1 0":
        layer.scale(-1, 1);
        break;
    }

    layer.drawImage(image, offset, offset, unit, unit);
  });
}

async function drawSnake(
  layer: Ctx,
  head: Promise<Image>,
  tail: Promise<Image>,
  snake: Snake,
  prepare?: Function
): Promise<null> {
  const coordinates = coords(snake);

  const [h0, h1] = coordinates;
  const [t1, t0] = coordinates.slice(-2);

  const headImg = await head;
  const tailImg = await tail;

  drawSnakeBody(layer, snake, prepare);

  drawImage(layer, headImg, h0, h1 || h0, prepare);

  if (coordinates.length > 1) {
    drawImage(layer, tailImg, t0 || t1, t1, prepare);
  }

  return null;
}

interface Layers {
  fg: Ctx;
  grid: Ctx;
}

export class GameBoard {
  private readonly layers: Layers;
  private readonly canvasses: HTMLCanvasElement[];
  private readonly images = new Map();
  private readonly colorPallet: Map<string, string>;
  private worldId: string;

  constructor(node: HTMLElement, colorPallet: Map<string, string>) {
    this.canvasses = [];

    const layer = () => {
      const canvas = document.createElement("canvas");
      const ctx = (canvas.getContext("2d") as any) as Ctx;
      canvas.classList.add("gameboard-canvas");
      this.canvasses.push(canvas);
      return ctx;
    };

    this.layers = {
      fg: layer(),
      grid: layer()
    };

    Object.values(this.layers)
      .reverse()
      .map(({ canvas }, idx) => {
        canvas.style.zIndex = idx;
      });

    this.colorPallet = colorPallet;

    for (const child of node.childNodes) {
      node.removeChild(child);
    }

    for (const canvas of this.canvasses) {
      node.appendChild(canvas);
    }

    this.resize();
  }

  color(name: string): string {
    return this.colorPallet.get(name) || "pink";
  }

  resize() {
    for (const canvas of this.canvasses) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
  }

  sizeChanged(): boolean {
    const canvas = this.canvasses[0];
    return (
      canvas.width !== canvas.clientWidth ||
      canvas.height !== canvas.clientHeight
    );
  }

  async getImage(id: string, color: string): Promise<Image> {
    const key = `${id}-${color}`;

    const image = this.images.get(key);

    if (image) {
      return image;
    }

    const img = await loadImage(id, color);

    this.images.set(key, img);

    return img;
  }

  async draw(world: Board) {
    const { grid, fg } = this.layers;
    const sizeChanged = this.sizeChanged();

    if (sizeChanged) {
      this.resize();
    }

    if (sizeChanged || this.worldId !== world.id) {
      this.worldId = world.id;

      within(grid, () => {
        grid.fillStyle = this.color("tile-color");
        clear(grid);
        setCoordinateSystem(grid, world);
        drawGrid(grid, world.width, world.height);
      });
    }

    clear(fg);

    // Draw food
    within(fg, () => {
      fg.fillStyle = this.color("food-color");
      setCoordinateSystem(fg, world);
      fg.translate(0.5, 0.5);
      for (const food of world.food) {
        drawFood(fg, food);
      }
    });

    for (const snake of world.deadSnakes) {
      const x = snake.death.turn - world.turn;
      const a = 1.1 ** x;

      if (a < 0.05) {
        continue;
      }

      const head = this.getImage(headImgId(snake), snake.color);
      const tail = this.getImage(tailImgId(snake), snake.color);

      drawSnake(fg, head, tail, snake, () => {
        setCoordinateSystem(fg, world);
        fg.filter = `grayscale(${20 + Math.abs(x * 10)}%)`;
        fg.globalAlpha = a;
      });
    }

    for (const snake of world.snakes) {
      const head = this.getImage(headImgId(snake), snake.color);
      const tail = this.getImage(tailImgId(snake), snake.color);

      drawSnake(fg, head, tail, snake, () => {
        // These methods are called asyncronously and thus will not have the
        // same transformation matrix.
        setCoordinateSystem(fg, world);
      });
    }
  }
}
