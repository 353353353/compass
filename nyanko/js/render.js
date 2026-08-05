/* ===========================================================================
 *  描画。画像素材は一切使わず、すべて Canvas のパスで描く。
 *  ワールド座標  : x は 0（自城）〜 stage.length（敵城）、y は地面を 0 として上が正。
 * ======================================================================== */

/* 拡大率は「高さ」と「最低限見せたい横幅」の両方から決める。
   縦長のスマホでも横に広がりすぎず、横長のPCでも寄りすぎない。 */
const VIEW_H = 420;      // 基準となるワールド高さ
const VIEW_W_MIN = 440;  // 最低これだけの横幅はワールド座標で見せる

const THEMES = {
  grass:    { sky: ['#7ec8f2', '#d8f0ff'], far: '#8fc98a', mid: '#6db05f', ground: '#5aa04d', soil: '#7d5a3c', deco: 'tree' },
  swamp:    { sky: ['#93b7a6', '#d6e7d5'], far: '#6d9377', ground: '#4f7a55', soil: '#4a4030', deco: 'reed' },
  cave:     { sky: ['#241d33', '#3d3350'], far: '#2f2743', ground: '#4a3f58', soil: '#332b3f', deco: 'rock', cave: true },
  mountain: { sky: ['#9fb8dd', '#e0eaf7'], far: '#8d93a8', ground: '#79705f', soil: '#5c5344', deco: 'rock' },
  castle:   { sky: ['#3b2a4a', '#7a4a5e'], far: '#3a2f45', ground: '#514358', soil: '#3a3040', deco: 'flag' },
};

const Render = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
  camX: 0, camTarget: 0, manualUntil: 0, shake: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(320, r.width);
    this.h = Math.max(200, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  },

  get scale() { return Math.min(this.h / VIEW_H, this.w / VIEW_W_MIN); },
  get viewW() { return this.w / this.scale; },
  get groundY() { return this.h * 0.72; },

  worldToScreenX(x) { return (x - this.camX) * this.scale; },
  screenToWorldX(sx) { return sx / this.scale + this.camX; },

  /* -------------------------------------------------------------- カメラ */
  updateCamera(b, dt) {
    const half = this.viewW / 2;
    const now = performance.now();
    // 基本は「自軍の最前線」を追う。敵が近ければ両者の中間に寄せる。
    const frontAlly = b.allies.length ? Math.max(...b.allies.map(f => f.x)) : b.allyCastle.x + 120;
    const frontFoe = b.foes.length ? Math.min(...b.foes.map(f => f.x)) : b.foeCastle.x;
    const gap = frontFoe - frontAlly;
    const focus = gap < this.viewW * 0.75
      ? (frontAlly + frontFoe) / 2
      : frontAlly + this.viewW * 0.18;

    if (now > this.manualUntil) {
      this.camTarget = focus - half;
      this.camX += (this.camTarget - this.camX) * Math.min(1, dt * 3.5);
    }
    this.clampCam(b);
    if (this.shake > 0) this.shake *= 0.88;
  },

  clampCam(b) {
    const max = Math.max(0, b.length - this.viewW);
    this.camX = Math.max(-40, Math.min(max + 40, this.camX));
  },

  panBy(dx, b) {
    this.camX -= dx / this.scale;
    this.manualUntil = performance.now() + 4000;
    this.clampCam(b);
  },

  /* -------------------------------------------------------------- 本体 */
  draw(b) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.w, this.h);

    const th = THEMES[b.stage.theme] || THEMES.grass;
    this.drawSky(th);

    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    this.drawBackground(th, b);
    this.drawGround(th, b);
    this.drawCastle(b.foeCastle, b, th, false);
    this.drawCastle(b.allyCastle, b, th, true);

    // 奥→手前。row が大きいほど手前。
    const all = b.allies.concat(b.foes);
    all.sort((a, c) => (a.row - c.row) || (a.x - c.x));
    for (const f of all) this.drawFighter(f, b);

    this.drawEffects(b);
    ctx.restore();
    ctx.restore();
  },

  drawSky(th) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, this.groundY);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.groundY + 2);

    if (th.cave) {
      // 洞窟：天井の鍾乳石
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      const par = this.camX * 0.12;
      for (let i = -1; i < 24; i++) {
        const x = i * 96 - (par % 96);
        const h = 26 + ((i * 37) % 40);
        ctx.beginPath(); ctx.moveTo(x - 16, -2); ctx.lineTo(x, h); ctx.lineTo(x + 16, -2); ctx.closePath(); ctx.fill();
      }
      return;
    }
    // 雲
    const par = this.camX * 0.08;
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    const gapC = 180;
    for (let i = -1; i < Math.ceil(this.w / gapC) + 4; i++) {
      const x = i * gapC - (par % gapC);
      if (x < -140 || x > this.w + 140) continue;
      const y = this.groundY * (0.08 + ((i * 13) % 9) / 15);
      const s = (0.7 + ((i * 7) % 5) / 8) * Math.max(1, this.scale * 0.8);
      // ひとつのパスにまとめて塗る（重なりで色が濃くならないように）
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
      ctx.moveTo(x + 50 * s, y + 6 * s);
      ctx.arc(x + 30 * s, y + 6 * s, 20 * s, 0, Math.PI * 2);
      ctx.moveTo(x - 11 * s, y + 8 * s);
      ctx.arc(x - 28 * s, y + 8 * s, 17 * s, 0, Math.PI * 2);
      ctx.rect(x - 28 * s, y, 58 * s, 14 * s);
      ctx.fill();
    }
  },

  drawBackground(th, b) {
    const ctx = this.ctx;
    const gy = this.groundY;
    const hillH = Math.max(110, gy * 0.42);

    // 最遠景の山脈
    ctx.fillStyle = shade(th.far, 0.78);
    const parM = this.camX * 0.06;
    ctx.beginPath();
    ctx.moveTo(-10, gy);
    for (let i = -1; i < 12; i++) {
      const cx = i * 440 - (parM % 440);
      ctx.lineTo(cx + 110, gy - hillH * (0.95 + (i % 2) * 0.3));
      ctx.lineTo(cx + 260, gy - hillH * 0.55);
      ctx.lineTo(cx + 380, gy - hillH * 0.85);
      ctx.lineTo(cx + 440, gy);
    }
    ctx.lineTo(this.w + 10, gy); ctx.closePath(); ctx.fill();

    // 遠景の丘（パララックス2層）
    ctx.fillStyle = shade(th.far, 0.82);
    const parA = this.camX * 0.14;
    ctx.beginPath();
    ctx.moveTo(-10, gy);
    for (let i = -1; i < 16; i++) {
      const cx = i * 300 - (parA % 300);
      ctx.quadraticCurveTo(cx + 90, gy - hillH * 1.25, cx + 300, gy);
    }
    ctx.lineTo(this.w + 10, gy); ctx.closePath(); ctx.fill();

    ctx.fillStyle = th.far;
    const par = this.camX * 0.3;
    ctx.beginPath();
    ctx.moveTo(-10, gy);
    for (let i = -1; i < 20; i++) {
      const cx = i * 210 - (par % 210);
      ctx.quadraticCurveTo(cx + 60, gy - hillH * (0.62 + (i % 3) * 0.16), cx + 210, gy);
    }
    ctx.lineTo(this.w + 10, gy); ctx.closePath(); ctx.fill();

    // 中景の装飾
    const gap = 190 * this.scale;
    const par2 = this.camX * 0.55 * this.scale;
    ctx.globalAlpha = 0.9;
    for (let i = -1; i < Math.ceil(this.w / gap) + 3; i++) {
      const cx = i * gap - (par2 % gap);
      if (cx < -120 || cx > this.w + 120) continue;
      this.drawDeco(th, cx, gy, i);
    }
    ctx.globalAlpha = 1;
  },

  drawDeco(th, x, gy, i) {
    const ctx = this.ctx;
    const s = (0.85 + (i % 3) * 0.2) * this.scale;
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    if (th.deco === 'tree') {
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(-5, -46, 10, 46);
      ctx.fillStyle = '#4e9944';
      circle(ctx, 0, -60, 30); ctx.fill();
      circle(ctx, -22, -46, 20); ctx.fill();
      circle(ctx, 22, -46, 20); ctx.fill();
    } else if (th.deco === 'reed') {
      ctx.strokeStyle = '#4e7a4a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.moveTo(k * 9, 0);
        ctx.quadraticCurveTo(k * 9 + 6, -30, k * 9 + 2, -56); ctx.stroke();
      }
    } else if (th.deco === 'rock') {
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath();
      ctx.moveTo(-30, 0); ctx.lineTo(-12, -40); ctx.lineTo(8, -22);
      ctx.lineTo(26, -52); ctx.lineTo(40, 0); ctx.closePath(); ctx.fill();
    } else if (th.deco === 'flag') {
      ctx.fillStyle = '#2b2233'; ctx.fillRect(-4, -80, 8, 80);
      ctx.fillStyle = '#a8385a';
      ctx.beginPath(); ctx.moveTo(4, -80); ctx.lineTo(46, -68); ctx.lineTo(4, -56); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  drawGround(th, b) {
    const ctx = this.ctx;
    const gy = this.groundY;
    ctx.fillStyle = th.ground;
    ctx.fillRect(0, gy, this.w, this.h - gy);
    ctx.fillStyle = th.soil;
    ctx.fillRect(0, gy + 14, this.w, this.h - gy - 14);
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    ctx.fillRect(0, gy, this.w, 4);

    // 地面のディテール（進んでいる感じを出すための目印）
    const step = 60;
    const start = Math.floor(this.camX / step) * step;
    for (let x = start; x < this.camX + this.viewW + step; x += step) {
      const sx = this.worldToScreenX(x);
      const k = ((x / step) | 0) % 4;
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.fillRect(sx, gy + 3 + k, 3 * this.scale, 2 * this.scale);
      ctx.fillStyle = 'rgba(0,0,0,.10)';
      ctx.fillRect(sx + 18 * this.scale, gy + 22 + k * 3, 10 * this.scale, 2 * this.scale);
    }
  },

  /* -------------------------------------------------------------- 城 */
  drawCastle(c, b, th, isAlly) {
    const ctx = this.ctx;
    const s = this.scale;
    const gy = this.groundY;
    const sx = this.worldToScreenX(c.x);
    if (sx < -400 || sx > this.w + 400) return;

    ctx.save();
    ctx.translate(sx, gy);
    ctx.scale(s * (isAlly ? 1 : -1), s);   // どちらの城も「自陣の外側」に向かって建つ
    const dead = c.hp <= 0;
    const wob = dead ? 0 : Math.sin(b.frame * 0.04) * 1.5;

    const body = isAlly ? '#f4efe4' : (b.stage.theme === 'castle' ? '#3d3348' : '#6a5a4a');
    const trim = isAlly ? '#e0563f' : '#2f2733';

    // 土台
    ctx.fillStyle = 'rgba(0,0,0,.20)';
    ellipse(ctx, -18, 2, 96, 12); ctx.fill();

    ctx.save();
    ctx.translate(0, wob);
    const tower = () => roundRect(ctx, -132, -180, 118, 180, 8);
    const roof = () => {
      ctx.beginPath();
      ctx.moveTo(-142, -178); ctx.lineTo(-73, -238); ctx.lineTo(-4, -178); ctx.closePath();
    };
    // 塔本体
    ctx.fillStyle = body;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 3;
    tower(); ctx.fill(); ctx.stroke();
    // 屋根
    ctx.fillStyle = trim;
    roof(); ctx.fill(); ctx.stroke();
    // 被弾の光（形に沿わせる。連打されても白飛びしないよう薄く）
    if (c.flash > 0) {
      ctx.globalAlpha = Math.min(0.3, c.flash / 26);
      ctx.fillStyle = '#fff';
      tower(); ctx.fill();
      roof(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 窓
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    roundRect(ctx, -96, -150, 46, 40, 6); ctx.fill();
    if (isAlly) {
      // 自城には肉球マーク
      ctx.fillStyle = '#e0563f';
      circle(ctx, -73, -84, 16); ctx.fill();
      for (let i = 0; i < 3; i++) { circle(ctx, -92 + i * 19, -108, 6); ctx.fill(); }
    } else {
      ctx.fillStyle = '#c23b52';
      ctx.beginPath();
      ctx.moveTo(-88, -96); ctx.lineTo(-58, -96); ctx.lineTo(-73, -66); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  },

  /* -------------------------------------------------------------- 個体 */
  drawFighter(f, b) {
    const ctx = this.ctx;
    const s = this.scale;
    const sx = this.worldToScreenX(f.x) + (f.jitter || 0) * this.scale;
    if (sx < -200 || sx > this.w + 200) return;

    const rowLift = f.row * 3;
    const gy = this.groundY + rowLift;

    // モーション量
    let lean = 0, hop = 0, rot = 0;
    if (f.state === 'walk') {
      hop = Math.abs(Math.sin(f.anim * 0.16)) * 3;
    } else if (f.state === 'attack') {
      const p = f.timer / f.rate;
      const q = f.fore / f.rate;
      if (p < q) lean = -6 * (p / q);                    // 溜め
      else lean = 14 * Math.max(0, 1 - (p - q) / 0.28);  // 踏み込み
    } else if (f.state === 'kb') {
      const p = 1 - f.kbT / f.kbDur;
      hop = Math.sin(p * Math.PI) * 34;
      rot = Math.sin(p * Math.PI) * 0.9 * -f.dir;
    }

    const sc = (f.def.scale || 1) * 1.0;

    ctx.save();
    ctx.translate(sx, gy);
    // 影
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ellipse(ctx, 0, 0, 22 * sc * s, 6 * sc * s); ctx.fill();

    ctx.translate((lean * f.dir) * s, -hop * s);
    ctx.rotate(rot);
    ctx.scale(s * f.dir * sc, s * sc);

    if (f.flash > 0) {           // 被弾した瞬間だけ少し膨らませる
      const k = 1 + f.flash * 0.014;
      ctx.scale(k, k);
    }
    const art = ART[f.def.art] || ART.cat;
    art(ctx, f, b);
    ctx.restore();

    // HPバーは敵のみ表示（味方は密集するので出すと見づらい）
    if (f.side === 'foe' && f.hp < f.maxHp) {
      const w = 30 * s * Math.min(1.5, sc), hgt = 3;
      const bx = sx - w / 2, by = gy - (74 * sc + hop) * s - 6;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(bx - 1, by - 1, w + 2, hgt + 2);
      ctx.fillStyle = f.def.boss ? '#ffca3a' : '#e5646d';
      ctx.fillRect(bx, by, w * Math.max(0, f.hp / f.maxHp), hgt);
    }
  },

  /* -------------------------------------------------------------- 演出 */
  drawEffects(b) {
    const ctx = this.ctx;
    const s = this.scale;
    const gy = this.groundY;

    for (const e of b.effects) {
      const p = e.t / e.life;
      if (e.type === 'slash') {
        const sx = this.worldToScreenX(e.x);
        ctx.save();
        ctx.translate(sx, gy - 34 * s);
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = e.side === 'ally' ? '#fff2a8' : '#ffb4b4';
        ctx.lineWidth = (e.big ? 7 : 4) * s;
        ctx.lineCap = 'round';
        const r = (e.big ? 40 : 24) * s * (0.6 + p * 0.9);
        ctx.beginPath();
        ctx.arc(0, 0, r, -1.0, 0.8);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === 'pop') {
        const sx = this.worldToScreenX(e.x);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = e.side === 'ally' ? '#ffffff' : '#ffd9d9';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const d = (10 + p * 34) * s;
          circle(ctx, sx + Math.cos(a) * d, gy - 30 * s + Math.sin(a) * d * 0.6, (7 - p * 6) * s);
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === 'dmg') {
        const sx = this.worldToScreenX(e.x);
        ctx.save();
        ctx.globalAlpha = Math.min(1, (1 - p) * 2);
        ctx.font = `bold ${Math.round(15 * Math.min(1.4, s))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.fillStyle = e.side === 'ally' ? '#ffe066' : '#ff8f8f';
        const y = gy - (e.y || 50) * s - p * 28;
        ctx.strokeText(e.v, sx, y);
        ctx.fillText(e.v, sx, y);
        ctx.restore();
      } else if (e.type === 'coin') {
        const sx = this.worldToScreenX(e.x);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#ffcf3f';
        ctx.strokeStyle = '#a8760f'; ctx.lineWidth = 2;
        const y = gy - 40 * s - p * 40 * s;
        circle(ctx, sx, y, 9 * s); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a8760f';
        ctx.font = `bold ${Math.round(10 * s)}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('¢', sx, y + 1);
        ctx.restore();
      } else if (e.type === 'cannon') {
        const x1 = this.worldToScreenX(e.x), x2 = this.worldToScreenX(e.x2);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p) * 0.9;
        const g = ctx.createLinearGradient(x1, 0, x2, 0);
        g.addColorStop(0, 'rgba(255,255,255,.95)');
        g.addColorStop(0.6, 'rgba(120,210,255,.75)');
        g.addColorStop(1, 'rgba(120,210,255,0)');
        ctx.fillStyle = g;
        const hh = (46 - p * 20) * s;
        ctx.fillRect(x1, gy - 46 * s - hh / 2, x2 - x1, hh);
        ctx.restore();
        this.shake = Math.max(this.shake, 10);
      } else if (e.type === 'worker') {
        const sx = this.worldToScreenX(e.x);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = '#7fe0a0'; ctx.lineWidth = 3 * s;
        circle(ctx, sx, gy - 40 * s, (10 + p * 40) * s); ctx.stroke();
        ctx.restore();
      }
    }
  },
};

/* ====================================================================== */
/*  キャラ描画。すべて「足元が原点・右向き」でパスを描く。               */
/* ====================================================================== */

/* #rrggbb を k 倍の明るさにする（背景の階層分け用） */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => Math.max(0, Math.min(255, Math.round(v * k))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2); }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const OUT = '#2b2430';

function outline(ctx, w) { ctx.strokeStyle = OUT; ctx.lineWidth = w || 3; ctx.stroke(); }

/* 目・口（顔の共通パーツ） */
function catFace(ctx, y, opt) {
  opt = opt || {};
  ctx.fillStyle = opt.eye || OUT;
  const ex = opt.ex || 8;
  circle(ctx, -ex, y, opt.er || 2.6); ctx.fill();
  circle(ctx, ex, y, opt.er || 2.6); ctx.fill();
  // ω口
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-2.6, y + 7, 2.8, 0, Math.PI);
  ctx.arc(2.6, y + 7, 2.8, 0, Math.PI);
  ctx.stroke();
}

function legs(ctx, f, y, color) {
  const sw = f.state === 'walk' ? Math.sin(f.anim * 0.16) * 5 : 0;
  ctx.fillStyle = color;
  roundRect(ctx, -13 + sw, y, 11, 9, 4); ctx.fill(); outline(ctx, 2.2);
  roundRect(ctx, 3 - sw, y, 11, 9, 4); ctx.fill(); outline(ctx, 2.2);
}

function tail(ctx, f, x, y, color) {
  const w = Math.sin(f.anim * 0.1) * 8;
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 16, y - 10 + w, x - 12, y - 26 + w);
  ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
}

/* 攻撃モーションの進み具合 0→1 */
function swing(f) {
  if (f.state !== 'attack') return 0;
  const p = f.timer / f.rate, q = f.fore / f.rate;
  return p < q ? -(p / q) * 0.6 : Math.max(0, 1 - (p - q) / 0.3);
}

const ART = {
  /* ------------------------------------------------------------ 自軍 */
  cat(ctx, f) {
    const white = '#fbfaf6';
    tail(ctx, f, -14, -26, white);
    legs(ctx, f, -9, white);
    // 耳
    ctx.fillStyle = white;
    ctx.beginPath(); ctx.moveTo(-16, -52); ctx.lineTo(-10, -70); ctx.lineTo(-3, -54); ctx.closePath(); ctx.fill(); outline(ctx, 2.4);
    ctx.beginPath(); ctx.moveTo(3, -54); ctx.lineTo(10, -70); ctx.lineTo(16, -52); ctx.closePath(); ctx.fill(); outline(ctx, 2.4);
    // 胴＝頭 一体型
    ctx.fillStyle = white;
    roundRect(ctx, -19, -58, 38, 50, 16); ctx.fill(); outline(ctx, 3);
    catFace(ctx, -38);
    // 前足（攻撃で前に出る）
    const s = swing(f);
    ctx.fillStyle = white;
    roundRect(ctx, 12 + s * 12, -30 - s * 6, 12, 10, 5); ctx.fill(); outline(ctx, 2.2);
  },

  tank(ctx, f) {
    const white = '#f6f3ea';
    tail(ctx, f, -16, -26, white);
    legs(ctx, f, -9, white);
    ctx.fillStyle = white;
    roundRect(ctx, -21, -60, 42, 52, 16); ctx.fill(); outline(ctx, 3);
    catFace(ctx, -40, { ex: 7 });
    // ヘルメット
    ctx.fillStyle = '#8e9aa8';
    ctx.beginPath(); ctx.arc(0, -56, 20, Math.PI, 0); ctx.closePath(); ctx.fill(); outline(ctx, 2.6);
    ctx.fillStyle = '#5f6b78'; ctx.fillRect(-20, -58, 40, 6); outline(ctx, 1.6);
    // 盾
    const s = swing(f);
    ctx.save(); ctx.translate(18 + s * 8, -34); ctx.rotate(s * 0.2);
    ctx.fillStyle = '#c9b072';
    roundRect(ctx, -6, -22, 14, 44, 6); ctx.fill(); outline(ctx, 2.6);
    ctx.fillStyle = '#8a7440'; roundRect(ctx, -2, -12, 6, 24, 3); ctx.fill();
    ctx.restore();
  },

  cow(ctx, f) {
    const white = '#fdfcf7';
    tail(ctx, f, -16, -24, white);
    legs(ctx, f, -9, white);
    ctx.fillStyle = white;
    roundRect(ctx, -20, -58, 40, 50, 16); ctx.fill(); outline(ctx, 3);
    // ぶち模様
    ctx.fillStyle = '#3b3440';
    ellipse(ctx, -10, -20, 8, 6); ctx.fill();
    ellipse(ctx, 9, -30, 6, 5); ctx.fill();
    // 角
    ctx.fillStyle = '#efe2b8';
    ctx.beginPath(); ctx.moveTo(-18, -54); ctx.quadraticCurveTo(-28, -66, -18, -70); ctx.quadraticCurveTo(-14, -62, -12, -54); ctx.closePath(); ctx.fill(); outline(ctx, 2);
    ctx.beginPath(); ctx.moveTo(18, -54); ctx.quadraticCurveTo(28, -66, 18, -70); ctx.quadraticCurveTo(14, -62, 12, -54); ctx.closePath(); ctx.fill(); outline(ctx, 2);
    catFace(ctx, -38, { ex: 8 });
    const s = swing(f);
    ctx.fillStyle = white;
    roundRect(ctx, 13 + s * 16, -28 - s * 8, 13, 10, 5); ctx.fill(); outline(ctx, 2.2);
  },

  axe(ctx, f) {
    const white = '#fbfaf6';
    tail(ctx, f, -16, -26, white);
    legs(ctx, f, -9, white);
    ctx.fillStyle = white;
    roundRect(ctx, -20, -60, 40, 52, 16); ctx.fill(); outline(ctx, 3);
    // バンダナ
    ctx.fillStyle = '#e04f4f';
    ctx.beginPath(); ctx.moveTo(-20, -28); ctx.lineTo(20, -28); ctx.lineTo(14, -20); ctx.lineTo(-14, -20); ctx.closePath(); ctx.fill(); outline(ctx, 2);
    ctx.fillStyle = white;
    ctx.beginPath(); ctx.moveTo(-18, -54); ctx.lineTo(-11, -72); ctx.lineTo(-4, -56); ctx.closePath(); ctx.fill(); outline(ctx, 2.4);
    ctx.beginPath(); ctx.moveTo(4, -56); ctx.lineTo(11, -72); ctx.lineTo(18, -54); ctx.closePath(); ctx.fill(); outline(ctx, 2.4);
    catFace(ctx, -40);
    // 斧
    const s = swing(f);
    ctx.save();
    ctx.translate(16, -40);
    ctx.rotate(-0.9 + s * 2.1);
    ctx.strokeStyle = '#8a5f36'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
    ctx.fillStyle = '#cfd6de';
    ctx.beginPath();
    ctx.moveTo(-2, -30); ctx.quadraticCurveTo(20, -38, 16, -14); ctx.quadraticCurveTo(6, -18, -2, -16);
    ctx.closePath(); ctx.fill(); outline(ctx, 2.4);
    ctx.restore();
  },

  shroom(ctx, f) {
    const body = '#f2ecff';
    tail(ctx, f, -18, -26, body);
    legs(ctx, f, -9, body);
    ctx.fillStyle = body;
    roundRect(ctx, -22, -56, 44, 48, 16); ctx.fill(); outline(ctx, 3);
    catFace(ctx, -36, { ex: 9 });
    // キノコの傘
    ctx.fillStyle = '#8e5cd8';
    ctx.beginPath(); ctx.ellipse(0, -56, 30, 20, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); outline(ctx, 2.8);
    ctx.fillStyle = '#f3e9ff';
    circle(ctx, -14, -62, 5); ctx.fill();
    circle(ctx, 6, -66, 6); ctx.fill();
    circle(ctx, 19, -58, 4); ctx.fill();
    // 胞子
    const s = swing(f);
    if (s > 0.1) {
      ctx.globalAlpha = s * 0.7; ctx.fillStyle = '#b98cf0';
      for (let i = 0; i < 5; i++) { circle(ctx, 24 + i * 9, -46 + Math.sin(i + f.anim * 0.3) * 10, 5 * s); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  },

  bird(ctx, f) {
    const body = '#fff9e8';
    const flap = Math.sin(f.anim * 0.3) * 10;
    // 翼（後ろ）
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.moveTo(-8, -44); ctx.quadraticCurveTo(-34, -56 - flap, -30, -30); ctx.quadraticCurveTo(-18, -34, -8, -36); ctx.closePath(); ctx.fill(); outline(ctx, 2.2);
    legs(ctx, f, -9, '#ffcf6a');
    ctx.fillStyle = body;
    roundRect(ctx, -17, -56, 34, 48, 15); ctx.fill(); outline(ctx, 3);
    // くちばし
    ctx.fillStyle = '#f2a33c';
    ctx.beginPath(); ctx.moveTo(16, -40); ctx.lineTo(28, -35); ctx.lineTo(16, -30); ctx.closePath(); ctx.fill(); outline(ctx, 2);
    ctx.fillStyle = OUT;
    circle(ctx, 6, -42, 2.8); ctx.fill();
    circle(ctx, -6, -42, 2.6); ctx.fill();
    // 前翼
    ctx.fillStyle = '#ffe6a8';
    ctx.beginPath(); ctx.moveTo(8, -46); ctx.quadraticCurveTo(28, -58 + flap, 24, -28); ctx.quadraticCurveTo(14, -34, 8, -38); ctx.closePath(); ctx.fill(); outline(ctx, 2.2);
  },

  lizard(ctx, f) {
    const body = '#a8e08a';
    tail(ctx, f, -16, -22, body);
    legs(ctx, f, -9, body);
    ctx.fillStyle = body;
    roundRect(ctx, -19, -54, 38, 46, 14); ctx.fill(); outline(ctx, 3);
    // 長い口
    ctx.fillStyle = body;
    roundRect(ctx, 12, -42, 22, 12, 6); ctx.fill(); outline(ctx, 2.4);
    ctx.fillStyle = OUT; circle(ctx, 4, -44, 2.8); ctx.fill();
    // 背びれ
    ctx.fillStyle = '#7cc45f';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-16 + i * 9, -54); ctx.lineTo(-11 + i * 9, -66); ctx.lineTo(-6 + i * 9, -54); ctx.closePath(); ctx.fill(); outline(ctx, 1.8);
    }
    // 発射口
    const s = swing(f);
    ctx.fillStyle = '#5e5a66';
    roundRect(ctx, 14 + s * 6, -30, 26, 9, 4); ctx.fill(); outline(ctx, 2.2);
    if (s > 0.5) { ctx.fillStyle = '#ffe9a8'; circle(ctx, 44, -26, 7 * s); ctx.fill(); }
  },

  titan(ctx, f) {
    const white = '#fdfbf4';
    tail(ctx, f, -20, -30, white);
    // 太い足
    const sw = f.state === 'walk' ? Math.sin(f.anim * 0.12) * 5 : 0;
    ctx.fillStyle = white;
    roundRect(ctx, -20 + sw, -12, 17, 13, 6); ctx.fill(); outline(ctx, 2.6);
    roundRect(ctx, 4 - sw, -12, 17, 13, 6); ctx.fill(); outline(ctx, 2.6);
    ctx.fillStyle = white;
    roundRect(ctx, -26, -66, 52, 58, 18); ctx.fill(); outline(ctx, 3.4);
    // 耳
    ctx.beginPath(); ctx.moveTo(-24, -60); ctx.lineTo(-16, -82); ctx.lineTo(-6, -62); ctx.closePath(); ctx.fill(); outline(ctx, 2.8);
    ctx.beginPath(); ctx.moveTo(6, -62); ctx.lineTo(16, -82); ctx.lineTo(24, -60); ctx.closePath(); ctx.fill(); outline(ctx, 2.8);
    // 怒り顔
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -50); ctx.lineTo(-6, -46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, -50); ctx.lineTo(6, -46); ctx.stroke();
    ctx.fillStyle = OUT;
    circle(ctx, -11, -41, 3.4); ctx.fill();
    circle(ctx, 11, -41, 3.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -28); ctx.quadraticCurveTo(0, -20, 8, -28); ctx.stroke();
    // 腕
    const s = swing(f);
    ctx.fillStyle = white;
    ctx.save(); ctx.translate(22, -46); ctx.rotate(-0.6 + s * 1.6);
    roundRect(ctx, 0, -8, 30, 16, 8); ctx.fill(); outline(ctx, 2.8);
    ctx.restore();
  },

  /* ------------------------------------------------------------ 敵 */
  doge(ctx, f) {
    const red = f.traits.includes('red');
    const body = red ? '#e8615c' : '#e8c98c';
    const dark = red ? '#b8403c' : '#c2a069';
    legs(ctx, f, -9, dark);
    ctx.fillStyle = body;
    roundRect(ctx, -20, -56, 40, 48, 16); ctx.fill(); outline(ctx, 3);
    // 垂れ耳
    ctx.fillStyle = dark;
    roundRect(ctx, -26, -54, 12, 22, 6); ctx.fill(); outline(ctx, 2.2);
    roundRect(ctx, 14, -54, 12, 22, 6); ctx.fill(); outline(ctx, 2.2);
    // 鼻先
    ctx.fillStyle = '#fff6e6';
    ellipse(ctx, 12, -30, 12, 9); ctx.fill(); outline(ctx, 2.2);
    ctx.fillStyle = OUT; circle(ctx, 20, -32, 3); ctx.fill();
    circle(ctx, -4, -42, 3); ctx.fill();
    circle(ctx, 8, -44, 3); ctx.fill();
    const s = swing(f);
    if (s > 0.3) { // 牙
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(14, -28); ctx.lineTo(20, -18); ctx.lineTo(8, -22); ctx.closePath(); ctx.fill();
    }
  },

  snake(ctx, f) {
    const g = '#7fbf6a';
    const wob = Math.sin(f.anim * 0.14) * 5;
    ctx.strokeStyle = g; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, -8);
    ctx.quadraticCurveTo(-8, -20 + wob, 2, -34);
    ctx.quadraticCurveTo(10, -48 - wob, 6, -58);
    ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = g;
    ellipse(ctx, 6, -62, 15, 12); ctx.fill(); outline(ctx, 2.6);
    ctx.fillStyle = OUT;
    circle(ctx, 2, -65, 2.6); ctx.fill();
    circle(ctx, 12, -65, 2.6); ctx.fill();
    const s = swing(f);
    ctx.strokeStyle = '#e04f6a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(18, -58); ctx.lineTo(28 + s * 10, -56); ctx.stroke();
  },

  bat(ctx, f) {
    const p = '#a98bd6';
    const flap = Math.sin(f.anim * 0.34) * 14;
    ctx.save();
    ctx.translate(0, -30 + Math.sin(f.anim * 0.1) * 4);   // 浮遊
    ctx.fillStyle = '#8b6cc4';
    ctx.beginPath(); ctx.moveTo(-6, -34); ctx.quadraticCurveTo(-38, -44 - flap, -34, -16); ctx.quadraticCurveTo(-18, -24, -6, -26); ctx.closePath(); ctx.fill(); outline(ctx, 2.2);
    ctx.beginPath(); ctx.moveTo(6, -34); ctx.quadraticCurveTo(38, -44 + flap, 34, -16); ctx.quadraticCurveTo(18, -24, 6, -26); ctx.closePath(); ctx.fill(); outline(ctx, 2.2);
    ctx.fillStyle = p;
    roundRect(ctx, -14, -44, 28, 34, 13); ctx.fill(); outline(ctx, 2.8);
    ctx.fillStyle = p;
    ctx.beginPath(); ctx.moveTo(-13, -42); ctx.lineTo(-9, -56); ctx.lineTo(-2, -44); ctx.closePath(); ctx.fill(); outline(ctx, 2);
    ctx.beginPath(); ctx.moveTo(2, -44); ctx.lineTo(9, -56); ctx.lineTo(13, -42); ctx.closePath(); ctx.fill(); outline(ctx, 2);
    ctx.fillStyle = '#ffe066';
    circle(ctx, -5, -32, 3); ctx.fill();
    circle(ctx, 5, -32, 3); ctx.fill();
    ctx.restore();
  },

  statue(ctx, f) {
    ctx.fillStyle = '#9a9490';
    roundRect(ctx, -26, -70, 52, 70, 8); ctx.fill(); outline(ctx, 3.2);
    ctx.fillStyle = '#7d7773';
    roundRect(ctx, -30, -12, 60, 14, 5); ctx.fill(); outline(ctx, 2.6);
    // ひび
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2;
    const cracks = 1 - f.hp / f.maxHp;
    if (cracks > 0.2) { ctx.beginPath(); ctx.moveTo(-14, -66); ctx.lineTo(-4, -46); ctx.lineTo(-12, -30); ctx.stroke(); }
    if (cracks > 0.55) { ctx.beginPath(); ctx.moveTo(16, -62); ctx.lineTo(6, -44); ctx.lineTo(18, -24); ctx.stroke(); }
    ctx.fillStyle = OUT;
    roundRect(ctx, -14, -52, 10, 6, 3); ctx.fill();
    roundRect(ctx, 4, -52, 10, 6, 3); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -30); ctx.lineTo(10, -30); ctx.stroke();
  },

  gorilla(ctx, f) {
    const dark = '#4a4450';
    const face = '#c4a58c';
    const s = swing(f);
    // 腕
    ctx.fillStyle = dark;
    ctx.save(); ctx.translate(-16, -52); ctx.rotate(0.4 - s * 1.4);
    roundRect(ctx, -10, 0, 18, 44, 9); ctx.fill(); outline(ctx, 2.6); ctx.restore();
    legs(ctx, f, -12, dark);
    ctx.fillStyle = dark;
    roundRect(ctx, -26, -72, 52, 62, 20); ctx.fill(); outline(ctx, 3.2);
    ctx.fillStyle = face;
    ellipse(ctx, 2, -50, 20, 17); ctx.fill(); outline(ctx, 2.4);
    ctx.fillStyle = OUT;
    circle(ctx, -5, -54, 3); ctx.fill();
    circle(ctx, 9, -54, 3); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(2, -44, 7, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.save(); ctx.translate(20, -54); ctx.rotate(-0.3 + s * 1.6);
    roundRect(ctx, -8, 0, 18, 46, 9); ctx.fill(); outline(ctx, 2.6); ctx.restore();
  },

  hippo(ctx, f) {
    const red = f.traits.includes('red');
    const body = red ? '#d95a58' : '#9fa8bd';
    const dark = red ? '#a83f43' : '#7b869c';
    legs(ctx, f, -12, dark);
    ctx.fillStyle = body;
    roundRect(ctx, -32, -66, 64, 56, 22); ctx.fill(); outline(ctx, 3.4);
    // 耳
    ctx.fillStyle = dark;
    circle(ctx, -18, -66, 7); ctx.fill(); outline(ctx, 2);
    circle(ctx, 12, -68, 7); ctx.fill(); outline(ctx, 2);
    const s = swing(f);
    // 口（攻撃で開く）
    const open = 6 + s * 22;
    ctx.fillStyle = '#f2b8bd';
    ctx.save(); ctx.translate(24, -34);
    roundRect(ctx, -6, -open / 2, 26, open, 8); ctx.fill(); outline(ctx, 2.6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(6, -open / 2 + 1, 5, 5);
    ctx.fillRect(14, -open / 2 + 1, 5, 5);
    ctx.restore();
    ctx.fillStyle = OUT;
    circle(ctx, 14, -54, 3.4); ctx.fill();
    circle(ctx, -2, -51, 3.4); ctx.fill();
  },

  general(ctx, f) {
    const s = swing(f);
    // マント
    ctx.fillStyle = '#7a1f34';
    ctx.beginPath();
    ctx.moveTo(-10, -76); ctx.quadraticCurveTo(-52, -50, -40, -4);
    ctx.lineTo(-8, -10); ctx.closePath(); ctx.fill(); outline(ctx, 2.6);
    legs(ctx, f, -12, '#211c2a');
    ctx.fillStyle = '#2b2436';
    roundRect(ctx, -28, -78, 56, 68, 20); ctx.fill(); outline(ctx, 3.4);
    // 肩当て
    ctx.fillStyle = '#4a4258';
    ellipse(ctx, -24, -66, 14, 11); ctx.fill(); outline(ctx, 2.4);
    ellipse(ctx, 24, -66, 14, 11); ctx.fill(); outline(ctx, 2.4);
    // 角
    ctx.fillStyle = '#c9a24a';
    ctx.beginPath(); ctx.moveTo(-20, -74); ctx.lineTo(-26, -100); ctx.lineTo(-8, -78); ctx.closePath(); ctx.fill(); outline(ctx, 2.2);
    ctx.beginPath(); ctx.moveTo(20, -74); ctx.lineTo(26, -100); ctx.lineTo(8, -78); ctx.closePath(); ctx.fill(); outline(ctx, 2.2);
    // 赤い目
    ctx.fillStyle = '#ff4a4a';
    ctx.save(); ctx.translate(0, -52);
    ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-3, -1); ctx.lineTo(-16, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, -6); ctx.lineTo(3, -1); ctx.lineTo(16, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -28); ctx.lineTo(10, -28); ctx.stroke();
    // 剣
    ctx.save(); ctx.translate(26, -56); ctx.rotate(-1.1 + s * 2.0);
    ctx.fillStyle = '#dfe4ea';
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(6, -46); ctx.lineTo(0, -56); ctx.lineTo(-6, -46); ctx.closePath();
    ctx.fill(); outline(ctx, 2.4);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(-10, -2, 20, 6); outline(ctx, 2);
    ctx.restore();
  },
};
