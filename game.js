// ── Show/hide helpers ─────────────────────────────────────────────────────────
function show(el, displayType) { el.style.display = displayType || 'flex'; }
function hide(el) { el.style.display = 'none'; }

// ── DOM refs ──────────────────────────────────────────────────────────────────
var startScreen   = document.getElementById('startScreen');
var startBtn      = document.getElementById('startBtn');
var endScreen     = document.getElementById('endScreen');
var endTitle      = document.getElementById('endTitle');
var endSub        = document.getElementById('endSub');
var endStats      = document.getElementById('endStats');
var playAgainBtn  = document.getElementById('playAgainBtn');
var hudEl         = document.getElementById('hud');
var dmgOverlay    = document.getElementById('damageOverlay');
var scopeOverlay  = document.getElementById('scopeOverlay');
var hudHP         = document.getElementById('playerHealth');
var hudHPBar      = document.getElementById('healthBar');
var hudWave       = document.getElementById('waveNum');
var hudScore      = document.getElementById('score');
var hudAmmo       = document.getElementById('ammo');
var messageEl     = document.getElementById('message');
var waveAnnounce  = document.getElementById('waveAnnounce');
var waveAnnounceT = document.getElementById('waveAnnounceText');

// ── Apply initial visibility ───────────────────────────────────────────────────
hide(endScreen);
hide(hudEl);
hide(waveAnnounce);
show(startScreen, 'flex');

// ── THREE globals ──────────────────────────────────────────────────────────────
var threeReady = false;
var renderer, scene, camera, clock;
var obstacles = [];
var pBullets = [], eBullets = [], enemies = [];
var flashMap = new Map();

// ── Button listeners ───────────────────────────────────────────────────────────
startBtn.addEventListener('click', function () {
  if (!checkTHREE()) return;
  if (!threeReady) { initThree(); threeReady = true; animate(); }
  startGame();
});
playAgainBtn.addEventListener('click', function () {
  hide(endScreen);
  startGame();
});

// ── THREE.js check ─────────────────────────────────────────────────────────────
function checkTHREE() {
  if (typeof THREE === 'undefined') {
    startBtn.textContent = 'ERROR: Three.js failed to load — check internet';
    startBtn.style.background = '#aa1100';
    return false;
  }
  return true;
}

// ── THREE initialisation ───────────────────────────────────────────────────────
function initThree() {
  var canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080f1a);
  scene.fog = new THREE.Fog(0x080f1a, 18, 52);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);
  clock  = new THREE.Clock();

  scene.add(new THREE.AmbientLight(0x223355, 0.8));
  scene.add(new THREE.HemisphereLight(0x88aaff, 0x334422, 0.7));

  var sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
  sun.position.set(6, 14, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -28;
  sun.shadow.camera.right = sun.shadow.camera.top   =  28;
  sun.shadow.camera.far = 60;
  scene.add(sun);

  var redPt = new THREE.PointLight(0xff2200, 1.5, 20);
  redPt.position.set(-10, 2.5, -10);
  scene.add(redPt);

  var bluePt = new THREE.PointLight(0x0044ff, 1.2, 20);
  bluePt.position.set(10, 2.5, 10);
  scene.add(bluePt);

  // Arena
  var ARENA_R = 22, WALL_H = 5;
  window.ARENA_R = ARENA_R;

  var floor = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_R, 80),
    new THREE.MeshStandardMaterial({ color: 0x1c2b3a, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  scene.add(new THREE.GridHelper(ARENA_R * 2, 22, 0x1a3050, 0x162840));

  var wallMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_R, ARENA_R, WALL_H, 80, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x223344, side: THREE.BackSide, roughness: 0.9 })
  );
  wallMesh.position.y = WALL_H / 2;
  scene.add(wallMesh);

  var rim = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_R - 0.05, ARENA_R - 0.05, 0.15, 80, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x004488, side: THREE.BackSide })
  );
  rim.position.y = 0.08;
  scene.add(rim);

  // Obstacles
  var OBS = [
    { x:  0,  z: -8,   w: 3.0, d: 3.0 },
    { x:  9,  z:  5,   w: 2.5, d: 2.5 },
    { x: -9,  z:  5,   w: 2.5, d: 2.5 },
    { x:  5,  z: -14,  w: 2.0, d: 2.0 },
    { x: -5,  z: -14,  w: 2.0, d: 2.0 },
    { x:  15, z: -4,   w: 2.0, d: 2.0 },
    { x: -15, z: -4,   w: 2.0, d: 2.0 },
    { x:  0,  z:  13,  w: 4.5, d: 1.2 },
  ];
  var obsMat = new THREE.MeshStandardMaterial({ color: 0x3a5268, roughness: 0.85, metalness: 0.2 });
  OBS.forEach(function (o) {
    var h    = 2.8;
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, h, o.d), obsMat);
    mesh.position.set(o.x, h / 2, o.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push({ mesh: mesh, rx: o.w / 2 + 0.2, rz: o.d / 2 + 0.2 });
  });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ── Enemy definitions (reduced difficulty) ─────────────────────────────────────
var ETYPES = [
  { name: 'SOLDIER', color: 0xcc2222, hp: 35,  spd: 2.0, rate: 1.10, dmg:  5, bspd: 11, pts: 100 },
  { name: 'TANK',    color: 0xcc6600, hp: 70,  spd: 1.2, rate: 1.00, dmg: 10, bspd:  9, pts: 250 },
  { name: 'RUNNER',  color: 0xaa00cc, hp: 18,  spd: 3.8, rate: 1.80, dmg:  4, bspd: 13, pts: 150 },
  { name: 'SNIPER',  color: 0x1166cc, hp: 28,  spd: 1.6, rate: 0.60, dmg: 14, bspd: 17, pts: 200 },
];

function buildEnemyGroup(typeIdx) {
  var t   = ETYPES[typeIdx];
  var grp = new THREE.Group();

  var bmat = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.7 });
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.4, 0.75), bmat);
  body.position.y = 0.7;
  body.castShadow = true;
  grp.add(body);

  var head = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.5 })
  );
  head.position.y = 1.65;
  grp.add(head);

  var eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-0.14, 0.14].forEach(function (x) {
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeMat);
    eye.position.set(x, 1.68, -0.28);
    grp.add(eye);
  });

  var gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  gun.position.set(0.3, 0.85, 0.48);
  grp.add(gun);

  var hpCanvas = document.createElement('canvas');
  hpCanvas.width = 64; hpCanvas.height = 8;
  var hpTex = new THREE.CanvasTexture(hpCanvas);
  var hpPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.18),
    new THREE.MeshBasicMaterial({ map: hpTex, transparent: true, depthWrite: false })
  );
  hpPlane.position.y = 2.2;
  hpPlane.userData.isHpBar  = true;
  hpPlane.userData.hpCanvas = hpCanvas;
  hpPlane.userData.hpTex    = hpTex;
  grp.add(hpPlane);

  return grp;
}

function drawHpBar(enemy) {
  var bar = null;
  for (var i = 0; i < enemy.mesh.children.length; i++) {
    if (enemy.mesh.children[i].userData.isHpBar) { bar = enemy.mesh.children[i]; break; }
  }
  if (!bar) return;
  var pct = Math.max(0, enemy.hp / enemy.maxHp);
  var ctx = bar.userData.hpCanvas.getContext('2d');
  ctx.fillStyle = '#1a0000';
  ctx.fillRect(0, 0, 64, 8);
  ctx.fillStyle = pct > 0.5 ? '#22dd55' : pct > 0.25 ? '#ffaa00' : '#ff2200';
  ctx.fillRect(0, 0, pct * 64, 8);
  bar.userData.hpTex.needsUpdate = true;
}

// ── Bullet geometry ────────────────────────────────────────────────────────────
var bGeo, pBulMat, eBulMat;
function getBulletAssets() {
  if (!bGeo) {
    bGeo    = new THREE.SphereGeometry(0.1, 6, 6);
    pBulMat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    eBulMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  }
}

// ── Game state ─────────────────────────────────────────────────────────────────
var MAX_AMMO    = 12;
var RELOAD_TIME = 1.8;
var ARENA_R     = 22;
var MAX_HP      = 600;

var playerPos    = null;
var playerYaw    = Math.PI;
var playerPitch  = 0;
var playerHP     = MAX_HP;
var playerFireCD = 0;
var ammo         = MAX_AMMO;
var reloading    = false;
var reloadTimer  = 0;
var score        = 0;
var wave         = 0;
var waveActive   = false;
var gameState    = 'menu';
var damageFlash  = 0;
var isZooming    = false;
var currentFov   = 72;
var smoothFwd    = 0, smoothRight = 0;
var pointerLocked = false;

var keys = {
  ArrowUp: false, ArrowDown: false,
  ArrowLeft: false, ArrowRight: false,
  Space: false, KeyR: false,
  KeyW: false, KeyS: false, KeyA: false, KeyD: false,
  _mouseShoot: false,
};

window.addEventListener('keydown', function (e) {
  if (e.code in keys) {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  }
});
window.addEventListener('keyup', function (e) {
  if (e.code in keys) keys[e.code] = false;
});

// ── Pointer lock + mouse look/zoom ─────────────────────────────────────────────
(function setupMouse() {
  var canvas = document.getElementById('gameCanvas');

  canvas.addEventListener('click', function () {
    if (gameState === 'playing') canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', function () {
    pointerLocked = document.pointerLockElement === canvas;
    if (!pointerLocked && gameState === 'playing') {
      messageEl.textContent = 'Click to re-capture mouse';
    }
  });

  document.addEventListener('mousemove', function (e) {
    if (!pointerLocked || gameState !== 'playing') return;
    playerYaw  -= e.movementX * 0.002;
    playerPitch = Math.max(-1.3, Math.min(1.3, playerPitch - e.movementY * 0.002));
  });

  document.addEventListener('mousedown', function (e) {
    if (gameState !== 'playing') return;
    if (e.button === 0) keys._mouseShoot = true;
    if (e.button === 2) isZooming = true;
  });

  document.addEventListener('mouseup', function (e) {
    if (e.button === 0) keys._mouseShoot = false;
    if (e.button === 2) isZooming = false;
  });

  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });
})();

// ── Helpers ────────────────────────────────────────────────────────────────────
function fwd(yaw) {
  return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
}

function rightVec(yaw) {
  return new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));
}

function clampArena(pos, pad) {
  var r   = ARENA_R - (pad || 1.0);
  var len = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  if (len > r) { pos.x *= r / len; pos.z *= r / len; }
}

function hitsObs(pos, rad) {
  var r = rad || 0.65;
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    if (Math.abs(pos.x - o.mesh.position.x) < o.rx + r &&
        Math.abs(pos.z - o.mesh.position.z) < o.rz + r) return true;
  }
  return false;
}

function hasLOS(from, to) {
  var dir  = new THREE.Vector3().subVectors(to, from).normalize();
  var dist = from.distanceTo(to);
  var ray  = new THREE.Raycaster(from, dir, 0, dist);
  var meshes = obstacles.map(function (o) { return o.mesh; });
  return ray.intersectObjects(meshes).length === 0;
}

function spawnBullet(origin, dir, speed, life, list, mat) {
  getBulletAssets();
  var mesh = new THREE.Mesh(bGeo, mat);
  mesh.position.copy(origin);
  scene.add(mesh);
  list.push({ mesh: mesh, dir: dir.clone().normalize(), speed: speed, life: life });
}

// ── HUD ────────────────────────────────────────────────────────────────────────
function updateHUD() {
  hudHP.textContent    = Math.max(0, Math.round(playerHP));
  hudWave.textContent  = wave;
  hudScore.textContent = score;

  var pct = Math.max(0, playerHP) / MAX_HP;
  hudHPBar.style.width = (pct * 100) + '%';
  hudHPBar.style.background =
    pct > 0.5  ? 'linear-gradient(90deg,#22cc55,#88ff44)' :
    pct > 0.25 ? 'linear-gradient(90deg,#cc8800,#ffcc00)' :
                 'linear-gradient(90deg,#cc1100,#ff3300)';

  if (reloading) {
    var p = Math.round((1 - reloadTimer / RELOAD_TIME) * 100);
    hudAmmo.textContent = 'RELOADING ' + p + '%';
    hudAmmo.style.color = '#ffaa22';
  } else {
    hudAmmo.textContent = ammo + ' / ' + MAX_AMMO;
    hudAmmo.style.color = ammo <= 3 ? '#ff4422' : '#cce0ff';
  }
}

// ── Wave banner ────────────────────────────────────────────────────────────────
function showWaveBanner(text, duration) {
  show(waveAnnounce, 'flex');
  waveAnnounceT.textContent = text;
  waveAnnounceT.style.opacity = '1';
  setTimeout(function () {
    waveAnnounceT.style.opacity = '0';
    setTimeout(function () { hide(waveAnnounce); }, 500);
  }, duration || 1800);
}

// ── Spawn wave ─────────────────────────────────────────────────────────────────
function spawnWave() {
  wave++;
  waveActive = true;
  enemies.forEach(function (e) { if (e.mesh) scene.remove(e.mesh); });
  enemies = [];
  flashMap.clear();

  var count   = 2 + Math.ceil(wave * 0.6);
  var maxType = Math.min(ETYPES.length - 1, Math.floor((wave - 1) / 2));

  for (var i = 0; i < count; i++) {
    var pos;
    var tries = 0;
    do {
      var angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 1.0;
      var dist  = 8 + Math.random() * 10;
      pos = new THREE.Vector3(Math.cos(angle) * dist, 1.1, Math.sin(angle) * dist);
      tries++;
    } while (tries < 20 && (hitsObs(pos, 1.2) || pos.distanceTo(playerPos) < 5));

    var ti   = Math.floor(Math.random() * (maxType + 1));
    var t    = ETYPES[ti];
    var mesh = buildEnemyGroup(ti);
    mesh.position.copy(pos);
    scene.add(mesh);

    var e = {
      pos:      pos.clone(),
      mesh:     mesh,
      type:     t,
      typeIdx:  ti,
      hp:       t.hp,
      maxHp:    t.hp,
      fireCD:   Math.random() * t.rate,
      strafeSd: Math.random() * 100,
      alive:    true,
    };
    drawHpBar(e);
    enemies.push(e);
  }

  showWaveBanner('WAVE  ' + wave);
  messageEl.textContent = 'Wave ' + wave + ' — ' + count + ' enemies!';
  updateHUD();
}

// ── Start / restart ────────────────────────────────────────────────────────────
function startGame() {
  if (!threeReady) return;

  playerPos    = new THREE.Vector3(0, 1.6, 16);
  playerYaw    = Math.PI;
  playerPitch  = 0;
  playerHP     = MAX_HP;
  playerFireCD = 0;
  ammo         = MAX_AMMO;
  reloading    = false;
  reloadTimer  = 0;
  score        = 0;
  wave         = 0;
  waveActive   = false;
  gameState    = 'playing';
  damageFlash  = 0;
  isZooming    = false;
  currentFov   = 72;
  smoothFwd    = 0;
  smoothRight  = 0;
  dmgOverlay.style.opacity = 0;
  if (scopeOverlay) scopeOverlay.style.opacity = '0';

  pBullets.forEach(function (b) { scene.remove(b.mesh); });
  eBullets.forEach(function (b) { scene.remove(b.mesh); });
  pBullets.length = 0;
  eBullets.length = 0;

  enemies.forEach(function (e) { scene.remove(e.mesh); });
  enemies = [];
  flashMap.clear();

  hide(startScreen);
  hide(endScreen);
  show(hudEl, 'block');
  updateHUD();
  spawnWave();

  // Grab mouse
  document.getElementById('gameCanvas').requestPointerLock();
}

// ── End game ───────────────────────────────────────────────────────────────────
function endGame(victory) {
  gameState = 'ended';
  isZooming = false;
  if (scopeOverlay) scopeOverlay.style.opacity = '0';
  document.exitPointerLock();

  endTitle.textContent = victory ? 'VICTORY!' : 'DEFEATED';
  endTitle.className   = victory ? 'victory'  : 'defeat';
  endSub.textContent   = victory ? 'All enemies eliminated' : 'You were taken down on wave ' + wave;

  endStats.innerHTML =
    '<div class="stat-row"><span>Wave Reached</span><span class="stat-val">' + wave + '</span></div>' +
    '<div class="stat-row"><span>Final Score</span><span class="stat-val">' + score + '</span></div>';

  damageFlash = 0;
  dmgOverlay.style.opacity = 0;

  hide(hudEl);
  show(endScreen, 'flex');
}

// ── Player update ──────────────────────────────────────────────────────────────
function updatePlayer(dt) {
  // Arrow keys still turn for keyboard-only players
  if (keys.ArrowLeft)  playerYaw += 2.2 * dt;
  if (keys.ArrowRight) playerYaw -= 2.2 * dt;

  // Smooth WASD + arrow movement
  var inputFwd   = ((keys.KeyW || keys.ArrowUp)    ? 1 : 0) - ((keys.KeyS || keys.ArrowDown)  ? 1 : 0);
  var inputRight = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);

  var accel = 14;
  smoothFwd   += (inputFwd   - smoothFwd)   * Math.min(1, accel * dt);
  smoothRight += (inputRight - smoothRight) * Math.min(1, accel * dt);

  var fwdDir   = fwd(playerYaw);
  var rDir     = rightVec(playerYaw);
  var moveVec  = fwdDir.clone().multiplyScalar(smoothFwd).addScaledVector(rDir, smoothRight);
  var moveLen  = moveVec.length();

  if (moveLen > 0.05) {
    if (moveLen > 1) moveVec.normalize();
    var movement = moveVec.clone().multiplyScalar(8 * dt);
    var next = playerPos.clone().add(movement);
    clampArena(next, 1.2);
    if (!hitsObs(next, 0.65)) playerPos.copy(next);
  }

  if (reloading) {
    reloadTimer -= dt;
    if (reloadTimer <= 0) { reloading = false; ammo = MAX_AMMO; }
    updateHUD();
    return;
  }

  if (keys.KeyR && ammo < MAX_AMMO) {
    reloading = true;
    reloadTimer = RELOAD_TIME;
    updateHUD();
    return;
  }

  playerFireCD -= dt;
  if ((keys.Space || keys._mouseShoot) && playerFireCD <= 0 && ammo > 0) {
    var dir    = fwd(playerYaw);
    var muzzle = playerPos.clone().add(dir.clone().multiplyScalar(0.7));
    spawnBullet(muzzle, dir, 28, 2.5, pBullets, pBulMat);
    ammo--;
    playerFireCD = 0.18;
    if (ammo === 0) { reloading = true; reloadTimer = RELOAD_TIME; }
    updateHUD();
  }
}

// ── Enemy update ───────────────────────────────────────────────────────────────
function updateEnemies(dt, elapsed) {
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;

    var toP   = playerPos.clone().sub(e.pos);
    var dist  = toP.length();
    var dir2P = toP.clone().normalize();
    var right = new THREE.Vector3(-dir2P.z, 0, dir2P.x);

    var pref  = e.typeIdx === 3 ? 14 : 6;
    var app   = dist > pref + 2 ? 1 : dist < pref - 2 ? -1 : 0;
    var strf  = Math.sin(elapsed * 1.5 + e.strafeSd);

    var move = dir2P.clone()
      .multiplyScalar(app * 0.8)
      .addScaledVector(right, strf * 0.65);

    if (move.lengthSq() > 0.001) {
      move.normalize().multiplyScalar(e.type.spd * dt);
      var nxt = e.pos.clone().add(move);
      clampArena(nxt, 1.1);
      if (!hitsObs(nxt, 0.7)) e.pos.copy(nxt);
    }

    e.mesh.position.copy(e.pos);
    e.mesh.lookAt(playerPos.x, e.pos.y, playerPos.z);

    for (var c = 0; c < e.mesh.children.length; c++) {
      if (e.mesh.children[c].userData.isHpBar) {
        e.mesh.children[c].lookAt(camera.position);
        break;
      }
    }

    e.fireCD -= dt;
    if (e.fireCD <= 0 && hasLOS(e.pos, playerPos)) {
      var spread = e.typeIdx === 3 ? 0.015 : 0.09;
      var sDir = dir2P.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * spread, 0,
        (Math.random() - 0.5) * spread
      )).normalize();
      spawnBullet(e.pos.clone(), sDir, e.type.bspd, 3.0, eBullets, eBulMat);
      e.fireCD = e.type.rate + Math.random() * 0.25;
    }

    if (flashMap.has(e)) {
      var ft = flashMap.get(e) - dt;
      if (ft <= 0) {
        flashMap.delete(e);
        e.mesh.traverse(function (c) {
          if (c.isMesh && !c.userData.isHpBar && c.userData.origColor !== undefined) {
            c.material.color.setHex(c.userData.origColor);
          }
        });
      } else {
        flashMap.set(e, ft);
      }
    }
  }
}

// ── Bullet update ──────────────────────────────────────────────────────────────
function removeBullet(list, i) {
  scene.remove(list[i].mesh);
  list.splice(i, 1);
}

function updateBullets(dt) {
  var i, b, e, j;

  for (i = pBullets.length - 1; i >= 0; i--) {
    b = pBullets[i];
    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
    b.life -= dt;
    if (b.life <= 0 ||
        Math.sqrt(b.mesh.position.x * b.mesh.position.x + b.mesh.position.z * b.mesh.position.z) > ARENA_R - 0.3 ||
        hitsObs(b.mesh.position, 0.12)) {
      removeBullet(pBullets, i); continue;
    }
    var hit = false;
    for (j = 0; j < enemies.length; j++) {
      e = enemies[j];
      if (!e.alive) continue;
      if (b.mesh.position.distanceTo(e.pos) < 0.9) {
        e.hp -= 20;
        drawHpBar(e);
        e.mesh.traverse(function (ch) {
          if (ch.isMesh && !ch.userData.isHpBar) {
            if (ch.userData.origColor === undefined) ch.userData.origColor = ch.material.color.getHex();
            ch.material = ch.material.clone();
            ch.material.color.setHex(0xffffff);
          }
        });
        flashMap.set(e, 0.1);
        if (e.hp <= 0) {
          e.alive = false;
          scene.remove(e.mesh);
          score += e.type.pts;
          updateHUD();
        }
        hit = true; break;
      }
    }
    if (hit) removeBullet(pBullets, i);
  }

  for (i = eBullets.length - 1; i >= 0; i--) {
    b = eBullets[i];
    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
    b.life -= dt;
    if (b.life <= 0 ||
        Math.sqrt(b.mesh.position.x * b.mesh.position.x + b.mesh.position.z * b.mesh.position.z) > ARENA_R - 0.3 ||
        hitsObs(b.mesh.position, 0.12)) {
      removeBullet(eBullets, i); continue;
    }
    if (b.mesh.position.distanceTo(playerPos) < 0.85) {
      var dmg = 10;
      var best = Infinity;
      for (j = 0; j < enemies.length; j++) {
        if (!enemies[j].alive) continue;
        var d = enemies[j].pos.distanceTo(b.mesh.position);
        if (d < best) { best = d; dmg = enemies[j].type.dmg; }
      }
      playerHP   -= dmg;
      damageFlash = 0.3;
      updateHUD();
      if (playerHP <= 0) endGame(false);
      removeBullet(eBullets, i);
    }
  }
}

// ── Main loop ──────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (!threeReady) return;

  var dt      = Math.min(0.033, clock.getDelta());
  var elapsed = clock.elapsedTime;

  if (gameState === 'playing') {
    updatePlayer(dt);
    updateEnemies(dt, elapsed);
    updateBullets(dt);

    var allDead = true;
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive) { allDead = false; break; }
    }
    if (waveActive && allDead) {
      waveActive = false;
      messageEl.textContent = 'Wave ' + wave + ' cleared!  Score: ' + score;
      showWaveBanner('WAVE ' + wave + '  CLEAR!', 2000);
      setTimeout(function () {
        if (gameState === 'playing') spawnWave();
      }, 2400);
    }

    // Camera: position + look with yaw and pitch
    var lookDir = new THREE.Vector3(
      Math.cos(playerPitch) * Math.sin(playerYaw),
      Math.sin(playerPitch),
      Math.cos(playerPitch) * Math.cos(playerYaw)
    );
    camera.position.copy(playerPos);
    camera.lookAt(playerPos.clone().add(lookDir));

    // Smooth FOV zoom
    var targetFov = isZooming ? 38 : 72;
    if (Math.abs(currentFov - targetFov) > 0.1) {
      currentFov += (targetFov - currentFov) * Math.min(1, dt * 12);
      camera.fov = currentFov;
      camera.updateProjectionMatrix();
    }

    // Scope overlay
    if (scopeOverlay) scopeOverlay.style.opacity = isZooming ? '1' : '0';
  }

  if (damageFlash > 0) {
    damageFlash = Math.max(0, damageFlash - dt);
    dmgOverlay.style.opacity = Math.min(0.7, damageFlash * 2.5);
  } else {
    dmgOverlay.style.opacity = 0;
  }

  renderer.render(scene, camera);
}
