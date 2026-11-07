const buttons = [...document.querySelectorAll('.repo')];
const presetVX = [1.05, -0.9, 0.82, -1.12];
const presetVY = [0.78, 1.08, -1.1, -0.72];
const randomSpeed = () => (0.7 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1);
const tabs = [...document.querySelectorAll('.tab')];
const tabBar = document.querySelector('.tabs');
const movers = buttons.map((element) => ({ element, group: element.dataset.group, x: 0, y: 0, vx: 0, vy: 0, width: 0, height: 0 }));
let active = [];
let lastTime = 0;
const getTop = () => Math.ceil(tabBar.getBoundingClientRect().bottom);
let previousWidth = window.innerWidth;
let previousHeight = window.innerHeight;

let audioCtx = null;
let lastSoundTime = 0;

function unlockAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

['pointerdown', 'keydown', 'touchstart'].forEach((type) => window.addEventListener(type, unlockAudio, { passive: true }));

function playBounce(baseFreq = 260, volume = 0.12) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  if (now - lastSoundTime < 0.025) return; // avoid stacking too many sounds at once
  lastSoundTime = now;

  const freq = baseFreq * (0.9 + Math.random() * 0.25);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq * 1.6, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

const playWallBounce = () => playBounce(220, 0.1);
const playBoxBounce = () => playBounce(440, 0.14);

function randomizeColors() {
  const base = Math.random() * 360;
  const order = movers.map((_, i) => i).sort(() => Math.random() - 0.5);
  movers.forEach((mover, i) => {
    const hue = (base + order[i] * (360 / movers.length) + (Math.random() * 30 - 15) + 360) % 360;
    const sat = 60 + Math.random() * 30;
    const light = 45 + Math.random() * 35;
    mover.element.style.setProperty('--btn-bg', `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`);
    // pick black/white text by approximate perceived luminance
    const s = sat / 100, l = light / 100, a = s * Math.min(l, 1 - l);
    const f = (n) => { const k = (n + hue / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    const lum = 0.299 * f(0) + 0.587 * f(8) + 0.114 * f(4);
    mover.element.style.setProperty('--btn-fg', lum > 0.6 ? '#171717' : '#ffffff');
  });
}

function sizeStage() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const top = getTop();
  active.forEach((mover, index) => {
    const firstLayout = mover.width === 0;
    const rect = mover.element.getBoundingClientRect();
    mover.width = rect.width;
    mover.height = rect.height;
    const maxX = Math.max(0, w - mover.width);
    const maxY = Math.max(top, h - mover.height);
    const rangeY = maxY - top;
    if (firstLayout) {
      mover.vx = presetVX[index] ?? randomSpeed();
      mover.vy = presetVY[index] ?? randomSpeed();
      mover.x = [w * .07, w * .74, w * .12, w * .72][index] ?? Math.random() * maxX;
      mover.y = top + ([.1, .36, .68, .8][index] ?? Math.random()) * rangeY;
    } else {
      mover.x = mover.x / Math.max(1, previousWidth - mover.width) * maxX;
      mover.y = top + (mover.y - top) / Math.max(1, previousHeight - top - mover.height) * rangeY;
    }
    mover.x = Math.max(0, Math.min(maxX, mover.x));
    mover.y = Math.max(top, Math.min(maxY, mover.y));
    mover.element.style.left = `${mover.x}px`;
    mover.element.style.top = `${mover.y}px`;
  });
  previousWidth = w;
  previousHeight = h;
}

function setTab(name) {
  tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
  movers.forEach((mover) => { mover.element.hidden = mover.group !== name; mover.width = 0; });
  active = movers.filter((mover) => mover.group === name);
  sizeStage();
}

tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));

function animate(time) {
  const step = Math.min(2, (time - (lastTime || time)) / 16.67);
  lastTime = time;
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const top = getTop();
  for (const mover of active) {
    const right = Math.max(0, maxW - mover.width);
    const bottom = Math.max(top, maxH - mover.height);
    mover.x += mover.vx * step;
    mover.y += mover.vy * step;
    if (mover.x <= 0) { mover.x = 0; if (mover.vx < 0) playWallBounce(); mover.vx = Math.abs(mover.vx); }
    if (mover.x >= right) { mover.x = right; if (mover.vx > 0) playWallBounce(); mover.vx = -Math.abs(mover.vx); }
    if (mover.y <= top) { mover.y = top; if (mover.vy < 0) playWallBounce(); mover.vy = Math.abs(mover.vy); }
    if (mover.y >= bottom) { mover.y = bottom; if (mover.vy > 0) playWallBounce(); mover.vy = -Math.abs(mover.vy); }
    mover.element.style.left = `${mover.x}px`;
    mover.element.style.top = `${mover.y}px`;
  }
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          const direction = a.x + a.width / 2 < b.x + b.width / 2 ? -1 : 1;
          a.x += direction * (overlapX / 2 + .5);
          b.x -= direction * (overlapX / 2 + .5);
          [a.vx, b.vx] = [b.vx, a.vx];
        } else {
          const direction = a.y + a.height / 2 < b.y + b.height / 2 ? -1 : 1;
          a.y += direction * (overlapY / 2 + .5);
          b.y -= direction * (overlapY / 2 + .5);
          [a.vy, b.vy] = [b.vy, a.vy];
        }
        playBoxBounce();
      }
    }
  }
  for (const mover of active) {
    mover.element.style.left = `${mover.x}px`;
    mover.element.style.top = `${mover.y}px`;
  }
  requestAnimationFrame(animate);
}

randomizeColors();
setTab('phone');
window.addEventListener('resize', sizeStage);
requestAnimationFrame(animate);