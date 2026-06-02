import {
  createGameState,
  explore,
  repair,
  upgrade
} from "./game.js?v=roach-20260601";

const ui = {
  canvas: document.querySelector("#wildlife-canvas"),
  sourceImage: document.querySelector(".hero-art img"),
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
const animator = createWildlifeAnimator(ui.canvas, ui.sourceImage);

bindActions();
render();

function bindActions() {
  ui.explore.addEventListener("click", () => update(explore(state)));
  ui.repair.addEventListener("click", () => update(repair(state)));
  ui.upgradeArmor.addEventListener("click", () => update(upgrade(state, "armor")));
  ui.upgradeAntenna.addEventListener("click", () => update(upgrade(state, "antenna")));
  ui.upgradeMandible.addEventListener("click", () => update(upgrade(state, "mandible")));
  ui.restart.addEventListener("click", () => update(createGameState(), "restart"));
}

function update(nextState, forcedEvent = null) {
  state = nextState;
  animator.react(forcedEvent ?? state.lastEvent);
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

function createWildlifeAnimator(canvas, sourceImage) {
  const ctx = canvas.getContext("2d");
  const camera = {
    x: 0,
    y: 0,
    scale: 1,
    eventPulse: 0,
    dangerPulse: 0,
    waterPulse: 0,
    crumbPulse: 0,
    shelterPulse: 0
  };
  const roach = {
    x: 0.44,
    y: 0.38,
    heading: -0.12,
    speed: 0.018,
    stride: 0
  };
  let width = 0;
  let height = 0;
  let last = performance.now();

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);

  return {
    react(event) {
      camera.eventPulse = 1;
      if (event === "shelter" || event === "restart") camera.shelterPulse = 1;
      if (event === "food" || event === "mandible") camera.crumbPulse = 1;
      if (event === "danger") camera.dangerPulse = 1;
      if (event === "escape") camera.dangerPulse = 0.65;
      if (event === "water" || event === "sense") camera.waterPulse = 1;
      if (event === "blocked") camera.dangerPulse = Math.max(camera.dangerPulse, 0.45);
      roach.speed = event === "danger" ? 0.12 : 0.045;
    }
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateScene(dt, now / 1000);
    draw(now / 1000);
    requestAnimationFrame(loop);
  }

  function updateScene(dt, time) {
    camera.eventPulse = approach(camera.eventPulse, 0, dt * 1.4);
    camera.dangerPulse = approach(camera.dangerPulse, 0, dt * 1.1);
    camera.waterPulse = approach(camera.waterPulse, 0, dt * 0.9);
    camera.crumbPulse = approach(camera.crumbPulse, 0, dt * 0.9);
    camera.shelterPulse = approach(camera.shelterPulse, 0, dt * 0.8);

    const drift = 0.015 + camera.eventPulse * 0.028 + camera.dangerPulse * 0.06;
    roach.stride += dt * (5.4 + camera.eventPulse * 7 + camera.dangerPulse * 10);
    roach.x += Math.cos(roach.heading) * drift * dt;
    roach.y += Math.sin(roach.heading) * drift * dt;
    roach.heading += Math.sin(time * 0.72) * dt * 0.32 + (Math.random() - 0.5) * dt * 0.1;

    if (roach.x > 0.82 || roach.x < 0.18 || roach.y > 0.5 || roach.y < 0.22) {
      roach.heading += Math.PI * 0.76;
      roach.x = clamp(roach.x, 0.18, 0.82);
      roach.y = clamp(roach.y, 0.22, 0.5);
    }

    roach.speed = approach(roach.speed, 0.018, dt * 0.55);
    camera.x = Math.sin(time * 0.23) * 6 + camera.dangerPulse * Math.sin(time * 28) * 5;
    camera.y = Math.cos(time * 0.19) * 5 + camera.dangerPulse * Math.cos(time * 31) * 4;
    camera.scale = 1 + Math.sin(time * 0.17) * 0.012 + camera.eventPulse * 0.018;
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    drawBackground(time);
    drawLight(time);
    drawFoodAndWater(time);
    drawRoach(time);
    drawForeground(time);
  }

  function drawBackground(time) {
    ctx.save();
    ctx.translate(width / 2 + camera.x, height / 2 + camera.y);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-width / 2, -height / 2);
    if (sourceImage.complete && sourceImage.naturalWidth > 0) {
      drawImageCover(sourceImage, 0, 0, width, height);
    } else {
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#322d25");
      bg.addColorStop(1, "#060605");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(3, 4, 3, 0.46)";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(222, 214, 178, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i += 1) {
      const y = height * (0.44 + i * 0.075) + Math.sin(time + i) * 3;
      ctx.beginPath();
      ctx.moveTo(-20, y);
      ctx.quadraticCurveTo(width * 0.45, y + 18, width + 20, y - 8);
      ctx.stroke();
    }
  }

  function drawLight(time) {
    const x = width * (0.28 + Math.sin(time * 0.21) * 0.08);
    const y = height * (0.32 + Math.cos(time * 0.16) * 0.05);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, Math.max(width, height) * 0.62);
    glow.addColorStop(0, `rgba(231, 208, 150, ${0.22 + camera.eventPulse * 0.12})`);
    glow.addColorStop(0.46, "rgba(118, 108, 72, 0.08)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function drawFoodAndWater(time) {
    const crumbAlpha = 0.35 + camera.crumbPulse * 0.55;
    ctx.fillStyle = `rgba(222, 184, 101, ${crumbAlpha})`;
    for (let i = 0; i < 12; i += 1) {
      const x = width * (0.62 + Math.sin(i * 2.1) * 0.08);
      const y = height * (0.63 + Math.cos(i * 1.7) * 0.04);
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + (i % 3), 1.5 + (i % 2), i, 0, Math.PI * 2);
      ctx.fill();
    }

    const waterAlpha = 0.24 + camera.waterPulse * 0.64;
    ctx.strokeStyle = `rgba(151, 205, 196, ${waterAlpha})`;
    ctx.fillStyle = `rgba(190, 238, 226, ${waterAlpha * 0.42})`;
    for (let i = 0; i < 5; i += 1) {
      const x = width * (0.16 + i * 0.055);
      const y = height * (0.73 + Math.sin(time * 1.7 + i) * 0.012);
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 3.2, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawRoach(time) {
    const x = width * roach.x;
    const y = height * roach.y;
    const size = Math.min(width, height) * 0.23;
    const panic = camera.dangerPulse;
    const stride = roach.stride + time * 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(roach.heading + Math.sin(stride) * 0.018);
    ctx.scale(1 + camera.eventPulse * 0.04, 1 + Math.sin(time * 5.4) * 0.012);

    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.18, size * 0.98, size * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    drawLegs(size, stride, panic);
    drawAntennae(size, stride, panic);

    const shell = ctx.createLinearGradient(-size * 0.6, -size * 0.15, size * 0.72, size * 0.18);
    shell.addColorStop(0, "#1b100b");
    shell.addColorStop(0.28, "#5b351e");
    shell.addColorStop(0.58, "#a16a38");
    shell.addColorStop(0.78, "#5c321d");
    shell.addColorStop(1, "#130b08");

    ctx.fillStyle = shell;
    ctx.strokeStyle = "rgba(238, 189, 99, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.7, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(52, 28, 17, 0.92)";
    ctx.beginPath();
    ctx.ellipse(size * 0.58, -size * 0.01, size * 0.28, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(245, 214, 134, 0.17)";
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * size * 0.14, -size * 0.29);
      ctx.quadraticCurveTo(i * size * 0.1, 0, i * size * 0.13, size * 0.3);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(245, 211, 120, 0.76)";
    ctx.beginPath();
    ctx.arc(size * 0.73, -size * 0.07, 2.2, 0, Math.PI * 2);
    ctx.arc(size * 0.73, size * 0.07, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawLegs(size, stride, panic) {
    ctx.strokeStyle = "rgba(96, 59, 31, 0.96)";
    ctx.lineWidth = Math.max(2, size * 0.025);
    ctx.lineCap = "round";
    for (let side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const baseX = size * (-0.34 + i * 0.28);
        const baseY = side * size * 0.22;
        const swing = Math.sin(stride * 2.6 + i * 1.7 + side) * size * (0.09 + panic * 0.05);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(baseX - size * 0.16 + swing, side * size * (0.46 + i * 0.04), baseX - size * 0.34 + swing, side * size * (0.62 + i * 0.04));
        ctx.stroke();
      }
    }
  }

  function drawAntennae(size, stride, panic) {
    ctx.strokeStyle = "rgba(190, 145, 72, 0.86)";
    ctx.lineWidth = Math.max(1.4, size * 0.014);
    ctx.lineCap = "round";
    for (let side of [-1, 1]) {
      const wag = Math.sin(stride * 1.9 + side) * size * (0.18 + panic * 0.08);
      ctx.beginPath();
      ctx.moveTo(size * 0.75, side * size * 0.08);
      ctx.bezierCurveTo(size * 1.18, side * size * 0.16, size * 1.46, side * size * 0.46 + wag, size * 1.72, side * size * 0.8 + wag);
      ctx.stroke();
    }
  }

  function drawForeground(time) {
    const grain = 52;
    ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
    for (let i = 0; i < grain; i += 1) {
      const x = (Math.sin(i * 93.17 + time * 0.7) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 51.71 + time * 0.6) * 0.5 + 0.5) * height;
      ctx.fillRect(x, y, 1, 1);
    }

    if (camera.dangerPulse > 0.05) {
      ctx.fillStyle = `rgba(235, 237, 218, ${camera.dangerPulse * 0.2})`;
      for (let i = 0; i < 26; i += 1) {
        const x = width * (0.18 + (i % 9) * 0.08);
        const y = height * (0.28 + Math.floor(i / 9) * 0.13 + Math.sin(time * 8 + i) * 0.02);
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawImageCover(image, x, y, w, h) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (image.naturalWidth - sw) * 0.5;
    const sy = (image.naturalHeight - sh) * 0.5;
    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  }

  function approach(value, target, amount) {
    if (value < target) return Math.min(target, value + amount);
    return Math.max(target, value - amount);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
