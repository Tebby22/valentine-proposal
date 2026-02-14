// Valentine Proposal (Mahe -> Mashkura)
// Keep index.html/style.css unchanged. This script uses canvas id="c".
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();

// Names fixed (as requested)
const FROM = "Mahe";
const TO = "Mashkura";

// Layout helpers
const girlX = () => Math.min(innerWidth - 210, Math.max(260, innerWidth * 0.66));
const groundY = () => Math.min(innerHeight - 70, innerHeight * 0.74);

// Scene state machine
const Scene = {
  WALK: 0,
  GIRL_HIDE: 1,
  CLOSE_EYES: 2,
  REVEAL: 3,
  KNEEL: 4,
  QUESTION: 5,
  WAIT_YES: 6,
  YES: 7,
  CELEBRATE: 8,
};
let scene = Scene.WALK;
let t = 0;

// Character animation values
let boyX = -40;
let walkPhase = 0;
let blush = 0;
let armReach = 0;
let reveal = 0;
let kneel = 0;
let heartPulse = 1.0;

// UI button hitbox (canvas button)
let yesBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };

// Camera shake for celebration
let shake = 0;

// Particles
const floatHearts = Array.from({ length: 26 }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  s: 6 + Math.random() * 10,
  sp: 0.5 + Math.random() * 1.3,
}));

const sparkles = [];
const confetti = [];
const fireworks = [];
const clickHearts = [];
const fireflies = Array.from({ length: 28 }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  r: 1 + Math.random() * 2.2,
  a: Math.random() * Math.PI * 2,
  sp: 0.007 + Math.random() * 0.012,
}));

// Click/tap hearts + YES button click
addEventListener("pointerdown", (e) => {
  const mx = e.clientX, my = e.clientY;

  // YES button click
  if (yesBtn.visible) {
    if (mx >= yesBtn.x && mx <= yesBtn.x + yesBtn.w && my >= yesBtn.y && my <= yesBtn.y + yesBtn.h) {
      scene = Scene.YES;
      t = 0;
      shake = 8;
      yesBtn.visible = false;
      return;
    }
  }

  // Bonus hearts anywhere
  spawnClickHearts(mx, my);
});

function spawnClickHearts(x, y) {
  for (let i = 0; i < 12; i++) {
    clickHearts.push({
      x, y,
      vx: (Math.random() * 2 - 1) * 2.4,
      vy: -(1.8 + Math.random() * 3.6),
      life: 1,
      s: 8 + Math.random() * 9,
    });
  }
}

// Helpers
function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ✅ FIXED wrapText (works cleanly with textBaseline="top")
function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// ✅ FIXED speechBubble: forces alignment inside the box
function speechBubble(x, y, text) {
  ctx.save();

  // bubble
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  roundRect(x, y, 300, 62, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(230,40,100,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // lock alignment
  ctx.fillStyle = "rgb(230,40,100)";
  ctx.font = "700 16px Georgia, serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // text
  wrapText(text, x + 16, y + 16, 268, 18);

  ctx.restore();
}

function miniHeart(x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x - s * 0.5, y - s * 0.25, s * 0.5, s * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.5, y - s * 0.25, s * 0.5, s * 0.5, 0, 0, Math.PI * 2);
  ctx.moveTo(x - s, y);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s * 1.25);
  ctx.closePath();
  ctx.fill();
}

function sparkleBurst(x, y, n = 30) {
  for (let i = 0; i < n; i++) {
    sparkles.push({
      x, y,
      vx: (Math.random() * 2 - 1) * 2.8,
      vy: (Math.random() * 2 - 1) * 2.8,
      life: 1,
      hue: 40 + Math.random() * 120,
    });
  }
}

function addConfetti() {
  const colors = ["#ff69b4", "#ffd700", "#00e5ff", "#ffa726", "#ffffff", "#b388ff"];
  confetti.push({
    x: Math.random() * innerWidth,
    y: -10,
    c: colors[(Math.random() * colors.length) | 0],
    s: 2 + Math.random() * 4,
    a: Math.random() * Math.PI * 2,
  });
}

function launchFirework() {
  fireworks.push({
    x: Math.random() * innerWidth,
    y: innerHeight + 10,
    vx: (Math.random() * 2 - 1) * 0.9,
    vy: -(7 + Math.random() * 3),
    boom: false,
    p: [],
    hue: Math.random() * 360,
  });
}

function explodeFirework(fw) {
  fw.boom = true;
  const n = 55 + ((Math.random() * 25) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const sp = 1.8 + Math.random() * 4.2;
    fw.p.push({
      x: fw.x, y: fw.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      hue: fw.hue + (Math.random() * 40 - 20),
    });
  }
  shake = 10;
}

// Bouquet (cuter + slightly animated)
function bouquet(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  const wiggle = Math.sin(performance.now() / 140) * 0.04;
  ctx.rotate(wiggle);
  ctx.scale(scale, scale);

  // wrap
  ctx.fillStyle = "rgba(255, 220, 240, 0.95)";
  ctx.beginPath();
  ctx.moveTo(-14, 18);
  ctx.lineTo(14, 18);
  ctx.lineTo(28, 52);
  ctx.lineTo(-28, 52);
  ctx.closePath();
  ctx.fill();

  // ribbon
  ctx.fillStyle = "rgba(230,40,100,0.92)";
  ctx.beginPath();
  ctx.ellipse(0, 36, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // stems
  ctx.strokeStyle = "rgba(34, 139, 34, 0.95)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, 18);
    ctx.lineTo(i * 6, -8);
    ctx.stroke();
  }

  // flower cluster
  const flowers = [
    { dx: -16, dy: -18, c1: "#ff4f9a", c2: "#b0002a" },
    { dx: 0, dy: -26, c1: "#ff86c8", c2: "#c4004a" },
    { dx: 16, dy: -18, c1: "#ff5ab2", c2: "#9d0031" },
    { dx: -7, dy: -8, c1: "#ffd1e6", c2: "#ff3d7f" },
    { dx: 7, dy: -8, c1: "#ff9ecb", c2: "#d1004a" },
  ];

  for (const f of flowers) {
    ctx.fillStyle = f.c2;
    ctx.beginPath();
    ctx.ellipse(f.dx - 6, f.dy, 8, 10, 0.2, 0, Math.PI * 2);
    ctx.ellipse(f.dx + 6, f.dy, 8, 10, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = f.c1;
    ctx.beginPath();
    ctx.ellipse(f.dx, f.dy - 2, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.ellipse(f.dx - 2, f.dy - 5, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Characters
function drawGirl(x, y) {
  const breathing = Math.sin(performance.now() / 450) * 1.5;
  const cy = y + breathing;

  // arm slightly forward in later scenes
  if (scene >= Scene.REVEAL) {
    ctx.strokeStyle = "rgb(255,230,210)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 10, cy - 55);
    ctx.lineTo(x - 24 * Math.min(1, reveal + 0.2), cy - 52);
    ctx.stroke();
  }

  // hair
  ctx.fillStyle = "rgb(85,45,25)";
  ctx.beginPath();
  ctx.ellipse(x + 20, cy - 120, 34, 44, 0, 0, Math.PI * 2);
  ctx.fill();

  // dress
  ctx.fillStyle = "rgb(255,120,180)";
  ctx.beginPath();
  ctx.moveTo(x, cy - 80);
  ctx.lineTo(x + 55, cy - 80);
  ctx.lineTo(x + 70, cy);
  ctx.lineTo(x - 15, cy);
  ctx.closePath();
  ctx.fill();

  // face
  ctx.fillStyle = "rgb(255,235,215)";
  ctx.beginPath();
  ctx.ellipse(x + 25, cy - 118, 20, 21, 0, 0, Math.PI * 2);
  ctx.fill();

  // eyes (closed during CLOSE_EYES)
  if (scene === Scene.CLOSE_EYES) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 17, cy - 122, 5, 0, Math.PI);
    ctx.arc(x + 33, cy - 122, 5, 0, Math.PI);
    ctx.stroke();
  } else {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(x + 17, cy - 124, 4, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 32, cy - 124, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(x + 18, cy - 125, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // blush
  ctx.fillStyle = `rgba(255,150,150,${blush})`;
  ctx.beginPath();
  ctx.ellipse(x + 12, cy - 112, 6, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 38, cy - 112, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // after YES, show bouquet near her
  if (scene >= Scene.YES) bouquet(x - 8, cy - 58, 0.7);

  // name label
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 14px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(TO, x + 24, cy + 30);
}

function drawBoy(x, y) {
  const isWalk = scene === Scene.WALK;
  const bob = isWalk ? Math.abs(Math.sin(walkPhase) * 8) : Math.sin(performance.now() / 450) * 1.5;
  const legSwing = isWalk ? Math.sin(walkPhase) * 16 : 0;

  const kneelDrop = 26 * kneel;
  const cy = y - bob + kneelDrop;

  // legs
  ctx.strokeStyle = "rgb(60,60,120)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 16, cy - 10);
  ctx.lineTo(x + 16 - legSwing, y + 8);
  ctx.moveTo(x + 34, cy - 10);
  ctx.lineTo(x + 34 + legSwing, y + 8);
  ctx.stroke();

  // shirt
  ctx.fillStyle = "rgb(100,180,255)";
  roundRect(x + 8, cy - 75, 40, 62, 16);
  ctx.fill();

  // face
  ctx.fillStyle = "rgb(255,235,215)";
  ctx.beginPath();
  ctx.ellipse(x + 28, cy - 115, 20, 21, 0, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = "rgb(45,45,45)";
  ctx.beginPath();
  ctx.arc(x + 28, cy - 120, 22, Math.PI, 0);
  ctx.fill();

  // eyes
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.ellipse(x + 20, cy - 121, 4, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 35, cy - 121, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // blush
  ctx.fillStyle = `rgba(255,150,150,${Math.min(1, blush * 0.85)})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, cy - 110, 6, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 40, cy - 110, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  //
