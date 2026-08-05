/* ===========================================================================
 *  戦闘シミュレーション
 *  描画には一切依存しない。1フレーム = 1/60秒 固定ステップ。
 * ======================================================================== */

const FPS = 60;

const SPAWN_MARGIN = 90;    // 城から何px離れた所に湧くか
const BASE_HIT_INSET = 130; // 城の当たり判定位置（城の内側へのめり込み量）
const OVERLAP = 34;         // 敵とどこまで重なるのを許すか

/* ------------------------------------------------------------------ 個体 */
class Fighter {
  constructor(def, side, x, level) {
    this.def = def;
    this.side = side;                 // 'ally' | 'foe'
    this.dir = side === 'ally' ? 1 : -1;
    this.level = level || 1;

    const m = side === 'ally' ? 1 + (this.level - 1) * LEVEL_STEP : 1;
    this.maxHp = Math.round(def.hp * m);
    this.hp = this.maxHp;
    this.atk = Math.round(def.atk * m);

    this.range = def.range;
    this.rate = def.rate;
    this.fore = def.fore;
    this.speed = def.speed;
    this.kb = def.kb;
    this.area = !!def.area;
    this.traits = def.traits || [];
    this.strong = def.strong || [];
    this.massive = def.massive || [];

    this.x = x;
    this.state = 'walk';              // walk | attack | kb
    this.timer = 0;
    this.didHit = false;
    this.kbT = 0;
    this.kbFrom = x;
    this.kbTo = x;
    this.dead = false;

    // ノックバックの残段数（HPをkb等分した境界を跨ぐたびに1回吹き飛ぶ）
    this.kbLeft = def.kb;

    this.anim = Math.random() * 100;  // 歩行モーションの位相
    this.row = 0;                     // 見た目の重なりをずらすための行
    this.jitter = (Math.random() - 0.5) * 22;  // 密集時に団子にならないための見た目のずれ
    this.flash = 0;
  }

  get segment() { return this.maxHp / this.kb; }

  /* 攻撃が届く範囲（ワールド座標の区間） */
  reach() {
    return this.dir > 0
      ? [this.x - OVERLAP, this.x + this.range]
      : [this.x - this.range, this.x + OVERLAP];
  }
}

/* ------------------------------------------------------------------ 城 */
class Castle {
  constructor(side, x, hp) {
    this.side = side;
    this.x = x;                       // 当たり判定のx
    this.maxHp = hp;
    this.hp = hp;
    this.isCastle = true;
    this.traits = [];
    this.flash = 0;
    this.dead = false;
  }
}

/* ------------------------------------------------------------------ 本体 */
class Battle {
  constructor(stage, loadout, save) {
    this.stage = stage;
    this.save = save;
    this.loadout = loadout.slice(0, 6);

    this.length = stage.length;
    this.allyCastle = new Castle('ally', BASE_HIT_INSET, stage.baseHp);
    this.foeCastle = new Castle('foe', stage.length - BASE_HIT_INSET, stage.enemyBaseHp);

    this.allies = [];
    this.foes = [];
    this.effects = [];

    this.frame = 0;
    this.result = null;               // null | 'win' | 'lose'
    this.resultFrame = 0;

    this.workerLevel = 1;
    this.money = 0;
    this.cannonCharge = 0;

    // 出撃ボタンごとのリチャージ
    this.cool = {};
    for (const id of this.loadout) this.cool[id] = 0;

    this.bossTriggered = false;
    this.bossTime = 0;
    this.spawners = stage.spawns.map(s => ({
      def: ENEMY_BY_ID[s.id],
      t0: s.t || 0,
      count: s.count || 1,
      interval: s.interval || 0,
      boss: !!s.boss,
      loop: !!s.loop,
      loopEvery: s.loopEvery || 0,
      loopMax: s.loops == null ? 3 : s.loops,   // 追加で何周するか（無限にはしない）
      fired: 0,
      cycle: 0,          // 何周目か
      base: 0,           // このサイクルの基準時刻（秒）
      armed: !s.boss,
    }));

    this.stats = { killed: 0, xp: 0, spawned: 0, peakFoes: 0 };
  }

  /* ---------------------------------------------------------- 便利参照 */
  get time() { return this.frame / FPS; }
  get income() { return WORKER.income[this.workerLevel - 1]; }
  get walletMax() { return WORKER.max[this.workerLevel - 1]; }
  get upgradeCost() {
    return this.workerLevel < WORKER.income.length ? WORKER.cost[this.workerLevel - 1] : null;
  }
  get cannonReady() { return this.cannonCharge >= CANNON.chargeFrames; }
  get cannonRatio() { return Math.min(1, this.cannonCharge / CANNON.chargeFrames); }

  unitLevel(id) { return (this.save.levels && this.save.levels[id]) || 1; }

  unitCost(id) { return UNIT_BY_ID[id].cost; }

  canDeploy(id) {
    if (this.result) return false;
    const u = UNIT_BY_ID[id];
    return this.cool[id] <= 0 && this.money >= u.cost && this.allies.length < DEPLOY_LIMIT;
  }

  /* ---------------------------------------------------------- 操作 */
  deploy(id) {
    if (!this.canDeploy(id)) return false;
    const u = UNIT_BY_ID[id];
    this.money -= u.cost;
    this.cool[id] = u.cooldown;
    const f = new Fighter(u, 'ally', SPAWN_MARGIN + Math.random() * 20, this.unitLevel(id));
    f.row = this.allies.length % 4;
    this.allies.push(f);
    this.fx('spawn', f.x, 0);
    return true;
  }

  upgradeWorker() {
    const cost = this.upgradeCost;
    if (this.result || cost == null || this.money < cost) return false;
    this.money -= cost;
    this.workerLevel++;
    this.fx('worker', this.allyCastle.x, 0);
    return true;
  }

  fireCannon() {
    if (this.result || !this.cannonReady) return false;
    this.cannonCharge = 0;
    const level = (this.save.cannonLevel || 1);
    const dmg = CANNON.damage * (1 + (level - 1) * 0.25);
    const reach = this.allyCastle.x + CANNON.range;
    this.effects.push({ type: 'cannon', x: this.allyCastle.x, x2: reach, t: 0, life: 34 });
    for (const f of this.foes) {
      if (f.x <= reach) {
        this.damage(f, dmg, null);
        if (!f.dead) this.knockback(f, CANNON.knockback);
      }
    }
    return true;
  }

  retreat() {
    if (!this.result) { this.result = 'lose'; this.resultFrame = this.frame; }
  }

  /* ---------------------------------------------------------- 1フレーム */
  tick() {
    if (this.result && this.frame - this.resultFrame > 90) return;
    this.frame++;

    // お金・キャノン・リチャージ
    this.money = Math.min(this.walletMax, this.money + this.income / FPS);
    if (!this.cannonReady) this.cannonCharge++;
    for (const id in this.cool) if (this.cool[id] > 0) this.cool[id]--;

    if (!this.result) this.runSpawners();

    if (this.allyCastle.flash > 0) this.allyCastle.flash--;
    if (this.foeCastle.flash > 0) this.foeCastle.flash--;

    for (const f of this.allies) this.step(f, this.foes, this.foeCastle);
    for (const f of this.foes) this.step(f, this.allies, this.allyCastle);

    this.cleanup();
    this.updateEffects();

    if (!this.result) {
      if (this.foeCastle.hp <= 0) { this.result = 'win'; this.resultFrame = this.frame; }
      else if (this.allyCastle.hp <= 0) { this.result = 'lose'; this.resultFrame = this.frame; }
    }
    this.stats.peakFoes = Math.max(this.stats.peakFoes, this.foes.length);
  }

  /* ---------------------------------------------------------- 敵の湧き */
  runSpawners() {
    const now = this.time;
    for (const sp of this.spawners) {
      if (!sp.armed) continue;
      const origin = sp.boss ? this.bossTime : 0;
      let guard = 0;
      while (sp.fired < sp.count && guard++ < 20) {
        const due = origin + sp.base + sp.t0 + sp.fired * sp.interval;
        if (now < due) break;
        this.spawnFoe(sp.def);
        sp.fired++;
      }
      if (sp.fired >= sp.count && sp.loop && sp.cycle < sp.loopMax) {
        const last = origin + sp.base + sp.t0 + (sp.count - 1) * sp.interval;
        if (now >= last + sp.loopEvery) {
          sp.base = last + sp.loopEvery - sp.t0 - origin;
          sp.fired = 0;
          sp.cycle++;
        }
      }
    }
  }

  spawnFoe(def) {
    const f = new Fighter(def, 'foe', this.length - SPAWN_MARGIN - Math.random() * 20, 1);
    f.row = this.foes.length % 4;
    this.foes.push(f);
    this.stats.spawned++;
  }

  triggerBoss() {
    if (this.bossTriggered) return;
    this.bossTriggered = true;
    this.bossTime = this.time;
    for (const sp of this.spawners) if (sp.boss) sp.armed = true;
    this.effects.push({ type: 'alert', t: 0, life: 120 });
  }

  /* ---------------------------------------------------------- 個体の更新 */
  step(f, foes, castle) {
    if (f.dead) return;
    f.anim += 1;
    if (f.flash > 0) f.flash--;

    if (f.state === 'kb') {
      f.kbT--;
      const p = 1 - f.kbT / f.kbDur;
      f.x = f.kbFrom + (f.kbTo - f.kbFrom) * easeOut(p);
      if (f.kbT <= 0) { f.state = 'walk'; f.timer = 0; }
      return;
    }

    if (f.state === 'attack') {
      f.timer++;
      if (!f.didHit && f.timer >= f.fore) {
        f.didHit = true;
        this.resolveHit(f, foes, castle);
      }
      if (f.timer >= f.rate) { f.state = 'walk'; f.timer = 0; f.didHit = false; }
      return;
    }

    // walk : 射程内に敵がいれば攻撃開始、いなければ前進
    if (this.hasTarget(f, foes, castle)) {
      if (f.atk > 0 || f.def.id === 'tank') {
        f.state = 'attack'; f.timer = 0; f.didHit = false;
        return;
      }
      return; // 攻撃力0で足止めだけする個体（ブロック像など）はその場で停止
    }
    f.x += f.dir * f.speed / FPS;
    // 城より先には行かない
    if (f.dir > 0) f.x = Math.min(f.x, castle.x);
    else f.x = Math.max(f.x, castle.x);
  }

  hasTarget(f, foes, castle) {
    const [lo, hi] = f.reach();
    if (castle.hp > 0 && castle.x >= lo && castle.x <= hi) return true;
    for (const o of foes) if (!o.dead && o.x >= lo && o.x <= hi) return true;
    return false;
  }

  /* ダメージ判定の瞬間。範囲攻撃なら射程内全部、単体なら最前線1体。 */
  resolveHit(f, foes, castle) {
    const [lo, hi] = f.reach();
    const list = [];
    for (const o of foes) if (!o.dead && o.x >= lo && o.x <= hi) list.push(o);

    // 進行方向にいちばん近い順
    list.sort((a, b) => (a.x - f.x) * f.dir - (b.x - f.x) * f.dir);

    const castleInRange = castle.hp > 0 && castle.x >= lo && castle.x <= hi;

    if (list.length === 0) {
      if (castleInRange) this.hitCastle(f, castle);
      return;
    }

    const targets = f.area ? list : [list[0]];
    for (const t of targets) this.damage(t, this.calcDamage(f, t), f);
    // 範囲攻撃は城も巻き込む
    if (castleInRange && (f.area || list.length === 0)) this.hitCastle(f, castle);

    this.fx('slash', f.x + f.dir * (f.range * 0.5), 0, f.side, f.area);
  }

  hitCastle(f, castle) {
    const dmg = f.atk;
    castle.hp = Math.max(0, castle.hp - dmg);
    castle.flash = 8;
    this.fx('slash', castle.x, 0, f.side, false);
    this.effects.push({ type: 'dmg', x: castle.x, y: 60, v: Math.round(dmg), t: 0, life: 40, side: f.side });
    if (castle === this.foeCastle) this.triggerBoss();
  }

  calcDamage(f, target) {
    let m = 1;
    const tt = target.traits || [];
    if (f.strong.some(t => tt.includes(t))) m *= 1.6;
    if (f.massive.some(t => tt.includes(t))) m *= 3.0;
    return f.atk * m;
  }

  damage(target, amount, attacker) {
    if (target.dead) return;
    // 「対〇〇」持ちは、その属性の敵から受けるダメージを軽減する
    if (attacker) {
      const at = attacker.traits || [];
      if ((target.strong || []).some(t => at.includes(t))) amount *= 0.55;
    }
    const before = target.hp;
    target.hp -= amount;
    target.flash = 6;

    if (this.effects.length < 70) {
      this.effects.push({
        type: 'dmg', x: target.x + (Math.random() - 0.5) * 40, y: 50 + Math.random() * 26,
        v: Math.round(amount), t: 0, life: 36, side: target.side === 'ally' ? 'foe' : 'ally',
      });
    }

    if (target.hp <= 0) { this.kill(target); return; }

    // ノックバック判定：HPをkb等分した境界を跨いだか
    const seg = target.segment;
    const idxBefore = Math.ceil(before / seg);
    const idxAfter = Math.ceil(target.hp / seg);
    if (idxAfter < idxBefore) this.knockback(target, 190 + Math.random() * 40);
  }

  knockback(f, dist) {
    f.state = 'kb';
    f.kbDur = 26;
    f.kbT = 26;
    f.kbFrom = f.x;
    let to = f.x - f.dir * dist;
    // 自陣の城より後ろには下がらない
    if (f.dir > 0) to = Math.max(to, SPAWN_MARGIN * 0.4);
    else to = Math.min(to, this.length - SPAWN_MARGIN * 0.4);
    f.kbTo = to;
    f.didHit = false;
    f.timer = 0;
  }

  kill(f) {
    f.dead = true;
    f.hp = 0;
    this.fx('pop', f.x, 0, f.side);
    if (f.side === 'foe') {
      this.stats.killed++;
      this.stats.xp += f.def.xp || 0;
      const gain = f.def.money || 0;
      this.money = Math.min(this.walletMax, this.money + gain);
      if (gain) this.effects.push({ type: 'coin', x: f.x, t: 0, life: 46, v: gain });
    }
  }

  cleanup() {
    this.allies = this.allies.filter(f => !f.dead);
    this.foes = this.foes.filter(f => !f.dead);
  }

  /* ---------------------------------------------------------- 演出 */
  fx(type, x, y, side, big) {
    this.effects.push({ type, x, y: y || 0, side, big: !!big, t: 0, life: type === 'pop' ? 26 : 18 });
  }

  updateEffects() {
    for (const e of this.effects) e.t++;
    this.effects = this.effects.filter(e => e.t < e.life);
  }

  /* ---------------------------------------------------------- 集計 */
  summary() {
    return {
      result: this.result,
      time: this.time,
      killed: this.stats.killed,
      xp: this.result === 'win' ? this.stage.xp + this.stats.xp : Math.floor(this.stats.xp * 0.3),
    };
  }
}

function easeOut(p) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 2.2); }
