/* ===========================================================================
 *  セーブデータ（localStorage）
 * ======================================================================== */

const SAVE_KEY = 'nyanko-wars-save-v1';

const Save = {
  data: null,

  defaults() {
    return {
      version: 1,
      xp: 0,
      cleared: [],
      owned: START_UNITS.slice(),
      levels: Object.fromEntries(START_UNITS.map(id => [id, 1])),
      cannonLevel: 1,
      loadout: START_UNITS.slice(),
      bestTime: {},
      totalKills: 0,
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      this.data = raw ? Object.assign(this.defaults(), JSON.parse(raw)) : this.defaults();
    } catch (e) {
      this.data = this.defaults();
    }
    // 破損・旧版データの補修
    for (const id of this.data.owned) if (!this.data.levels[id]) this.data.levels[id] = 1;
    this.data.owned = this.data.owned.filter(id => UNIT_BY_ID[id]);
    this.data.loadout = this.data.loadout.filter(id => this.data.owned.includes(id));
    if (!this.data.loadout.length) this.data.loadout = this.data.owned.slice(0, 6);
    return this.data;
  },

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* 容量超過等は無視 */ }
  },

  reset() {
    this.data = this.defaults();
    this.save();
  },

  /* --------------------------------------------------------- 進行判定 */
  isCleared(id) { return this.data.cleared.includes(id); },

  isUnlocked(stageId) {
    return stageId === 1 || this.isCleared(stageId - 1);
  },

  clearStage(stage, summary) {
    const first = !this.isCleared(stage.id);
    if (first) this.data.cleared.push(stage.id);
    this.data.xp += summary.xp;
    this.data.totalKills += summary.killed;
    const t = this.data.bestTime[stage.id];
    if (!t || summary.time < t) this.data.bestTime[stage.id] = summary.time;

    let unlocked = null;
    if (first && stage.unlock && !this.data.owned.includes(stage.unlock)) {
      this.data.owned.push(stage.unlock);
      this.data.levels[stage.unlock] = 1;
      if (this.data.loadout.length < 6) this.data.loadout.push(stage.unlock);
      unlocked = UNIT_BY_ID[stage.unlock];
    }
    this.save();
    return { first, unlocked };
  },

  addXp(n) { this.data.xp += n; this.save(); },

  /* --------------------------------------------------------- 強化 */
  levelOf(id) { return this.data.levels[id] || 1; },

  levelCost(level) { return Math.round(40 * Math.pow(level, 1.3) / 5) * 5; },

  canLevelUp(id) {
    const lv = this.levelOf(id);
    return lv < LEVEL_MAX && this.data.xp >= this.levelCost(lv);
  },

  levelUp(id) {
    if (!this.canLevelUp(id)) return false;
    this.data.xp -= this.levelCost(this.levelOf(id));
    this.data.levels[id] = this.levelOf(id) + 1;
    this.save();
    return true;
  },

  cannonCost() {
    const lv = this.data.cannonLevel;
    return lv >= 10 ? null : Math.round(180 * Math.pow(lv, 1.45) / 5) * 5;
  },

  canUpgradeCannon() {
    const c = this.cannonCost();
    return c != null && this.data.xp >= c;
  },

  upgradeCannon() {
    if (!this.canUpgradeCannon()) return false;
    this.data.xp -= this.cannonCost();
    this.data.cannonLevel++;
    this.save();
    return true;
  },

  /* --------------------------------------------------------- 編成 */
  toggleLoadout(id) {
    const i = this.data.loadout.indexOf(id);
    if (i >= 0) {
      if (this.data.loadout.length <= 1) return false;
      this.data.loadout.splice(i, 1);
    } else {
      if (this.data.loadout.length >= 6) return false;
      this.data.loadout.push(id);
    }
    this.save();
    return true;
  },
};
