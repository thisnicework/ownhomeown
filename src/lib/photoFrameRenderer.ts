export type Pt = [number, number];

export interface MonolithPose {
  edge: Pt[];
  counter: [Pt, Pt, Pt, Pt];
}

export interface FrameMonolithSet {
  topPoses: MonolithPose[];
  bottomPoses: MonolithPose[];
  leftPoses: MonolithPose[];
  rightPoses: MonolithPose[];
}

export interface PhotoFrameOptions {
  /** Captured or uploaded image/video source */
  source: CanvasImageSource | null;
  sourceWidth: number;
  sourceHeight: number;
  /** Mirror horizontally (for front camera selfie) */
  mirror?: boolean;
  /** Exhibition monochrome filter */
  grayscale?: boolean;
  /** Elapsed time in seconds for monolith morph animation */
  elapsedSec: number;
  /** Monolith pose sequences for all 4 sides */
  monoliths: FrameMonolithSet;
  /** Optional guestbook message baked into the photo */
  message?: string;
  /** Optional visitor author/nickname */
  author?: string;
  /** Show message overlay on the framed photo */
  showCaption?: boolean;
  /** Optional formatted date stamp (e.g. "2026.11.25") */
  dateLabel?: string;
}

// Exact 4:3 Landscape photo card (1600x1200) with 3:2 inner photo (1140x760)
export const FRAME_W = 1600;
export const FRAME_H = 1200;
export const SCR_W = 1140;
export const SCR_H = 760;
export const SCR_X = (FRAME_W - SCR_W) / 2; // 230
export const SCR_Y = 174;
export const BEZEL = 8;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Deterministic Mulberry32 PRNG so each frame seed is reproducible */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function mirrorPose(pose: MonolithPose): MonolithPose {
  const edge: Pt[] = [...pose.edge].reverse().map(([x, y]) => [1 - x, y]);
  const counter = pose.counter.map(([x, y]) => [1 - x, y] as Pt) as [
    Pt,
    Pt,
    Pt,
    Pt,
  ];
  return { edge, counter };
}

function sampleEdgeY(edge: Pt[], x: number): number {
  if (x <= edge[0][0]) return edge[0][1];
  for (let i = 0; i < edge.length - 1; i++) {
    const [x0, y0] = edge[i];
    const [x1, y1] = edge[i + 1];
    if (x >= x0 && x <= x1) {
      if (Math.abs(x1 - x0) < 1e-6) return Math.min(y0, y1);
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return edge[edge.length - 1][1];
}

function extremeEdgeY(
  edge: Pt[],
  xStart: number,
  xEnd: number,
  mode: 'min' | 'max'
): number {
  let result = mode === 'min' ? 1 : 0;
  const steps = 12;
  for (let s = 0; s <= steps; s++) {
    const sx = xStart + ((xEnd - xStart) * s) / steps;
    const sy = sampleEdgeY(edge, clamp01(sx));
    result = mode === 'min' ? Math.min(result, sy) : Math.max(result, sy);
  }
  for (const [ex, ey] of edge) {
    if (ex >= xStart && ex <= xEnd) {
      result = mode === 'min' ? Math.min(result, ey) : Math.max(result, ey);
    }
  }
  return result;
}

function generateTopPose(rng: () => number, flipped: boolean): MonolithPose {
  const r = (a: number, b: number) => randRange(rng, a, b);
  const x1 = r(0.03, 0.08);
  const x2 = x1 + r(0.08, 0.13);
  const x3 = x2 + r(0.06, 0.1);
  const x4 = x3 + r(0.09, 0.13);
  const x5 = x4 + r(0.09, 0.13);
  const x6 = x5 + r(0.07, 0.1);
  const x7 = x6 + r(0.07, 0.11);
  const x8 = clamp(x7 + r(0.11, 0.16), 0.68, 0.8);
  const x9 = clamp(x8 + r(0.09, 0.13), 0.82, 0.92);

  const leftDrop = r(0.84, 0.98);
  const midShelf = r(0.56, 0.72);
  const midProng = r(0.84, 0.98);
  const notchUp = r(0.62, 0.78);
  const rightProng = r(0.86, 0.99);
  const deepBay = r(0.28, 0.42);
  const farRightDrop = r(0.8, 0.96);

  const edge: Pt[] = [
    [0.0, r(0.42, 0.6)],
    [x1, r(0.32, 0.48)],
    [x1, leftDrop],
    [x2, leftDrop],
    [x3, midShelf],
    [x4, midShelf],
    [x4, midProng],
    [x5, midProng],
    [x6, notchUp],
    [x7, rightProng],
    [x8, r(0.54, 0.7)],
    [x8, deepBay],
    [x9, deepBay],
    [x9, farRightDrop],
    [1.0, clamp(farRightDrop - r(0.04, 0.12), 0.66, 0.94)],
  ];

  const cw = r(0.08, 0.12);
  const cx = r(x4 - 0.02, Math.max(x4 + 0.02, x7 - cw - 0.02));
  const minOuterY = extremeEdgeY(edge, cx - 0.04, cx + cw + 0.04, 'min');
  const ch = clamp(minOuterY - 0.36, 0.18, 0.3);
  const slant = r(0.03, 0.05);
  const counter: [Pt, Pt, Pt, Pt] = [
    [cx, -0.02],
    [cx + cw, -0.02],
    [cx + cw - slant, ch],
    [cx, ch],
  ];

  const pose: MonolithPose = { edge, counter };
  return flipped ? mirrorPose(pose) : pose;
}

function generateBottomPose(rng: () => number, flipped: boolean): MonolithPose {
  const r = (a: number, b: number) => randRange(rng, a, b);
  const x1 = r(0.06, 0.11);
  const x2 = x1 + r(0.06, 0.1);
  const x3 = x2 + r(0.05, 0.09);
  const x4 = x3 + r(0.1, 0.15);
  const x5 = x4 + r(0.06, 0.1);
  const x6 = x5 + r(0.11, 0.16);
  const x7 = clamp(x6 + r(0.07, 0.11), 0.58, 0.72);
  const x8 = clamp(x7 + r(0.09, 0.13), 0.7, 0.83);
  const x9 = clamp(x8 + r(0.05, 0.08), 0.78, 0.89);
  const x10 = clamp(x9 + r(0.05, 0.07), 0.86, 0.94);

  const leftBlock = r(0.06, 0.22);
  const leftSlot = r(0.46, 0.58);
  const peak1 = r(0.02, 0.15);
  const centerValley = r(0.28, 0.42);
  const peak2 = r(0.02, 0.14);
  const rightStep = r(0.32, 0.44);
  const rightShelf = r(0.2, 0.34);

  const edge: Pt[] = [
    [0.0, leftBlock],
    [x1, leftBlock],
    [x1, leftSlot],
    [x2, leftSlot],
    [x3, r(0.2, 0.34)],
    [x4, peak1],
    [x5, centerValley],
    [x6, peak2],
    [x7, clamp(peak2 + r(0.06, 0.12), 0.1, 0.26)],
    [x7, rightStep],
    [x8, rightStep],
    [x9, rightShelf],
    [x10, rightShelf],
    [x10, r(0.5, 0.62)],
    [1.0, r(0.42, 0.56)],
  ];

  const cw = r(0.08, 0.11);
  const cx = clamp(r(x5 + 0.04, x8 - cw - 0.02), 0.48, 0.72);
  const maxOuterY = extremeEdgeY(edge, cx - 0.04, cx + cw + 0.04, 'max');
  const counterTop = clamp(maxOuterY + 0.38, 0.68, 0.82);
  const counter: [Pt, Pt, Pt, Pt] = [
    [cx, clamp(counterTop + 0.1, 0.78, 0.92)],
    [cx + cw, counterTop],
    [cx + cw, 1.04],
    [cx, 1.04],
  ];

  const pose: MonolithPose = { edge, counter };
  return flipped ? mirrorPose(pose) : pose;
}

export function createFrameMonolithSet(seed = 20261125): FrameMonolithSet {
  const rng = createRng(seed);
  return {
    topPoses: Array.from({ length: 4 }, () => generateTopPose(rng, false)),
    bottomPoses: Array.from({ length: 4 }, () => generateBottomPose(rng, false)),
    leftPoses: Array.from({ length: 4 }, () => generateTopPose(rng, true)),
    rightPoses: Array.from({ length: 4 }, () => generateBottomPose(rng, true)),
  };
}

function morphPose(
  poses: MonolithPose[],
  elapsed: number,
  cycleDuration: number,
  phaseShift: number
): { edge: Pt[]; counter: Pt[] } {
  const totalCycle = (elapsed + phaseShift) / cycleDuration;
  const idx = Math.floor(totalCycle) % poses.length;
  const nextIdx = (idx + 1) % poses.length;
  const raw = totalCycle - Math.floor(totalCycle);
  const hold = 0.16;
  const morphT =
    raw > hold ? easeInOutCubic(clamp01((raw - hold) / (1 - hold))) : 0;

  const p0 = poses[idx];
  const p1 = poses[nextIdx];
  const edge: Pt[] = p0.edge.map(([fx, fy], i) => {
    const [tx, ty] = p1.edge[i];
    return [fx + (tx - fx) * morphT, fy + (ty - fy) * morphT];
  });
  const counter: Pt[] = p0.counter.map(([fx, fy], i) => {
    const [tx, ty] = p1.counter[i];
    return [fx + (tx - fx) * morphT, fy + (ty - fy) * morphT];
  });
  return { edge, counter };
}

function drawHorizontalMonolith(
  ctx: CanvasRenderingContext2D,
  poses: MonolithPose[],
  isTop: boolean,
  elapsed: number,
  cycle: number,
  phase: number,
  bandH: number
) {
  const overscan = 48;
  const drawW = FRAME_W + overscan * 2;
  const drift = Math.sin(elapsed * 0.45 + (isTop ? 0 : 1.7)) * 22;
  const shiftX = -overscan + drift;
  const baseY = isTop ? 0 : FRAME_H - bandH;

  const { edge, counter } = morphPose(poses, elapsed, cycle, phase);

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(-overscan - 20, isTop ? -60 : FRAME_H + 60);
  for (const [mx, my] of edge) {
    ctx.lineTo(shiftX + mx * drawW, baseY + my * bandH);
  }
  ctx.lineTo(FRAME_W + overscan + 20, isTop ? -60 : FRAME_H + 60);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#808080';
  ctx.beginPath();
  counter.forEach(([mx, my], i) => {
    const px = shiftX + mx * drawW;
    const py = baseY + my * bandH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
}

function drawVerticalMonolith(
  ctx: CanvasRenderingContext2D,
  poses: MonolithPose[],
  isLeft: boolean,
  elapsed: number,
  cycle: number,
  phase: number,
  bandW: number
) {
  const overscan = 60;
  const drawH = FRAME_H + overscan * 2;
  const drift = Math.sin(elapsed * 0.38 + (isLeft ? 0.8 : 2.5)) * 26;
  const shiftY = -overscan + drift;
  const baseX = isLeft ? 0 : FRAME_W - bandW;

  const { edge, counter } = morphPose(poses, elapsed, cycle, phase);

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(isLeft ? -60 : FRAME_W + 60, -overscan - 20);
  for (const [my, mx] of edge) {
    ctx.lineTo(baseX + mx * bandW, shiftY + my * drawH);
  }
  ctx.lineTo(isLeft ? -60 : FRAME_W + 60, FRAME_H + overscan + 20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#808080';
  ctx.beginPath();
  counter.forEach(([my, mx], i) => {
    const px = baseX + mx * bandW;
    const py = shiftY + my * drawH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
}

/** Word-wraps Korean/English text cleanly (keep-all word boundary first) within maxWidth */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para.trim() === '') {
      if (lines.length < maxLines) lines.push('');
      continue;
    }

    const words = para.split(' ');
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else if (current) {
        lines.push(current);
        if (lines.length >= maxLines) break;
        // If single word exceeds maxWidth, fall back to char split
        if (ctx.measureText(word).width <= maxWidth) {
          current = word;
        } else {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
              lines.push(chunk);
              if (lines.length >= maxLines) {
                chunk = '';
                break;
              }
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        }
      } else {
        // First word itself is wider than maxWidth
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
            lines.push(chunk);
            if (lines.length >= maxLines) {
              chunk = '';
              break;
            }
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      }
      if (lines.length >= maxLines) break;
    }

    if (current && lines.length < maxLines) {
      lines.push(current);
    }
    if (lines.length >= maxLines) break;
  }

  return lines.slice(0, maxLines);
}

/** Draws the official interlocked "공共과 주主" exhibition wordmark centered at centerY */
function drawGongJuWordmark(
  ctx: CanvasRenderingContext2D,
  centerY: number,
  baseSize = 54
) {
  ctx.save();
  const sans =
    "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
  const serif = "'Noto Serif KR', 'Batang', Georgia, serif";

  const fontKo = `600 ${baseSize}px ${sans}`;
  const fontHanja = `400 ${Math.round(baseSize * 0.62)}px ${serif}`;
  const fontConj = `500 ${Math.round(baseSize * 0.88)}px ${sans}`;

  const hanjaShiftX = -baseSize * 0.14;
  const hanjaShiftY = baseSize * 0.14;
  const conjMarginL = baseSize * 0.08;
  const conjMarginR = baseSize * 0.14;

  // Measure each glyph segment
  ctx.font = fontKo;
  const wGong = ctx.measureText('공').width;
  const wJu = ctx.measureText('주').width;
  ctx.font = fontHanja;
  const wHanjaGong = ctx.measureText('共').width;
  const wHanjaJu = ctx.measureText('主').width;
  ctx.font = fontConj;
  const wGwa = ctx.measureText('과').width;

  const totalW =
    wGong +
    hanjaShiftX +
    wHanjaGong +
    conjMarginL +
    wGwa +
    conjMarginR +
    wJu +
    hanjaShiftX +
    wHanjaJu;

  // Optical centering matching App.css (+0.07em subtle right balance for trailing 主)
  let x = (FRAME_W - totalW) / 2 + baseSize * 0.04;
  const baselineY = centerY + baseSize * 0.34;

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#f5f5f5';

  // 공
  ctx.font = fontKo;
  ctx.fillText('공', x, baselineY);
  x += wGong + hanjaShiftX;

  // 共
  ctx.font = fontHanja;
  ctx.fillText('共', x, baselineY + hanjaShiftY);
  x += wHanjaGong + conjMarginL;

  // 과
  ctx.font = fontConj;
  ctx.fillText('과', x, baselineY);
  x += wGwa + conjMarginR;

  // 주
  ctx.font = fontKo;
  ctx.fillText('주', x, baselineY);
  x += wJu + hanjaShiftX;

  // 主
  ctx.font = fontHanja;
  ctx.fillText('主', x, baselineY + hanjaShiftY);

  ctx.restore();
}

/** Draws tracked text optically centered at centerX, centerY with subtle dark halo */
function drawTrackedDomain(
  ctx: CanvasRenderingContext2D,
  label: string,
  centerY: number
) {
  ctx.save();
  ctx.font =
    "400 38px 'Helvetica Neue', 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const tracking = 5.0;
  const widths = [...label].map((ch) => ctx.measureText(ch).width);
  const totalW = widths.reduce((a, b) => a + b, 0) + tracking * (label.length - 1);
  const startX = (FRAME_W - totalW) / 2;

  // Soft dark halo so text remains 100% legible over both #000000 and #808080 cutouts
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#f5f5f5';

  let x = startX;
  for (let i = 0; i < label.length; i++) {
    ctx.fillText(label[i], x, centerY);
    x += widths[i] + tracking;
  }
  ctx.restore();
}

/**
 * Renders the complete 1600x1200 (4:3 landscape) exhibition 1-cut photo card onto a 2D canvas:
 * - #808080 background + 4-side morphing HeroMotionForms black monoliths
 * - Sharp 90-degree matte bezel + soft drop shadow + subtle rim highlight
 * - Centered 3:2 1-cut landscape photo (1140x760 at y=174) + optional guestbook message card
 * - Optically centered "ownhomeown.com" caption at y=1072
 */
export function renderExhibitionPhotoFrame(
  ctx: CanvasRenderingContext2D,
  options: PhotoFrameOptions
): void {
  const {
    source,
    sourceWidth,
    sourceHeight,
    mirror = false,
    grayscale = false,
    elapsedSec,
    monoliths,
    message = '',
    author = '',
    showCaption = true,
    dateLabel,
  } = options;

  // 1. Flat exhibition #808080 canvas
  ctx.save();
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);

  // 2. 4-side HeroMotionForms black monoliths proportioned for 1600x1200 (4:3)
  drawVerticalMonolith(ctx, monoliths.leftPoses, true, elapsedSec, 8.6, 1.4, 225);
  drawVerticalMonolith(ctx, monoliths.rightPoses, false, elapsedSec, 9.2, 3.8, 225);
  drawHorizontalMonolith(ctx, monoliths.topPoses, true, elapsedSec, 7.2, 0.6, 225);
  drawHorizontalMonolith(ctx, monoliths.bottomPoses, false, elapsedSec, 7.8, 2.9, 225);

  // 3. Sharp 90-degree drop shadow + matte bezel + subtle 2px rim highlight
  const bx = SCR_X - BEZEL;
  const by = SCR_Y - BEZEL;
  const bw = SCR_W + BEZEL * 2;
  const bh = SCR_H + BEZEL * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.62)';
  ctx.shadowBlur = 46;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

  // 4. Centered 1-cut landscape photo viewport (sharp 90-degree corners)
  ctx.save();
  ctx.beginPath();
  ctx.rect(SCR_X, SCR_Y, SCR_W, SCR_H);
  ctx.clip();

  ctx.fillStyle = '#111111';
  ctx.fillRect(SCR_X, SCR_Y, SCR_W, SCR_H);

  if (source && sourceWidth > 0 && sourceHeight > 0) {
    const srcRatio = sourceWidth / sourceHeight;
    const dstRatio = SCR_W / SCR_H;
    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (srcRatio > dstRatio) {
      sw = sourceHeight * dstRatio;
      sx = (sourceWidth - sw) / 2;
    } else {
      sh = sourceWidth / dstRatio;
      sy = (sourceHeight - sh) / 2;
    }

    ctx.save();
    if (grayscale) {
      ctx.filter = 'grayscale(100%) contrast(1.08)';
    }
    if (mirror) {
      ctx.translate(SCR_X + SCR_W, SCR_Y);
      ctx.scale(-1, 1);
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, SCR_W, SCR_H);
    } else {
      ctx.drawImage(source, sx, sy, sw, sh, SCR_X, SCR_Y, SCR_W, SCR_H);
    }
    ctx.restore();
  }

  // 5. Optional editorial guestbook text card at the bottom of the 1-cut photo
  const trimmedMsg = message.trim();
  const trimmedAuthor = author.trim();
  if (showCaption && (trimmedMsg || trimmedAuthor)) {
    const padX = 44;
    const padTop = 24;
    const padBottom = 26;
    const maxTextW = SCR_W - padX * 2;

    ctx.font =
      "400 28px 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
    const msgLines = trimmedMsg ? wrapTextLines(ctx, trimmedMsg, maxTextW, 3) : [];
    const lineH = 40;
    const metaH = trimmedAuthor || dateLabel ? 30 : 0;
    const gapBetween = msgLines.length > 0 && metaH > 0 ? 14 : 0;
    const cardH = padTop + msgLines.length * lineH + gapBetween + metaH + padBottom;
    const cardY = SCR_Y + SCR_H - cardH;

    // Subtle dark gradient scrim extending slightly above the card
    const grad = ctx.createLinearGradient(0, cardY - 76, 0, SCR_Y + SCR_H);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.28, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(SCR_X, cardY - 76, SCR_W, cardH + 76);

    // Hairline top divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(SCR_X + padX, cardY + 2);
    ctx.lineTo(SCR_X + SCR_W - padX, cardY + 2);
    ctx.stroke();

    // Message body
    ctx.fillStyle = '#f5f5f5';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let curY = cardY + padTop;
    for (const line of msgLines) {
      ctx.fillText(line, SCR_X + padX, curY);
      curY += lineH;
    }

    // Author + Date meta row
    if (metaH > 0) {
      curY += gapBetween;
      ctx.font =
        "500 21px 'IBM Plex Mono', 'Pretendard Variable', 'Pretendard', monospace";
      ctx.fillStyle = 'rgba(242, 242, 242, 0.74)';
      if (trimmedAuthor) {
        ctx.textAlign = 'left';
        ctx.fillText(`— ${trimmedAuthor}`, SCR_X + padX, curY);
      }
      if (dateLabel) {
        ctx.textAlign = 'right';
        ctx.fillText(dateLabel, SCR_X + SCR_W - padX, curY);
      }
    }
  }

  ctx.restore();

  // 6. Official "공共과 주主" wordmark on top & optically centered "ownhomeown.com" on bottom
  drawGongJuWordmark(ctx, 86, 54);
  drawTrackedDomain(ctx, 'ownhomeown.com', 1072);

  ctx.restore();
}
