import {
  createGameState,
  explore,
  repair,
  upgrade
} from "./game.js?v=roach-20260601";

const ui = {
  days: document.querySelector("#days"),
  gold: document.querySelector("#gold"),
  scrap: document.querySelector("#scrap"),
  hp: document.querySelector("#hp"),
  energy: document.querySelector("#energy"),
  hpText: document.querySelector("#hp-text"),
  energyText: document.querySelector("#energy-text"),
  armor: document.querySelector("#armor"),
  antenna: document.querySelector("#antenna"),
  mandible: document.querySelector("#mandible"),
  log: document.querySelector("#log"),
  explore: document.querySelector("#explore"),
  repair: document.querySelector("#repair"),
  upgradeArmor: document.querySelector("#upgrade-armor"),
  upgradeAntenna: document.querySelector("#upgrade-antenna"),
  upgradeMandible: document.querySelector("#upgrade-mandible"),
  restart: document.querySelector("#restart")
};

let state = createGameState();

bindActions();
render();

function bindActions() {
  ui.explore.addEventListener("click", () => update(explore(state)));
  ui.repair.addEventListener("click", () => update(repair(state)));
  ui.upgradeArmor.addEventListener("click", () => update(upgrade(state, "armor")));
  ui.upgradeAntenna.addEventListener("click", () => update(upgrade(state, "antenna")));
  ui.upgradeMandible.addEventListener("click", () => update(upgrade(state, "mandible")));
  ui.restart.addEventListener("click", () => update(createGameState()));
}

function update(nextState) {
  state = nextState;
  render();
}

function render() {
  ui.days.textContent = state.days;
  ui.gold.textContent = `${state.goldDust} mg`;
  ui.scrap.textContent = state.scrapParts;
  ui.hp.value = state.hp;
  ui.hp.max = state.maxHp;
  ui.energy.value = state.energy;
  ui.energy.max = state.maxEnergy;
  ui.hpText.textContent = `${state.hp}/${state.maxHp}`;
  ui.energyText.textContent = `${state.energy}/${state.maxEnergy}`;
  ui.armor.textContent = `Lv.${state.modules.armor}`;
  ui.antenna.textContent = `Lv.${state.modules.antenna}`;
  ui.mandible.textContent = `Lv.${state.modules.mandible}`;
  ui.log.innerHTML = state.log.map(formatLine).join("");
  ui.log.scrollTop = ui.log.scrollHeight;

  document.body.dataset.alive = String(state.alive);
  ui.explore.disabled = !state.alive;
  ui.repair.disabled = !state.alive;
  ui.upgradeArmor.disabled = !state.alive;
  ui.upgradeAntenna.disabled = !state.alive;
  ui.upgradeMandible.disabled = !state.alive;
}

function formatLine(line) {
  if (line === "") return "<div class=\"log-gap\"></div>";
  const cls = line.includes("游戏结束") ? " danger-line" : line.startsWith("[第") ? " day-line" : "";
  return `<p class="log-line${cls}">${escapeHtml(line)}</p>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
