/* ===========================================================================
 *  にゃんこウォーズ  --  データ定義
 *  すべての数値は「1秒 = 60フレーム」「距離 = ワールドピクセル」で統一。
 *    speed  : px / 秒
 *    rate   : 攻撃1サイクルのフレーム数（この間は移動できない）
 *    fore   : サイクル開始から実際にダメージが出るまでのフレーム数（攻撃前隙）
 *    kb     : 体力を何分割してノックバックするか（多いほど吹き飛びやすい）
 * ======================================================================== */

const TRAITS = {
  red:      { label: '赤い敵',   color: '#e5484d' },
  floating: { label: '浮いてる敵', color: '#57b6ff' },
  black:    { label: '黒い敵',   color: '#7b6bd6' },
  metal:    { label: 'メタル',   color: '#9aa6b2' },
};

/* --------------------------------------------------------------------------
 *  自軍ユニット
 *  strong  : この属性に対して 攻撃x1.6 / 被ダメx0.55
 *  massive : この属性に対して 攻撃x3.0（超ダメージ）
 * ----------------------------------------------------------------------- */
const UNITS = [
  {
    id: 'cat', name: 'ネコ', role: '量産',
    cost: 75, cooldown: 120,
    hp: 260, atk: 26, range: 55, rate: 40, fore: 12, speed: 92, kb: 3,
    area: false, art: 'cat', scale: 1.0,
    desc: '安くて速い基本のネコ。数で押すのが猫の道。',
  },
  {
    id: 'tank', name: 'タンクネコ', role: '壁',
    cost: 150, cooldown: 150,
    hp: 1100, atk: 6, range: 45, rate: 60, fore: 20, speed: 72, kb: 4,
    area: false, art: 'tank', scale: 1.05,
    desc: '攻撃力は皆無だが硬い。味方が殴る時間を稼ぐ。',
  },
  {
    id: 'cow', name: 'ウシネコ', role: '対赤・速攻',
    cost: 210, cooldown: 190,
    hp: 340, atk: 58, range: 60, rate: 45, fore: 15, speed: 188, kb: 3,
    area: false, art: 'cow', scale: 1.0, strong: ['red'],
    desc: '爆走して赤い敵に噛みつく。足の速さは全ネコ随一。',
  },
  {
    id: 'axe', name: 'バトルネコ', role: '主力',
    cost: 320, cooldown: 240,
    hp: 620, atk: 115, range: 65, rate: 80, fore: 25, speed: 104, kb: 3,
    area: false, art: 'axe', scale: 1.08,
    desc: '斧を振り回すアタッカー。壁の後ろから前線を削る。',
  },
  {
    id: 'shroom', name: 'キノコネコ', role: '対黒・範囲',
    cost: 420, cooldown: 330,
    hp: 700, atk: 185, range: 80, rate: 110, fore: 40, speed: 76, kb: 3,
    area: true, art: 'shroom', scale: 1.12, strong: ['black'],
    desc: '胞子で薙ぎ払う範囲攻撃。黒い敵に滅法強い。',
  },
  {
    id: 'bird', name: 'トリネコ', role: '対浮き・遠距離',
    cost: 520, cooldown: 400,
    hp: 320, atk: 130, range: 285, rate: 130, fore: 50, speed: 82, kb: 4,
    area: true, art: 'bird', scale: 1.0, strong: ['floating'],
    desc: '後方から羽根を飛ばす。浮いてる敵を撃ち落とす。',
  },
  {
    id: 'lizard', name: 'トカゲネコ', role: '超遠距離',
    cost: 480, cooldown: 420,
    hp: 380, atk: 105, range: 345, rate: 100, fore: 35, speed: 66, kb: 3,
    area: false, art: 'lizard', scale: 1.02,
    desc: '射程345。壁さえ立てば一方的に殴り続けられる。',
  },
  {
    id: 'titan', name: '巨神ネコ', role: '大型',
    cost: 1250, cooldown: 900,
    hp: 5200, atk: 720, range: 100, rate: 150, fore: 60, speed: 46, kb: 2,
    area: true, art: 'titan', scale: 1.9,
    desc: '重い、遅い、強い。出すタイミングを間違えなければ勝つ。',
  },
];

/* --------------------------------------------------------------------------
 *  敵キャラ
 * ----------------------------------------------------------------------- */
const ENEMIES = [
  {
    id: 'doge', name: 'わんこ',
    hp: 120, atk: 25, range: 60, rate: 45, fore: 15, speed: 110, kb: 3,
    area: false, art: 'doge', scale: 0.95, traits: [], money: 30, xp: 4,
  },
  {
    id: 'reddoge', name: 'あかわんこ',
    hp: 460, atk: 78, range: 60, rate: 55, fore: 18, speed: 96, kb: 3,
    area: false, art: 'doge', scale: 1.05, traits: ['red'], money: 70, xp: 9,
  },
  {
    id: 'snake', name: 'にょろ',
    hp: 280, atk: 58, range: 135, rate: 70, fore: 25, speed: 74, kb: 3,
    area: false, art: 'snake', scale: 1.0, traits: [], money: 60, xp: 8,
  },
  {
    id: 'bat', name: 'ふわこうもり',
    hp: 340, atk: 42, range: 70, rate: 35, fore: 12, speed: 168, kb: 4,
    area: false, art: 'bat', scale: 0.95, traits: ['floating'], money: 75, xp: 10,
  },
  {
    id: 'statue', name: 'ブロック像',
    hp: 3000, atk: 0, range: 0, rate: 120, fore: 60, speed: 0, kb: 1,
    area: false, art: 'statue', scale: 1.25, traits: [], money: 180, xp: 22,
  },
  {
    id: 'gorilla', name: 'ゴリさん',
    hp: 1300, atk: 150, range: 90, rate: 95, fore: 35, speed: 58, kb: 2,
    area: true, art: 'gorilla', scale: 1.3, traits: ['black'], money: 200, xp: 26,
  },
  {
    id: 'hippo', name: 'カバちゃん',
    hp: 2800, atk: 320, range: 80, rate: 110, fore: 40, speed: 50, kb: 2,
    area: false, art: 'hippo', scale: 1.45, traits: [], money: 320, xp: 40,
  },
  {
    id: 'redhippo', name: 'あかカバちゃん', boss: true,
    hp: 6400, atk: 500, range: 85, rate: 105, fore: 38, speed: 46, kb: 2,
    area: false, art: 'hippo', scale: 1.6, traits: ['red'], money: 700, xp: 90,
  },
  {
    id: 'general', name: 'ブラック大将', boss: true,
    hp: 11500, atk: 820, range: 125, rate: 130, fore: 45, speed: 40, kb: 1,
    area: true, art: 'general', scale: 1.85, traits: ['black'], money: 1400, xp: 180,
  },
];

/* --------------------------------------------------------------------------
 *  ステージ
 *    spawns[] : { id, t, count, interval, boss }
 *      t        … 開始からの秒数（boss:true の場合は「敵城を初めて叩いてから」の秒数）
 *      count    … 出現数（省略時1）
 *      interval … 2体目以降の間隔（秒）
 *      loop     … true なら count 体出したあと loopEvery 秒ごとに再出現
 * ----------------------------------------------------------------------- */
const STAGES = [
  {
    id: 1, name: 'ネコ島 のはらっぱ', theme: 'grass', length: 3000,
    baseHp: 3000, enemyBaseHp: 1600, xp: 120, unlock: 'tank',
    spawns: [
      { id: 'doge', t: 2, count: 4, interval: 7 },
      { id: 'doge', t: 34, count: 4, interval: 5 },
      { id: 'doge', boss: true, t: 0, count: 3, interval: 3 },
    ],
  },
  {
    id: 2, name: 'ネコ島 いぬの丘', theme: 'grass', length: 3200,
    baseHp: 3000, enemyBaseHp: 2300, xp: 180, unlock: 'cow',
    spawns: [
      { id: 'doge', t: 1, count: 5, interval: 5 },
      { id: 'reddoge', t: 24, count: 1 },
      { id: 'doge', t: 30, count: 6, interval: 4 },
      { id: 'reddoge', boss: true, t: 1, count: 2, interval: 6 },
    ],
  },
  {
    id: 3, name: 'にょろにょろ湿原', theme: 'swamp', length: 3400,
    baseHp: 3500, enemyBaseHp: 3000, xp: 260, unlock: 'axe',
    spawns: [
      { id: 'snake', t: 3, count: 2, interval: 12 },
      { id: 'doge', t: 8, count: 6, interval: 5 },
      { id: 'snake', t: 34, count: 3, interval: 9 },
      { id: 'reddoge', boss: true, t: 0, count: 2, interval: 5 },
      { id: 'snake', boss: true, t: 4, count: 2, interval: 7 },
    ],
  },
  {
    id: 4, name: 'こうもり洞窟', theme: 'cave', length: 3400,
    baseHp: 3500, enemyBaseHp: 3600, xp: 340, unlock: 'bird',
    spawns: [
      { id: 'bat', t: 2, count: 3, interval: 8 },
      { id: 'doge', t: 10, count: 6, interval: 5 },
      { id: 'bat', t: 30, count: 4, interval: 6 },
      { id: 'bat', boss: true, t: 0, count: 5, interval: 3 },
      { id: 'snake', boss: true, t: 6, count: 2, interval: 8 },
    ],
  },
  {
    id: 5, name: '石像のならぶ道', theme: 'cave', length: 3600,
    baseHp: 4000, enemyBaseHp: 4300, xp: 430, unlock: 'shroom',
    spawns: [
      { id: 'statue', t: 0, count: 1 },
      { id: 'doge', t: 6, count: 8, interval: 4 },
      { id: 'snake', t: 20, count: 3, interval: 10 },
      { id: 'statue', boss: true, t: 0, count: 1 },
      { id: 'bat', boss: true, t: 2, count: 4, interval: 4 },
      { id: 'reddoge', boss: true, t: 8, count: 3, interval: 5 },
    ],
  },
  {
    id: 6, name: 'ゴリラ山 中腹', theme: 'mountain', length: 3800,
    baseHp: 4500, enemyBaseHp: 5200, xp: 540, unlock: 'lizard',
    spawns: [
      { id: 'doge', t: 2, count: 6, interval: 5, loop: true, loopEvery: 12, loops: 3 },
      { id: 'gorilla', t: 25, count: 1 },
      { id: 'snake', t: 40, count: 2, interval: 10 },
      { id: 'gorilla', boss: true, t: 0, count: 1 },
      { id: 'reddoge', boss: true, t: 3, count: 4, interval: 4 },
    ],
  },
  {
    id: 7, name: 'カバの水辺', theme: 'swamp', length: 3800,
    baseHp: 4500, enemyBaseHp: 6200, xp: 680, unlock: null,
    spawns: [
      { id: 'doge', t: 1, count: 8, interval: 4, loop: true, loopEvery: 14, loops: 3 },
      { id: 'bat', t: 18, count: 4, interval: 7 },
      { id: 'hippo', t: 45, count: 1 },
      { id: 'hippo', boss: true, t: 0, count: 1 },
      { id: 'snake', boss: true, t: 4, count: 4, interval: 6 },
    ],
  },
  {
    id: 8, name: 'ゴリラ山 山頂', theme: 'mountain', length: 4000,
    baseHp: 5000, enemyBaseHp: 7400, xp: 850, unlock: null,
    spawns: [
      { id: 'reddoge', t: 2, count: 4, interval: 8, loop: true, loopEvery: 18, loops: 3 },
      { id: 'gorilla', t: 20, count: 2, interval: 25 },
      { id: 'statue', t: 35, count: 1 },
      { id: 'gorilla', boss: true, t: 0, count: 2, interval: 12 },
      { id: 'bat', boss: true, t: 5, count: 6, interval: 3 },
    ],
  },
  {
    id: 9, name: 'あかカバ襲来', theme: 'grass', length: 4000,
    baseHp: 5500, enemyBaseHp: 9000, xp: 1050, unlock: 'titan',
    spawns: [
      { id: 'doge', t: 1, count: 10, interval: 4, loop: true, loopEvery: 12, loops: 3 },
      { id: 'reddoge', t: 15, count: 4, interval: 9 },
      { id: 'hippo', t: 40, count: 1 },
      { id: 'redhippo', boss: true, t: 0, count: 1 },
      { id: 'reddoge', boss: true, t: 5, count: 5, interval: 5 },
    ],
  },
  {
    id: 10, name: 'ブラック大将の城', theme: 'castle', length: 4200,
    baseHp: 6000, enemyBaseHp: 13000, xp: 1500, unlock: null,
    spawns: [
      { id: 'doge', t: 1, count: 8, interval: 4, loop: true, loopEvery: 10, loops: 4 },
      { id: 'snake', t: 12, count: 4, interval: 8 },
      { id: 'gorilla', t: 30, count: 2, interval: 20 },
      { id: 'hippo', t: 55, count: 1 },
      { id: 'general', boss: true, t: 0, count: 1 },
      { id: 'gorilla', boss: true, t: 6, count: 3, interval: 10 },
      { id: 'reddoge', boss: true, t: 3, count: 6, interval: 4 },
    ],
  },
];

/* --------------------------------------------------------------------------
 *  働きネコ（財布）とネコキャノン
 * ----------------------------------------------------------------------- */
const WORKER = {
  // レベル1〜8。income は 1秒あたりの獲得額、max は所持上限
  income: [40, 62, 88, 118, 152, 192, 238, 292],
  max:    [1500, 2600, 4000, 5800, 8000, 11000, 15000, 20000],
  // レベルアップに必要な金額（レベル1→2 が cost[0]）
  cost:   [200, 420, 720, 1120, 1650, 2350, 3200],
};

const CANNON = {
  chargeFrames: 1500,   // 25秒でフル
  damage: 450,
  knockback: 260,       // 吹き飛ばす距離
  range: 900,           // 自城から届く距離
};

const START_UNITS = ['cat'];
const DEPLOY_LIMIT = 30;
const LEVEL_MAX = 20;
const LEVEL_STEP = 0.20;  // 1レベルごとに基礎値の20%上乗せ

const UNIT_BY_ID = Object.fromEntries(UNITS.map(u => [u.id, u]));
const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map(e => [e.id, e]));
const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));
