/* ===========================================================================
 *  画面遷移・リスト構築・戦闘HUD
 * ======================================================================== */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* キャラのアイコンを ART からその場で描く */
function makeIcon(def, size, opts) {
  opts = opts || {};
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = size * dpr; c.height = size * dpr;
  c.style.width = size + 'px'; c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);

  const fake = {
    def, traits: def.traits || [], state: 'walk', anim: 12,
    timer: 0, rate: 100, fore: 50, hp: 1, maxHp: 1, dir: 1, kb: 1,
  };
  const k = (size / 90) / (def.scale || 1) * (opts.zoom || 1);
  ctx.save();
  ctx.translate(size / 2, size * 0.94);
  ctx.scale(k, k);
  (ART[def.art] || ART.cat)(ctx, fake);
  ctx.restore();
  return c;
}

function fmt(n) { return Math.floor(n).toLocaleString('ja-JP'); }
function mmss(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}

const UI = {
  current: 'scr-title',
  pendingStage: null,
  bossShown: false,
  unitBtns: [],

  init() {
    $$('[data-go]').forEach(b => b.addEventListener('click', () => this.show(b.dataset.go)));
    $$('[data-close-modal]').forEach(b => b.addEventListener('click', () => this.closeModals()));

    $('#btn-start').addEventListener('click', () => { this.buildStageList(); this.show('scr-map'); });
    $('#btn-howto').addEventListener('click', () => this.openModal('modal-howto'));
    $('#btn-reset').addEventListener('click', () => {
      if (confirm('進行データをすべて消します。よろしいですか？')) { Save.reset(); location.reload(); }
    });
    $('#btn-open-upgrade').addEventListener('click', () => { this.buildUpgradeList(); this.show('scr-upgrade'); });
    $('#btn-sortie').addEventListener('click', () => { this.closeModals(); Game.start(this.pendingStage); });

    $('#btn-result-map').addEventListener('click', () => { this.closeModals(); this.buildStageList(); this.show('scr-map'); });
    $('#btn-result-retry').addEventListener('click', () => { this.closeModals(); Game.start(Game.battle.stage); });
    $('#btn-result-next').addEventListener('click', () => {
      this.closeModals();
      const next = STAGE_BY_ID[Game.battle.stage.id + 1];
      if (next && Save.isUnlocked(next.id)) { this.buildStageList(); this.openTeam(next); this.show('scr-map'); }
      else { this.buildStageList(); this.show('scr-map'); }
    });

    this.drawTitle();
  },

  /* --------------------------------------------------------- 画面 */
  show(id) {
    $$('.screen').forEach(s => s.classList.toggle('show', s.id === id));
    this.current = id;
    if (id === 'scr-map') $('#map-xp').textContent = fmt(Save.data.xp);
    if (id === 'scr-upgrade') $('#up-xp').textContent = fmt(Save.data.xp);
  },

  openModal(id) { $('#' + id).classList.add('show'); },
  closeModals() { $$('.modal').forEach(m => m.classList.remove('show')); },

  /* --------------------------------------------------------- タイトル絵 */
  drawTitle() {
    const c = $('#title-canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 360 * dpr; c.height = 200 * dpr;
    c.style.width = '360px'; c.style.height = '200px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const cast = [
      { def: UNIT_BY_ID.tank, x: 62, s: 1.0 },
      { def: UNIT_BY_ID.cat, x: 128, s: 1.05 },
      { def: ENEMY_BY_ID.doge, x: 236, s: 1.0, flip: true },
      { def: ENEMY_BY_ID.hippo, x: 306, s: 0.95, flip: true },
    ];
    for (const m of cast) {
      const fake = {
        def: m.def, traits: m.def.traits || [], state: 'walk', anim: Math.random() * 30,
        timer: 0, rate: 100, fore: 50, hp: 1, maxHp: 1, kb: 1,
      };
      ctx.save();
      ctx.translate(m.x, 188);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.scale((m.flip ? -1 : 1) * 1.25 * m.s, 1.25 * m.s);
      (ART[m.def.art] || ART.cat)(ctx, fake);
      ctx.restore();
    }
  },

  /* --------------------------------------------------------- ステージ一覧 */
  buildStageList() {
    const wrap = $('#stage-list');
    wrap.innerHTML = '';
    for (const st of STAGES) {
      const unlocked = Save.isUnlocked(st.id);
      const cleared = Save.isCleared(st.id);
      const el = document.createElement('div');
      el.className = 'stage-card' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
      const best = Save.data.bestTime[st.id];
      const reward = st.unlock ? `初回クリアで「${UNIT_BY_ID[st.unlock].name}」解放` : `報酬 XP ${st.xp}`;
      el.innerHTML = `
        <div class="stage-no">${st.id}</div>
        <div class="stage-meta">
          <div class="n">${unlocked ? st.name : '？？？'}</div>
          <div class="d">${unlocked ? reward : '前のステージをクリアで開放'}${best ? ' ・ 最速 ' + mmss(best) : ''}</div>
        </div>
        <div class="stage-flag">${cleared ? '🏳️' : unlocked ? '⚔️' : '🔒'}</div>`;
      if (unlocked) el.addEventListener('click', () => this.openTeam(st));
      wrap.appendChild(el);
    }
    $('#map-xp').textContent = fmt(Save.data.xp);
  },

  /* --------------------------------------------------------- 編成 */
  openTeam(stage) {
    this.pendingStage = stage;
    $('#team-stage-name').textContent = `${stage.id}. ${stage.name}`;
    $('#team-stage-info').textContent =
      `自城 ${fmt(stage.baseHp)} / 敵城 ${fmt(stage.enemyBaseHp)} ・ 報酬 XP ${stage.xp}`;
    this.renderTeam();
    this.openModal('modal-team');
  },

  renderTeam() {
    const wrap = $('#team-list');
    wrap.innerHTML = '';
    for (const id of Save.data.owned) {
      const u = UNIT_BY_ID[id];
      const on = Save.data.loadout.includes(id);
      const el = document.createElement('div');
      el.className = 'team-item' + (on ? ' on' : '');
      el.appendChild(makeIcon(u, 52));
      const n = document.createElement('div');
      n.className = 'tn'; n.textContent = u.name;
      const c = document.createElement('div');
      c.className = 'tc'; c.textContent = `¢${u.cost} / Lv${Save.levelOf(id)}`;
      el.appendChild(n); el.appendChild(c);
      if (on) {
        const s = document.createElement('div');
        s.className = 'slot'; s.textContent = Save.data.loadout.indexOf(id) + 1;
        el.appendChild(s);
      }
      el.addEventListener('click', () => { Save.toggleLoadout(id); this.renderTeam(); });
      wrap.appendChild(el);
    }
    $('#team-count').textContent = Save.data.loadout.length;
  },

  /* --------------------------------------------------------- 強化画面 */
  buildUpgradeList() {
    const wrap = $('#upgrade-list');
    wrap.innerHTML = '';

    // ネコキャノン
    const cc = document.createElement('div');
    cc.className = 'up-card';
    const cost = Save.cannonCost();
    cc.innerHTML = `
      <div class="up-icon" style="display:grid;place-items:center;font-size:28px">💥</div>
      <div class="up-body">
        <div class="up-name">ネコキャノン <span class="up-lv">Lv${Save.data.cannonLevel}</span></div>
        <div class="up-stats">威力 ${fmt(CANNON.damage * (1 + (Save.data.cannonLevel - 1) * 0.25))} ・ 射程 ${CANNON.range} ・ 充填 25秒</div>
        <div class="up-desc">敵をまとめて吹き飛ばす。押されている時の切り札。</div>
      </div>
      <div class="up-action">
        <button class="btn sm accent" ${Save.canUpgradeCannon() ? '' : 'disabled'}>強化</button>
        <span class="cost">${cost == null ? 'MAX' : 'XP ' + fmt(cost)}</span>
      </div>`;
    cc.querySelector('button').addEventListener('click', () => {
      if (Save.upgradeCannon()) this.buildUpgradeList();
    });
    wrap.appendChild(cc);

    for (const id of Save.data.owned) {
      const u = UNIT_BY_ID[id];
      const lv = Save.levelOf(id);
      const m = 1 + (lv - 1) * LEVEL_STEP;
      const cost = lv < LEVEL_MAX ? Save.levelCost(lv) : null;
      const dps = (u.atk * m) / (u.rate / 60);
      const tags = [];
      if (u.area) tags.push('範囲');
      (u.strong || []).forEach(t => tags.push('対' + TRAITS[t].label.replace('い敵', '').replace('てる敵', 'き')));

      const el = document.createElement('div');
      el.className = 'up-card';
      const icon = makeIcon(u, 56);
      const body = document.createElement('div');
      body.className = 'up-body';
      body.innerHTML = `
        <div class="up-name">${u.name} <span class="up-lv">Lv${lv}</span>
          ${tags.map(t => `<span class="up-tag">${t}</span>`).join('')}</div>
        <div class="up-stats">
          体力 ${fmt(u.hp * m)} ・ 攻撃 ${fmt(u.atk * m)} ・ DPS ${fmt(dps)}<br>
          射程 ${u.range} ・ 速さ ${u.speed} ・ コスト ¢${u.cost} ・ 再出撃 ${(u.cooldown / 60).toFixed(1)}秒
        </div>
        <div class="up-desc">${u.desc}</div>`;
      const act = document.createElement('div');
      act.className = 'up-action';
      const btn = document.createElement('button');
      btn.className = 'btn sm';
      btn.textContent = 'Lv UP';
      btn.disabled = !Save.canLevelUp(id);
      btn.addEventListener('click', () => { if (Save.levelUp(id)) this.buildUpgradeList(); });
      const cs = document.createElement('span');
      cs.className = 'cost';
      cs.textContent = cost == null ? 'MAX' : 'XP ' + fmt(cost);
      act.appendChild(btn); act.appendChild(cs);

      const wrapIcon = document.createElement('div');
      wrapIcon.className = 'up-icon';
      wrapIcon.style.display = 'grid'; wrapIcon.style.placeItems = 'center';
      wrapIcon.appendChild(icon);

      el.appendChild(wrapIcon); el.appendChild(body); el.appendChild(act);
      wrap.appendChild(el);
    }
    $('#up-xp').textContent = fmt(Save.data.xp);
  },

  /* --------------------------------------------------------- 戦闘HUD */
  buildUnitBar(b) {
    const bar = $('#unit-bar');
    bar.innerHTML = '';
    this.unitBtns = [];
    b.loadout.forEach((id, i) => {
      const u = UNIT_BY_ID[id];
      const btn = document.createElement('button');
      btn.className = 'unit-btn';
      btn.innerHTML = `<span class="key">${i + 1}</span>`;
      btn.appendChild(makeIcon(u, 44));
      const cost = document.createElement('span');
      cost.className = 'cost'; cost.textContent = u.cost;
      const cd = document.createElement('div');
      cd.className = 'cd';
      btn.appendChild(cost); btn.appendChild(cd);
      btn.addEventListener('click', () => Game.deploy(id));
      bar.appendChild(btn);
      this.unitBtns.push({ id, btn, cd, def: u });
    });
    this.bossShown = false;
  },

  syncHud(b) {
    // 城HP
    const a = Math.max(0, b.allyCastle.hp / b.allyCastle.maxHp);
    const f = Math.max(0, b.foeCastle.hp / b.foeCastle.maxHp);
    $('#hp-ally').style.width = (a * 100) + '%';
    $('#hp-foe').style.width = (f * 100) + '%';
    $('#hp-ally-txt').textContent = fmt(Math.max(0, b.allyCastle.hp));
    $('#hp-foe-txt').textContent = fmt(Math.max(0, b.foeCastle.hp));
    $('#hud-time').textContent = mmss(b.time);

    // 財布
    $('#wallet-fill').style.width = (b.money / b.walletMax * 100) + '%';
    $('#wallet-txt').textContent = `${fmt(b.money)} / ${fmt(b.walletMax)}`;
    const wc = b.upgradeCost;
    const wbtn = $('#btn-worker');
    $('#worker-lv').textContent = 'Lv' + b.workerLevel;
    $('#worker-cost').textContent = wc == null ? 'MAX' : fmt(wc);
    wbtn.disabled = wc == null || b.money < wc;

    // 出撃ボタン
    for (const ub of this.unitBtns) {
      const cool = b.cool[ub.id];
      ub.cd.style.height = (cool / ub.def.cooldown * 100) + '%';
      const poor = b.money < ub.def.cost;
      ub.btn.classList.toggle('poor', poor);
      ub.btn.disabled = !!b.result;
    }

    // キャノン
    const cbtn = $('#btn-cannon');
    cbtn.classList.toggle('ready', b.cannonReady);
    this.drawCannonRing(b.cannonRatio, b.cannonReady);

    // ボス警告
    if (b.bossTriggered && !this.bossShown) {
      this.bossShown = true;
      const el = $('#boss-alert');
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
    }
  },

  drawCannonRing(ratio, ready) {
    const c = $('#cannon-canvas');
    if (!c._init) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = 46 * dpr; c.height = 46 * dpr;
      c.style.width = '46px'; c.style.height = '46px';
      c._dpr = dpr; c._init = true;
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(c._dpr, 0, 0, c._dpr, 0, 0);
    ctx.clearRect(0, 0, 46, 46);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.arc(23, 23, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = ready ? '#ffe066' : '#8fd0ff';
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(23, 23, 17, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); ctx.stroke();
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(ready ? '!' : Math.floor(ratio * 100) + '', 23, 24);
  },

  /* --------------------------------------------------------- リザルト */
  showResult(b) {
    const win = b.result === 'win';
    const s = b.summary();
    let res = { first: false, unlocked: null };
    if (win) {
      res = Save.clearStage(b.stage, s);
    } else {
      Save.data.totalKills += s.killed;
      Save.addXp(s.xp);   // 負けても撃破分のXPは少し入る
    }

    $('#result-title').textContent = win ? '勝利！' : '敗北…';
    $('#result-body').innerHTML = `
      <div class="row"><span>ステージ</span><span>${b.stage.id}. ${b.stage.name}</span></div>
      <div class="row"><span>撃破数</span><span>${s.killed}</span></div>
      <div class="row"><span>タイム</span><span>${mmss(s.time)}</span></div>
      <div class="row"><span>獲得XP</span><b>+${fmt(s.xp)}</b></div>
      <div class="row"><span>所持XP</span><span>${fmt(Save.data.xp)}</span></div>`;

    const un = $('#result-unlock');
    un.classList.remove('show');
    un.innerHTML = '';
    if (res.unlocked) {
      un.classList.add('show');
      un.innerHTML = `<div>新しい仲間！ <b>${res.unlocked.name}</b></div><div class="muted sm">${res.unlocked.desc}</div>`;
      un.insertBefore(makeIcon(res.unlocked, 72), un.firstChild);
    }

    const next = STAGE_BY_ID[b.stage.id + 1];
    $('#btn-result-next').style.display = (win && next) ? '' : 'none';
    this.openModal('modal-result');
  },
};
