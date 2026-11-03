const buttons = [...document.querySelectorAll('.repo')];
const movers = buttons.map((element, index) => ({ element, x: 0, y: 0, vx: [1.05, -0.9, 0.82, -1.12][index], vy: [0.78, 1.08, -1.1, -0.72][index], width: 0, height: 0 }));
let lastTime = 0;
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

function sizeStage() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  movers.forEach((mover, index) => {
    const firstLayout = mover.width === 0;
    const rect = mover.element.getBoundingClientRect();
    mover.width = rect.width;
    mover.height = rect.height;
    const maxX = Math.max(0, w - mover.width);
    const maxY = Math.max(0, h - mover.height);
    if (firstLayout) {
      mover.x = [w * .07, w * .74, w * .12, w * .72][index];
      mover.y = [h * .1, h * .36, h * .68, h * .8][index];
    } else {
      mover.x = mover.x / Math.max(1, previousWidth - mover.width) * maxX;
      mover.y = mover.y / Math.max(1, previousHeight - mover.height) * maxY;
    }
    mover.x = Math.max(0, Math.min(maxX, mover.x));
    mover.y = Math.max(0, Math.min(maxY, mover.y));
    mover.element.style.left = `${mover.x}px`;
    mover.element.style.top = `${mover.y}px`;
  });
  previousWidth = w;
  previousHeight = h;
}

function animate(time) {
  const step = Math.min(2, (time - (lastTime || time)) / 16.67);
  lastTime = time;
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  for (const mover of movers) {
    const right = Math.max(0, maxW - mover.width);
    const bottom = Math.max(0, maxH - mover.height);
    mover.x += mover.vx * step;
    mover.y += mover.vy * step;
    if (mover.x <= 0) { mover.x = 0; if (mover.vx < 0) playWallBounce(); mover.vx = Math.abs(mover.vx); }
    if (mover.x >= right) { mover.x = right; if (mover.vx > 0) playWallBounce(); mover.vx = -Math.abs(mover.vx); }
    if (mover.y <= 0) { mover.y = 0; if (mover.vy < 0) playWallBounce(); mover.vy = Math.abs(mover.vy); }
    if (mover.y >= bottom) { mover.y = bottom; if (mover.vy > 0) playWallBounce(); mover.vy = -Math.abs(mover.vy); }
    mover.element.style.left = `${mover.x}px`;
    mover.element.style.top = `${mover.y}px`;
  }
  for (let i = 0; i < movers.length; i++) {
    for (let j = i + 1; j < movers.length; j++) {
      const a = movers[i], b = movers[j];
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
  for (const mover of movers) {
    mover.element.style.left = `${mover.x}px`;
    mover.element.style.top = `${mover.y}px`;
  }
  requestAnimationFrame(animate);
}

sizeStage();
window.addEventListener('resize', sizeStage);
requestAnimationFrame(animate);
