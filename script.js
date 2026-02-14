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

// Optional names from URL:
// https://tebby22.github.io/valentine/?from=Mamun&to=Aisha
const params = new URLSearchParams(location.search);
const FROM = (params.get("from") || "Someone").slice(0, 18);
const TO = (params.get("to") || "You").slice(0, 18);

const girlX = () => Math.min(innerWidth - 190, Math.max(260, innerWidth * 0.66));
const groundY = () => Math.min(innerHeight - 70, innerHeight * 0.74);

// --- Story state machine ---
const SceneState = {
  WALK: 0,
  GIRL_HIDE: 1,
  CLOSE_EYES: 2,
  REVEAL_SPARKLE: 3,
  KNEEL: 4,
  QUESTION: 5,
  WAIT_YES: 6,
  YES: 7,
  CELEBRATE: 8,
};
let currentState = SceneState.WALK;
let stateTimer = 0;

let boyX = 60;
let walkingPhase = 0;

let blushAlpha = 0.0;
let armReach = 0.0;
let reveal = 0.0;
let kneel = 0.0;

let heartPulse = 1.0;
let camShake = 0;

let yesClicked = false;

// --- Particles ---
const floatingHearts = Array.from({ length: 24 }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  s: 6 + Math.random() * 10,
  sp: 0.6 + Math.random() * 1.2,
}));

const sparkles = [];
const confetti = [];
const fireworks = [];
const clickHearts = [];

// YES button hitbox (set during draw)
let yesBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };

// --- Click/tap anywhere → spawn hearts (bonus) + YES click ---
function spawnClickHearts(x, y) {
  for (let i = 0; i < 10; i++) {
    clickHearts.push({
      x, y,
      vx: (Math.random() * 2 - 1) * 2.2,
      vy: -(1.5 + Math.random() * 3.2),
      life: 1,
      s: 7 + Math.random() * 8,
    });
  }
}

addEventListener("pointerdown", (e) => {
  const mx = e.clientX, my = e.clientY;

  // If YES button visible, check click
  if (yesBtn.visible) {
    if (mx >= yesBtn.x && mx <= yesBtn.x + yesBtn.w && my >= yesBtn.y && my <= yesBtn.y + yesBtn.h) {
      yesClicked = true;
      currentState = SceneState.YES;
      stateTimer = 0;
      camShake = 8;
      return; // don’t also spawn hearts from button click
    }
  }

  // Bonus hearts anywhere
  spawnClickHearts(mx, my);
});

// --- Drawing helpers ---
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

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

function speechBubble(x, y, text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  roundRect(x, y, 270, 60, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(230,40,100,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgb(230,40,100)";
  ctx.font = "bold 16px sans-serif";
  wrapText(text, x + 14, y + 26, 240, 18);
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
      vx: (Math.random() * 2 - 1) * 2.6,
      vy: (Math.random() * 2 - 1) * 2.6,
      life: 1,
    });
  }
}

// --- Bouquet drawing (simple but cute) ---
function bouquet(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // wrap
  ctx.fillStyle = "rgba(255, 220, 235, 0.95)";
  ctx.beginPath();
  ctx.moveTo(-12, 18);
  ctx.lineTo(14, 18);
  ctx.lineTo(26, 48);
  ctx.lineTo(-24, 48);
  ctx.closePath();
  ctx.fill();

  // ribbon
  ctx.fillStyle = "rgba(230,40,100,0.9)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // stems
  ctx.strokeStyle = "rgba(34, 139, 34, 0.95)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, 18);
    ctx.lineTo(i * 5, -6);
    ctx.stroke();
  }

  // flowers (cluster)
  const flowers = [
    { dx: -14, dy: -16, c1: "rgb(255,60,120)", c2: "rgb(180,0,30)" },
    { dx:  0, dy: -22, c1: "rgb(255,120,180)", c2: "rgb(200,0,60)" },
    { dx:  14, dy: -16, c1: "rgb(255,80,150)", c2: "rgb(160,0,40)" },
    { dx: -6, dy: -6, c1: "rgb(255,170,210)", c2: "rgb(230,40,100)" },
    { dx:  6, dy: -6, c1: "rgb(255,120,160)", c2: "rgb(200,0,60)" },
  ];

  for (const f of flowers) {
    // petals
    ctx.fillStyle = f.c2;
    ctx.beginPath();
    ctx.ellipse(f.dx - 5, f.dy, 7, 9, 0.2, 0, Math.PI * 2);
    ctx.ellipse(f.dx + 5, f.dy, 7, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // center
    ctx.fillStyle = f.c1;
    ctx.beginPath();
    ctx.ellipse(f.dx, f.dy - 2, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // highlight
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.ellipse(f.dx - 2, f.dy - 4, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- Fireworks ---
function launchFirework() {
  fireworks.push({
    x: Math.random() * innerWidth,
    y: innerHeight + 10,
    vx: (Math.random() * 2 - 1) * 0.8,
    vy: -(7 + Math.random() * 3),
    boom: false,
    p: [],
  });
}

function explodeFirework(fw) {
  fw.boom = true;
  const n = 45 + ((Math.random() * 25) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const sp = 1.6 + Math.random() * 3.8;
    fw.p.push({
      x: fw.x, y: fw.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
    });
  }
  camShake = 10;
}

function addConfetti() {
  const colors = ["pink", "yellow", "cyan", "orange", "white"];
  confetti.push({
    x: Math.random() * innerWidth,
    y: -10,
    c: colors[(Math.random() * colors.length) | 0],
    s: 2 + Math.random() * 4,
  });
}

// --- Characters ---
function drawGirl(x, y) {
  const breathing = Math.sin(performance.now() / 450) * 1.5;
  const cy = y + breathing;

  // arm slightly forward after reveal
  if (currentState >= SceneState.REVEAL_SPARKLE) {
    ctx.strokeStyle = "rgb(255,230,210)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 10, cy - 55);
    ctx.lineTo(x - 22 * Math.min(1, reveal + 0.2), cy - 52);
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
  if (currentState === SceneState.CLOSE_EYES) {
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
  ctx.fillStyle = `rgba(255,150,150,${blushAlpha})`;
  ctx.beginPath();
  ctx.ellipse(x + 12, cy - 112, 6, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 38, cy - 112, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // after YES, show bouquet near her too (cute symbol)
  if (currentState >= SceneState.YES) bouquet(x - 5, cy - 58, 0.7);
}

function drawBoy(x, y) {
  const isWalk = currentState === SceneState.WALK;
  const bob = isWalk ? Math.abs(Math.sin(walkingPhase) * 8) : Math.sin(performance.now() / 450) * 1.5;
  const legSwing = isWalk ? Math.sin(walkingPhase) * 16 : 0;

  // kneel lowers body
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
  ctx.fillStyle = `rgba(255,150,150,${Math.min(1, blushAlpha * 0.85)})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, cy - 110, 6, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 40, cy - 110, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // arm reaches forward a bit during suspense/reveal
  const reachX = x + 52 + 32 * armReach;
  ctx.strokeStyle = "rgb(255,235,215)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 44, cy - 55);
  ctx.lineTo(reachX, cy - 52);
  ctx.stroke();

  // Bouquet behind back (early)
  if (currentState <= SceneState.CLOSE_EYES) {
    bouquet(x + 58, cy - 58, 0.7);
  }

  // Bouquet reveal (front)
  if (currentState === SceneState.REVEAL_SPARKLE || currentState === SceneState.KNEEL || currentState === SceneState.QUESTION || currentState === SceneState.WAIT_YES) {
    const t = Math.min(1, reveal);
    bouquet(reachX + 22, cy - 56, 0.9 + 0.08 * Math.sin(performance.now() / 140) * t);
  }

  // During kneel, hold it lower (more “presenting”)
  if (currentState >= SceneState.KNEEL && currentState <= SceneState.WAIT_YES) {
    bouquet(reachX + 24, cy - 46, 0.95);
  }
}

// --- YES button ---
function drawYesButton() {
  const W = innerWidth, H = innerHeight;
  const w = Math.min(320, W * 0.42);
  const h = 60;
  const x = W / 2 - w / 2;
  const y = H * 0.22;

  yesBtn = { x, y, w, h, visible: true };

  ctx.save();
  const pulse = 0.92 + 0.08 * Math.sin(performance.now() / 140);

  ctx.translate(W / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-W / 2, -(y + h / 2));

  ctx.fillStyle = "rgba(230,40,100,0.92)";
  roundRect(x, y, w, h, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.font = "800 22px sans-serif";
  ctx.fillText("YES 💖 (click me)", x + 70, y + 38);

  ctx.restore();
}

// --- Update loop ---
function update() {
  stateTimer++;

  const gx = girlX();
  const gy = groundY();

  switch (currentState) {
    case SceneState.WALK:
      if (boyX < gx - 160) {
        boyX += 4.6;
        walkingPhase += 0.35;
      } else {
        currentState = SceneState.GIRL_HIDE;
        stateTimer = 0;
      }
      break;

    case SceneState.GIRL_HIDE:
      blushAlpha = Math.min(1, blushAlpha + 0.012);
      if (stateTimer > 80) {
        currentState = SceneState.CLOSE_EYES;
        stateTimer = 0;
      }
      break;

    case SceneState.CLOSE_EYES:
      armReach = Math.min(1, armReach + 0.012);
      if (stateTimer > 90) {
        currentState = SceneState.REVEAL_SPARKLE;
        stateTimer = 0;
        sparkleBurst(gx - 30, gy - 170, 45);
      }
      break;

    case SceneState.REVEAL_SPARKLE:
      reveal = Math.min(1, reveal + 0.02);
      if (stateTimer % 12 === 0) sparkleBurst(gx - 20, gy - 170, 14);
      if (stateTimer > 90) {
        currentState = SceneState.KNEEL;
        stateTimer = 0;
      }
      break;

    case SceneState.KNEEL:
      kneel = Math.min(1, kneel + 0.02);
      if (stateTimer > 80) {
        currentState = SceneState.QUESTION;
        stateTimer = 0;
      }
      break;

    case SceneState.QUESTION:
      if (stateTimer > 90) {
        currentState = SceneState.WAIT_YES;
        stateTimer = 0;
      }
      break;

    case SceneState.WAIT_YES:
      // wait until user clicks YES
      break;

    case SceneState.YES:
      if (stateTimer > 70) {
        currentState = SceneState.CELEBRATE;
        stateTimer = 0;
      }
      break;

    case SceneState.CELEBRATE:
      if (confetti.length < 140) addConfetti();
      heartPulse = 1.0 + 0.22 * Math.sin(performance.now() / 120);
      if (stateTimer % 26 === 0) launchFirework();
      break;
  }

  // floating hearts
  for (const h of floatingHearts) {
    h.y -= 1.2 * h.sp;
    if (h.y < -60) {
      h.y = innerHeight + 60;
      h.x = Math.random() * innerWidth;
    }
  }

  // sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const p = sparkles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= 0.04;
    if (p.life <= 0) sparkles.splice(i, 1);
  }

  // confetti
  for (const c of confetti) {
    c.y += c.s;
    c.x += Math.sin(c.y / 25);
  }

  // fireworks
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const fw = fireworks[i];
    if (!fw.boom) {
      fw.x += fw.vx;
      fw.y += fw.vy;
      fw.vy += 0.06;
      if (fw.vy > -1.0 || fw.y < innerHeight * 0.45) explodeFirework(fw);
    } else {
      for (let j = fw.p.length - 1; j >= 0; j--) {
        const p = fw.p[j];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.vy += 0.03;
        p.life -= 0.02;
        if (p.life <= 0) fw.p.splice(j, 1);
      }
      if (fw.p.length === 0) fireworks.splice(i, 1);
    }
  }

  // click hearts
  for (let i = clickHearts.length - 1; i >= 0; i--) {
    const h = clickHearts[i];
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.08;
    h.life -= 0.03;
    if (h.life <= 0) clickHearts.splice(i, 1);
  }

  camShake = Math.max(0, camShake - 0.7);
}

// --- Draw loop ---
function draw() {
  const W = innerWidth, H = innerHeight;
  const gy = groundY();
  const gx = girlX();

  // camera shake
  const sx = (Math.random() * 2 - 1) * camShake;
  const sy = (Math.random() * 2 - 1) * camShake;
  ctx.setTransform(1, 0, 0, 1, sx, sy);

  // Background
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, "rgb(70,30,95)");
  sky.addColorStop(1, "rgb(255,150,190)");
  ctx.fillStyle = sky;
  ctx.fillRect(-sx, -sy, W, H);

  // tiny stars
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 70; i++) {
    const x = (i * 137) % W;
    const y = (i * 71) % Math.max(180, gy - 120);
    ctx.fillRect(x, y, 1, 1);
  }

  // ground
  const ground = ctx.createLinearGradient(0, gy, 0, H);
  ground.addColorStop(0, "rgb(160,70,130)");
  ground.addColorStop(1, "rgb(100,40,80)");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.ellipse(W / 2, gy + 90, W * 0.85, 170, 0, 0, Math.PI * 2);
  ctx.fill();

  // floating hearts
  ctx.fillStyle = "rgba(255,210,230,0.55)";
  for (const h of floatingHearts) miniHeart(h.x, h.y, h.s);

  // sparkles
  ctx.fillStyle = "rgba(255,255,180,0.9)";
  for (const p of sparkles) ctx.fillRect(p.x, p.y, 3, 3);

  // characters
  drawGirl(gx, gy);
  drawBoy(boyX, gy);

  // dialogue
  if (currentState === SceneState.GIRL_HIDE) {
    speechBubble(gx - 160, gy - 200, "What are you hiding? 😏");
  }
  if (currentState === SceneState.CLOSE_EYES) {
    speechBubble(boyX - 80, gy - 220, "Close your eyes… 🙈");
  }
  if (currentState === SceneState.REVEAL_SPARKLE) {
    speechBubble(gx - 170, gy - 200, "Okay… I’m looking now! 😳✨");
  }
  if (currentState === SceneState.KNEEL) {
    speechBubble(boyX - 80, gy - 220, "Please… one moment…");
  }
  if (currentState === SceneState.QUESTION || currentState === SceneState.WAIT_YES) {
    speechBubble(boyX - 80, gy - 220, "Will you be my Valentine? 💐");
  }
  if (currentState === SceneState.YES || currentState === SceneState.CELEBRATE) {
    speechBubble(gx - 140, gy - 200, "YES!!! 💖");
  }

  // YES button appears
  yesBtn.visible = false;
  if (currentState === SceneState.WAIT_YES) drawYesButton();

  // Celebration
  if (currentState === SceneState.CELEBRATE) {
    ctx.save();
    ctx.translate(W / 2, 160 + Math.sin(performance.now() / 400) * 12);
    ctx.scale(heartPulse, heartPulse);
    ctx.fillStyle = "rgb(255,50,120)";
    miniHeart(0, 0, 60);
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "700 56px cursive";
    ctx.fillText(`${TO} + ${FROM}`, W / 2 - 160, 90);

    for (const c of confetti) {
      ctx.fillStyle = c.c;
      ctx.fillRect(c.x, c.y, 6, 6);
    }

    for (const fw of fireworks) {
      if (!fw.boom) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(fw.x, fw.y, 3, 3);
      } else {
        for (const p of fw.p) {
          ctx.fillStyle = `rgba(255,255,255,${p.life})`;
          ctx.fillRect(p.x, p.y, 3, 3);
        }
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 14px sans-serif";
    ctx.fillText("Tip: click/tap anywhere to throw hearts 💕", 18, H - 18);
  }

  // click hearts
  for (const h of clickHearts) {
    ctx.fillStyle = `rgba(255,120,180,${h.life})`;
    miniHeart(h.x, h.y, h.s);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
