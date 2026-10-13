function initHeadlessRunner() {
  const gb = document.getElementById('g-box');
  
  gb.innerHTML = `
    <div style="flex-grow:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;background:#0d0e15;position:relative;overflow:hidden;">
      <canvas id="hr-canvas" width="1280" height="720" style="width:100%;height:auto;max-height:100%;object-fit:contain;display:block;"></canvas>
    </div>
    <div style="display:flex;gap:10px;padding:8px;background:#161824;width:100%;justify-content:center;box-sizing:border-box;">
      <button class="btn" id="hr-btn-jump" style="flex:2;text-align:center;padding:14px;background:#ff007c;color:#fff;border:none;cursor:pointer;">ПРЫЖОК / ВВЕРХ</button>
      <button class="btn" id="hr-btn-blood" style="flex:1;text-align:center;padding:14px;background:#24283b;color:#f7768e;border:1px solid #ff007c;cursor:pointer;">💉 ПАКЕТ КРОВИ</button>
    </div>
  `;

  const canvas = document.getElementById('hr-canvas');
  const ctx = canvas.getContext('2d');

  const assets = {};
  const imageFiles = {
    l1_1: 'headless_runner/assets/l1_s1-sheet0.png',
    l2_1: 'headless_runner/assets/l2_s1-sheet0.png',
    l4_1: 'headless_runner/assets/l4_s1-sheet0.png',
    ground1: 'headless_runner/assets/g_s1-sheet0.png',
    topBar: 'headless_runner/assets/topbar-sheet0.png',
    chickenSheet: 'headless_runner/assets/chicken-sheet0.png',
    blade: 'headless_runner/assets/blade_wheel-sheet0.png',
    beartrap: 'headless_runner/assets/beartrap-sheet0.png',
    fence: 'headless_runner/assets/fence-sheet0.png',
    eFence: 'headless_runner/assets/e_fence-sheet0.png',
    knife: 'headless_runner/assets/knife-sheet0.png',
    bloodBag: 'headless_runner/assets/useablebloodbutton-sheet0.png',
    bucket: 'headless_runner/assets/bucket-sheet0.png',
    plaster: 'headless_runner/assets/plaster-sheet0.png'
  };

  const sounds = {
    ambience: new Audio('headless_runner/assets/ambience.m4a'),
    jump: new Audio('headless_runner/assets/sproing.m4a'),
    hit: new Audio('headless_runner/assets/hard hit.m4a'),
    electric: new Audio('headless_runner/assets/electric.m4a'),
    nearMiss: new Audio('headless_runner/assets/nearmiss01.m4a'),
    pickup: new Audio('headless_runner/assets/pickup.m4a')
  };

  sounds.ambience.loop = true;
  sounds.ambience.volume = 0.3;

  window.stopHeadlessAudio = () => {
    for (let s in sounds) {
      try {
        sounds[s].pause();
        sounds[s].currentTime = 0;
      } catch(e){}
    }
  };

  let loadedCount = 0;
  const totalAssets = Object.keys(imageFiles).length;
  let gameStarted = false;

  for (let key in imageFiles) {
    assets[key] = new Image();
    assets[key].src = imageFiles[key];
    assets[key].onload = checkLoad;
    assets[key].onerror = checkLoad;
  }

  function checkLoad() {
    loadedCount++;
    if (loadedCount === totalAssets && !gameStarted) {
      gameStarted = true;
      resetGame();
      try { sounds.ambience.play(); } catch(e){}
      runLoop();
    }
  }

  const anims = {
    run: [
      {x:1, y:1}, {x:119, y:1}, {x:237, y:1}, {x:355, y:1}, {x:473, y:1}, {x:591, y:1}, {x:709, y:1}, {x:827, y:1},
      {x:1, y:107}, {x:119, y:107}, {x:237, y:107}, {x:355, y:107}, {x:473, y:107}, {x:591, y:107}, {x:709, y:107}, {x:827, y:107},
      {x:1, y:213}, {x:119, y:213}, {x:237, y:213}, {x:355, y:213}
    ],
    jump: [{x:473, y:213}, {x:591, y:213}, {x:709, y:213}, {x:827, y:213}, {x:1, y:319}, {x:119, y:319}],
    fall: [{x:237, y:319}, {x:355, y:319}, {x:473, y:319}, {x:591, y:319}, {x:709, y:319}, {x:827, y:319}],
    electrichit: [
      {x:473, y:637}, {x:591, y:637}, {x:709, y:637}, {x:827, y:637},
      {x:1, y:743}, {x:119, y:743}, {x:237, y:743}, {x:355, y:743}, {x:473, y:743}
    ],
    die: [{x:355, y:637}]
  };

  let chicken, obstacles, bloodDrops, bloodParticles, score, health, isBucketActive, isPlasterActive, bloodBagCount, pX1, pX2, pX3, spawnTimer, isGameOver, shockTimer;

  function resetGame() {
    chicken = { x: 150, y: 480, w: 100, h: 90, vy: 0, gravity: 0.8, jumpForce: -15, grounded: true, state: 'run', frameIndex: 0, animTimer: 0 };
    obstacles = []; bloodDrops = []; bloodParticles = [];
    score = 0; health = 100; isBucketActive = false; isPlasterActive = false; bloodBagCount = 1;
    pX1 = 0; pX2 = 0; pX3 = 0; spawnTimer = 0; isGameOver = false; shockTimer = 0;
  }

  function spawnObstacle() {
    let typeRand = Math.random(), x = 1350;
    if (typeRand < 0.22) obstacles.push({ type: 'blade', x: x, y: 450, w: 90, h: 90, rot: 0 });
    else if (typeRand < 0.42) obstacles.push({ type: 'eFence', x: x, y: 460, w: 120, h: 120 });
    else if (typeRand < 0.62) obstacles.push({ type: 'fence', x: x, y: 480, w: 70, h: 100 });
    else {
      for (let i = 0; i < 3; i++) {
        obstacles.push({ type: 'knife', x: x + i * 200, y: 280 + (i % 2) * 140, w: 80, h: 60, vx: 9 + i * 1, nearMissed: false });
      }
    }
    if (Math.random() < 0.35) {
      let r = Math.random(), itemType = r < 0.4 ? 'bloodBag' : (r < 0.7 ? 'bucket' : 'plaster');
      bloodDrops.push({ type: itemType, x: x + 100, y: 420, w: 50, h: 50 });
    }
  }

  function triggerJump() {
    if (isGameOver) { resetGame(); return; }
    if (chicken.grounded) {
      chicken.vy = chicken.jumpForce; chicken.grounded = false; chicken.state = 'jump'; chicken.frameIndex = 0;
      try { sounds.jump.play(); } catch(e){}
    }
  }

  document.getElementById('hr-btn-jump').onclick = triggerJump;
  document.getElementById('hr-btn-blood').onclick = () => {
    if (bloodBagCount > 0 && health < 100) { bloodBagCount--; health = Math.min(100, health + 40); try { sounds.pickup.play(); } catch(e){} }
  };
  window.onkeydown = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); triggerJump(); } };

  function runLoop() {
    window.hrLoopId = requestAnimationFrame(runLoop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    pX1 -= 1;   
    pX2 -= 2.5; 
    pX3 -= 5;   

    if (pX1 <= -1280) pX1 = 0;
    if (pX2 <= -1280) pX2 = 0;
    if (pX3 <= -1280) pX3 = 0;

    if (assets.l1_1 && assets.l1_1.complete) {
      ctx.drawImage(assets.l1_1, pX1, 0, 1280, 720);
      ctx.drawImage(assets.l1_1, pX1 + 1280, 0, 1280, 720);
    }
    if (assets.l2_1 && assets.l2_1.complete) {
      ctx.drawImage(assets.l2_1, pX2, 300, 1280, 272);
      ctx.drawImage(assets.l2_1, pX2 + 1280, 300, 1280, 272);
    }
    if (assets.l4_1 && assets.l4_1.complete) {
      ctx.drawImage(assets.l4_1, pX2, 150, 1280, 308);
      ctx.drawImage(assets.l4_1, pX2 + 1280, 150, 1280, 308);
    }
    if (assets.ground1 && assets.ground1.complete) {
      ctx.drawImage(assets.ground1, pX3, 570, 1280, 150);
      ctx.drawImage(assets.ground1, pX3 + 1280, 570, 1280, 150);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#ff007c'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center';
      ctx.fillText('КУРИЦА ПОГИБЛА', 640, 330);
      ctx.fillStyle = '#ffffff'; ctx.font = '20px monospace';
      ctx.fillText('Нажми пробел или тапни для рестарта', 640, 380);
      return;
    }

    chicken.vy += chicken.gravity; chicken.y += chicken.vy;
    if (chicken.y >= 480) { chicken.y = 480; chicken.vy = 0; chicken.grounded = true; if (chicken.state === 'jump' || chicken.state === 'fall') chicken.state = 'run'; }
    else if (chicken.vy > 0 && chicken.state === 'jump') { chicken.state = 'fall'; chicken.frameIndex = 0; }

    if (shockTimer > 0) { shockTimer--; chicken.state = 'electrichit'; }
    else if (chicken.state === 'electrichit' && shockTimer <= 0) chicken.state = 'run';

    chicken.animTimer++;
    let currentAnim = anims[chicken.state] || anims.run;
    if (chicken.animTimer > 3) { chicken.frameIndex = (chicken.frameIndex + 1) % currentAnim.length; chicken.animTimer = 0; }

    if (Math.random() < 0.5) {
      bloodParticles.push({ x: chicken.x + 25, y: chicken.y + 35, vx: -3 - Math.random() * 2, vy: 2 + Math.random() * 3, size: 4 + Math.random() * 4 });
    }

    if (health > 0) {
      let drain = isPlasterActive ? 0.015 : 0.04;
      if (!isBucketActive) health -= drain;
    } else { isGameOver = true; chicken.state = 'die'; }

    score++;
    spawnTimer++; if (spawnTimer > 85) { spawnObstacle(); spawnTimer = 0; }

    obstacles.forEach((obs, index) => {
      if (obs.type === 'knife') obs.x -= obs.vx; else obs.x -= 5;
      if (obs.type === 'blade') {
        obs.rot += 0.25; ctx.save(); ctx.translate(obs.x + obs.w/2, obs.y + obs.h/2); ctx.rotate(obs.rot);
        ctx.drawImage(assets.blade, -obs.w/2, -obs.h/2, obs.w, obs.h); ctx.restore();
      } else if (obs.type === 'eFence') ctx.drawImage(assets.eFence, obs.x, obs.y, obs.w, obs.h);
      else if (obs.type === 'fence') ctx.drawImage(assets.fence, obs.x, obs.y, obs.w, obs.h);
      else if (obs.type === 'knife') ctx.drawImage(assets.knife, obs.x, obs.y, obs.w, obs.h);

      let dist = Math.hypot((chicken.x + chicken.w/2) - (obs.x + obs.w/2), (chicken.y + chicken.h/2) - (obs.y + obs.h/2));
      if (dist < 85 && !obs.nearMissed && obs.x < chicken.x) { obs.nearMissed = true; score += 100; try { sounds.nearMiss.play(); } catch(e){} }

      let m = 15;
      if (chicken.x + m < obs.x + obs.w - m && chicken.x + chicken.w - m > obs.x + m && chicken.y + m < obs.y + obs.h - m && chicken.y + chicken.h - m > obs.y + m) {
        health -= 25; isBucketActive = false;
        if (obs.type === 'eFence') { shockTimer = 35; try { sounds.electric.play(); } catch(e){} }
        else { try { sounds.hit.play(); } catch(e){} }
        obstacles.splice(index, 1);
      }
      if (obs.x < -150) obstacles.splice(index, 1);
    });

    bloodDrops.forEach((item, index) => {
      item.x -= 5;
      let img = item.type === 'bloodBag' ? assets.bloodBag : (item.type === 'bucket' ? assets.bucket : assets.plaster);
      ctx.drawImage(img, item.x, item.y, item.w, item.h);
      if (chicken.x < item.x + item.w && chicken.x + chicken.w > item.x && chicken.y < item.y + item.h && chicken.y + chicken.h > item.y) {
        if (item.type === 'bloodBag') bloodBagCount++;
        else if (item.type === 'bucket') isBucketActive = true;
        else isPlasterActive = true;
        try { sounds.pickup.play(); } catch(e){}
        bloodDrops.splice(index, 1);
      }
      if (item.x < -50) bloodDrops.splice(index, 1);
    });

    ctx.fillStyle = '#cc0000';
    bloodParticles.forEach((p, index) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.4;
      if (p.y >= 570) { p.y = 570; p.vy = 0; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      if (p.x < 0) bloodParticles.splice(index, 1);
    });

    if (assets.chickenSheet && assets.chickenSheet.complete) {
      let animArray = anims[chicken.state] || anims.run;
      if (chicken.frameIndex >= animArray.length) chicken.frameIndex = 0;
      let frameCoord = animArray[chicken.frameIndex];
      ctx.drawImage(assets.chickenSheet, frameCoord.x, frameCoord.y, 117, 105, chicken.x, chicken.y, chicken.w, chicken.h);
    }

    if (assets.topBar && assets.topBar.complete) ctx.drawImage(assets.topBar, 0, 0, 1280, 80);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left';
    ctx.fillText('💉 x' + bloodBagCount, 40, 45);
    ctx.textAlign = 'right';
    ctx.fillText('ОЧКИ: ' + Math.floor(score / 10), 1240, 45);

    ctx.fillStyle = '#2f334d'; ctx.fillRect(450, 25, 350, 20);
    ctx.fillStyle = '#ff007c'; ctx.fillRect(450, 25, Math.max(0, 3.5 * health), 20);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(450, 25, 350, 20);
  }
}