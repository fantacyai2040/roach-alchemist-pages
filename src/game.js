export const MODULES = {
  armor: "外骨骼",
  antenna: "触角感知",
  mandible: "啃食效率"
};

const INITIAL_LOG = [
  "夜幕落下，镜头贴近潮湿的墙根。",
  "一只美洲大蠊伸出触角，读取空气里的糖、油脂和危险。",
  "任务很简单：找到食物，保存水分，赶在天亮前回到缝隙。"
];

export function createGameState(config = {}) {
  return {
    hp: config.hp ?? 100,
    maxHp: config.maxHp ?? 100,
    energy: config.energy ?? 100,
    maxEnergy: config.maxEnergy ?? 100,
    goldDust: config.goldDust ?? 0,
    scrapParts: config.scrapParts ?? 0,
    days: config.days ?? 1,
    alive: config.alive ?? true,
    modules: {
      armor: config.modules?.armor ?? 1,
      antenna: config.modules?.antenna ?? 1,
      mandible: config.modules?.mandible ?? 1
    },
    log: [...(config.log ?? INITIAL_LOG)]
  };
}

export function explore(state, rng = Math.random) {
  if (!state.alive) {
    return appendLog(state, "这段观察已经结束。请重新开始。");
  }

  const energyCost = randomInt(rng, 12, 20);
  let next = {
    ...state,
    days: state.days + 1,
    energy: state.energy - energyCost,
    log: [
      ...state.log,
      "",
      `[第 ${state.days + 1} 夜] 镜头推进。你沿着墙脚进入开阔地带，消耗 ${energyCost} 点水分与能量。`
    ]
  };

  if (next.energy <= 0) {
    return kill(next, "水分耗尽。你停在尘土里，触角慢慢垂下。");
  }

  const events = [
    findGold,
    findEnergy,
    combatRat,
    scavengeWreck,
    radiationLeak
  ];
  const eventIndex = Math.floor(rng() * events.length);
  return events[eventIndex](next, rng);
}

export function repair(state) {
  if (!state.alive) return appendLog({ ...state, lastEvent: "blocked" }, "这段观察已经结束。");
  if (state.scrapParts < 5) return appendLog({ ...state, lastEvent: "blocked" }, "隐蔽点不足：安全休整需要 5 处可靠缝隙。");
  if (state.hp >= state.maxHp) return appendLog({ ...state, lastEvent: "blocked" }, "体况良好，暂时不需要休整。");

  return appendLog({
    ...state,
    scrapParts: state.scrapParts - 5,
    hp: Math.min(state.maxHp, state.hp + 30),
    lastEvent: "shelter"
  }, "你退入狭窄缝隙，整理触角，清洁外骨骼，体况恢复。");
}

export function upgrade(state, moduleKey) {
  if (!state.alive) return appendLog({ ...state, lastEvent: "blocked" }, "这段观察已经结束。");
  if (!Object.hasOwn(MODULES, moduleKey)) return appendLog({ ...state, lastEvent: "blocked" }, "未知生存能力。");
  if (state.scrapParts < 15) return appendLog({ ...state, lastEvent: "blocked" }, `隐蔽点不足：提升${MODULES[moduleKey]}需要 15 处可靠缝隙。`);

  const modules = { ...state.modules, [moduleKey]: state.modules[moduleKey] + 1 };
  const next = {
    ...state,
    scrapParts: state.scrapParts - 15,
    modules
  };

  if (moduleKey === "antenna") {
    return appendLog({
      ...next,
      maxEnergy: state.maxEnergy + 20,
      energy: state.energy + 20,
      lastEvent: "sense"
    }, "触角对湿度和气味的变化更敏感，水分与能量上限提升。");
  }

  const lines = {
    armor: "新一轮蜕壳后，外骨骼更坚韧。",
    mandible: "口器更善于处理干硬碎屑，觅食效率提升。"
  };
  return appendLog({ ...next, lastEvent: moduleKey }, lines[moduleKey]);
}

function findGold(state, rng) {
  const baseGold = randomInt(rng, 10, 25);
  const bonus = baseGold * (state.modules.mandible - 1) * 0.5;
  const totalGold = Math.floor(baseGold + bonus);
  return appendLog({
    ...state,
    goldDust: state.goldDust + totalGold,
    lastEvent: "food"
  }, `镜头捕捉到一片饼干碎屑。你迅速啃食，储备 ${totalGold} mg 食物。`);
}

function findEnergy(state, rng) {
  const charge = randomInt(rng, 30, 50);
  return appendLog({
    ...state,
    energy: Math.min(state.maxEnergy, state.energy + charge),
    lastEvent: "water"
  }, `水管外壁凝结出微小水珠。你停下饮水，水分与能量恢复 ${charge} 点。`);
}

function scavengeWreck(state, rng) {
  const parts = randomInt(rng, 3, 8);
  return appendLog({
    ...state,
    scrapParts: state.scrapParts + parts,
    lastEvent: "shelter"
  }, `你找到一组互通的墙缝和纸箱褶皱，记录 ${parts} 处隐蔽点。`);
}

function radiationLeak(state, rng) {
  const damage = Math.max(5, randomInt(rng, 15, 30) - state.modules.armor * 3);
  const next = {
    ...state,
    hp: state.hp - damage,
    lastEvent: "danger"
  };
  if (next.hp <= 0) {
    return kill(next, `杀虫剂残留覆盖地面，你失去 ${damage} 点体况，没能离开这片白色粉末。`);
  }
  return appendLog(next, `你穿过一片杀虫剂残留。外骨骼挡下部分伤害，但仍失去 ${damage} 点体况。`);
}

function combatRat(state, rng) {
  const playerAttack = randomInt(rng, 10, 20) * state.modules.mandible;
  const enemyHp = randomInt(rng, 20, 40);

  if (playerAttack >= enemyHp) {
    const loot = randomInt(rng, 2, 5);
    return appendLog({
      ...state,
      scrapParts: state.scrapParts + loot,
      lastEvent: "escape"
    }, `脚步声逼近。你抢先钻入冰箱底部，顺路发现 ${loot} 处隐蔽点。`);
  }

  const damage = Math.max(10, randomInt(rng, 20, 35) - state.modules.armor * 4);
  const next = {
    ...state,
    hp: state.hp - damage,
    lastEvent: "danger"
  };
  if (next.hp <= 0) {
    return kill(next, `拖鞋阴影落下。你受到了 ${damage} 点体况伤害，镜头切黑。`);
  }
  return appendLog(next, `拖鞋阴影从头顶掠过。你冲进暗处，但受到了 ${damage} 点体况伤害。`);
}

function kill(state, line) {
  return appendLog({
    ...state,
    hp: Math.max(0, state.hp),
    energy: Math.max(0, state.energy),
    alive: false
  }, `${line} 本段观察结束。`);
}

function appendLog(state, line) {
  return {
    ...state,
    log: [...state.log, line].slice(-42)
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
