/* ===========================================================================
 *  ゲームループと入力
 * ======================================================================== */

const Game = {
  battle: null,
  speed: 1,
  paused: false,
  acc: 0,
  last: 0,
  resultShown: false,
  rafId: 0,

  booted: false,

  init() {
    Save.load();
    Render.init($('#field'));
    UI.init();
    this.bindBattleControls();
    this.bindPointer();
    this.bindKeys();
    UI.show('scr-title');
    this.booted = true;
    this.loop(performance.now());
  },

  /* --------------------------------------------------------- 開始 */
  start(stage) {
    UI.closeModals();
    UI.show('scr-battle');
    // 表示直後にサイズが確定するので測り直す
    requestAnimationFrame(() => Render.resize());

    this.battle = new Battle(stage, Save.data.loadout, Save.data);
    this.speed = 1;
    this.paused = false;
    this.acc = 0;
    this.resultShown = false;
    $('#btn-speed').textContent = '×1';
    $('#btn-pause').textContent = 'Ⅱ';

    Render.camX = 0;
    Render.manualUntil = 0;
    Render.shake = 0;
    UI.buildUnitBar(this.battle);
    UI.syncHud(this.battle);
    Render.resize();
  },

  deploy(id) {
    if (!this.battle || this.paused) return;
    this.battle.deploy(id);
  },

  /* --------------------------------------------------------- 操作 */
  bindBattleControls() {
    $('#btn-speed').addEventListener('click', () => {
      this.speed = this.speed >= 3 ? 1 : this.speed + 1;
      $('#btn-speed').textContent = '×' + this.speed;
    });
    $('#btn-pause').addEventListener('click', () => {
      this.paused = !this.paused;
      $('#btn-pause').textContent = this.paused ? '▶' : 'Ⅱ';
    });
    $('#btn-retreat').addEventListener('click', () => {
      if (!this.battle || this.battle.result) return;
      if (confirm('撤退しますか？（敗北あつかいになります）')) this.battle.retreat();
    });
    $('#btn-worker').addEventListener('click', () => {
      if (this.battle && !this.paused) this.battle.upgradeWorker();
    });
    $('#btn-cannon').addEventListener('click', () => {
      if (this.battle && !this.paused) this.battle.fireCannon();
    });
  },

  bindPointer() {
    const c = $('#field');
    let dragging = false, lastX = 0, moved = 0;
    c.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; moved = 0;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', e => {
      if (!dragging || !this.battle) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      if (moved > 4) Render.panBy(dx, this.battle);
    });
    const end = () => { dragging = false; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('contextmenu', e => e.preventDefault());
  },

  bindKeys() {
    window.addEventListener('keydown', e => {
      if (UI.current !== 'scr-battle' || !this.battle) return;
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '6') {
        const id = this.battle.loadout[+k - 1];
        if (id) this.deploy(id);
      } else if (k === ' ') {
        e.preventDefault(); this.battle.fireCannon();
      } else if (k === 'w') {
        this.battle.upgradeWorker();
      } else if (k === 'p') {
        $('#btn-pause').click();
      } else if (k === 's') {
        $('#btn-speed').click();
      }
    });
  },

  /* --------------------------------------------------------- ループ */
  loop(now) {
    this.rafId = requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(0.1, (now - this.last) / 1000) || 0;
    this.last = now;

    if (UI.current !== 'scr-battle' || !this.battle) return;

    const b = this.battle;
    if (!this.paused) {
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= 1 / FPS && steps < 20) {
        b.tick();
        this.acc -= 1 / FPS;
        steps++;
      }
      if (steps >= 20) this.acc = 0;   // 追いつけない時は捨てる
    }

    Render.updateCamera(b, dt);
    Render.draw(b);
    UI.syncHud(b);

    if (b.result && !this.resultShown && b.frame - b.resultFrame > 60) {
      this.resultShown = true;
      UI.showResult(b);
    }
  },
};

/* ---------------------------------------------------------------- 起動 */
/* load イベント待ちにすると、ページ読み込み後に中身が差し込まれる環境
   （アーティファクトへの埋め込みなど）では load が既に終わっていて
   初期化が一生走らない。DOM が組み上がっていれば即座に起動する。 */
function boot() {
  if (Game.booted) return;
  try {
    Game.init();
  } catch (e) {
    showFatal(e);
  }
}

/* 起動に失敗したとき、画面が静止したままだと原因が分からないので表示する */
function showFatal(err) {
  if (document.getElementById('fatal-error')) return;
  const el = document.createElement('div');
  el.id = 'fatal-error';
  el.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#b23c2a;color:#fff;' +
    'padding:12px 14px;font:12px/1.6 ui-monospace,monospace;white-space:pre-wrap;' +
    'max-height:50%;overflow:auto';
  el.textContent = '起動に失敗しました。この内容を伝えてください:\n' +
    ((err && (err.stack || err.message)) || String(err));
  (document.body || document.documentElement).appendChild(el);
}

window.addEventListener('error', e => {
  if (!Game.booted) showFatal(e.error || e.message);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
