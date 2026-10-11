// ================= GAME ENGINE & STATE =================
const GameState = {
  running: false,
  timeMinutes: 480, // Starts at 08:00 AM (480 mins from midnight)
  role: 'student',
  difficulty: 2,
  
  // Survival Gauges (0 - 100)
  energy: 100,
  hunger: 100,
  bladder: 0,
  morale: 100,

  // Mini-game Drilling State
  drillPos: 10,
  targetPos: 50,
  isDrilling: false,
  pulpalRisk: 'LOW',
  bondyPredict: 4.5,

  // Quotas & Stats
  quotas: { cavity: false, scaling: false, signoff: false, lab: false },
  bondyScores: [],
  
  // Event System
  currentEvent: "Shift started smoothly. All units operational."
};

// ================= THREE.JS 3D VIEWPORT SETUP =================
let scene, camera, renderer, chairMesh, drillMesh;

function init3D() {
  const container = document.getElementById('three-canvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 2.5);

  renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const overheadLight = new THREE.PointLight(0x38bdf8, 1.2, 10);
  overheadLight.position.set(0, 2.5, 1);
  scene.add(overheadLight);

  // Dental Chair Mesh
  const chairGeo = new THREE.BoxGeometry(1.2, 0.3, 2);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
  chairMesh = new THREE.Mesh(chairGeo, chairMat);
  chairMesh.position.set(0, -0.2, 0);
  scene.add(chairMesh);

  // Phantom Head / Patient Mesh
  const headGeo = new THREE.SphereGeometry(0.25, 32, 32);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 0.1, -0.5);
  scene.add(headMesh);

  // Dental Drill Handpiece
  const drillGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
  const drillMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  drillMesh = new THREE.Mesh(drillGeo, drillMat);
  drillMesh.rotation.x = Math.PI / 4;
  drillMesh.position.set(0.1, 0.2, -0.3);
  scene.add(drillMesh);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ================= GAME LOOP & TIMERS =================
let lastTime = Date.now();

function gameLoop() {
  if (!GameState.running) return;

  const now = Date.now();
  const delta = (now - lastTime) / 1000; // seconds
  lastTime = now;

  // 11 real minutes = 11 hours (1 real second = 1 in-game minute)
  GameState.timeMinutes += delta * 1.0; 

  // Survival Decay
  GameState.energy = Math.max(0, GameState.energy - delta * 0.08 * GameState.difficulty);
  GameState.hunger = Math.max(0, GameState.hunger - delta * 0.12 * GameState.difficulty);
  GameState.bladder = Math.min(100, GameState.bladder + delta * 0.1 * GameState.difficulty);

  // Random Stomach Rumble Audio Effect
  if (GameState.hunger < 20 && Math.random() < 0.003) {
    audioFX.playStomachRumble();
    showEvent("🍔 Your stomach is rumbling loudly in front of the patient!");
  }

  // Drilling Physics
  if (GameState.isDrilling) {
    GameState.drillPos += delta * 35;
  } else {
    GameState.drillPos = Math.max(0, GameState.drillPos - delta * 25);
  }

  // Hand Tremors when Energy < 30%
  if (GameState.energy < 30) {
    GameState.drillPos += (Math.random() - 0.5) * 4;
  }

  // Drilling Target Alignment Check
  const targetMin = GameState.targetPos - 12.5;
  const targetMax = GameState.targetPos + 12.5;

  if (GameState.drillPos >= targetMin && GameState.drillPos <= targetMax) {
    GameState.pulpalRisk = "LOW";
    GameState.bondyPredict = Math.min(5.0, GameState.bondyPredict + delta * 0.1);
  } else if (GameState.drillPos > targetMax + 15) {
    GameState.pulpalRisk = "CRITICAL ⚠️";
    GameState.morale = Math.max(0, GameState.morale - delta * 2);
    GameState.bondyPredict = Math.max(1.0, GameState.bondyPredict - delta * 0.3);
  } else {
    GameState.pulpalRisk = "MODERATE";
  }

  // Quotas Milestone Check
  if (GameState.timeMinutes > 540) GameState.quotas.cavity = true; // 9:00 AM
  if (GameState.timeMinutes > 660) GameState.quotas.scaling = true; // 11:00 AM
  if (GameState.timeMinutes > 900) GameState.quotas.signoff = true; // 3:00 PM
  if (GameState.timeMinutes > 1080) GameState.quotas.lab = true; // 6:00 PM

  // Fail Conditions
  if (GameState.morale <= 0) triggerGameOver("BURNOUT! You suffered cognitive fatigue and walked out of clinic.");
  if (GameState.energy <= 0 && GameState.hunger <= 0) triggerGameOver("PHYSICAL COLLAPSE! You fainted on the polyclinic floor.");
  if (GameState.bladder >= 100) triggerGameOver("BLADDER DISASTER! Loss of bodily control in front of supervisor.");

  // Victory Check (7:00 PM = 1140 mins)
  if (GameState.timeMinutes >= 1140) triggerVictory();

  // 3D Drill Animation
  if (drillMesh && GameState.isDrilling) {
    drillMesh.position.x = 0.1 + (Math.random() - 0.5) * 0.01;
  }

  updateHUD();
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

// ================= HUD UPDATES =================
function updateHUD() {
  const hours = Math.floor(GameState.timeMinutes / 60);
  const mins = Math.floor(GameState.timeMinutes % 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours;
  document.getElementById('clock-display').innerText = 
    `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;

  setBar('energy-bar', 'energy-text', GameState.energy);
  setBar('hunger-bar', 'hunger-text', GameState.hunger);
  setBar('bladder-bar', 'bladder-text', GameState.bladder, true);
  setBar('morale-bar', 'morale-text', GameState.morale);

  document.getElementById('drill-needle').style.left = `${Math.min(98, Math.max(0, GameState.drillPos))}%`;
  document.getElementById('pulpal-risk').innerText = GameState.pulpalRisk;
  document.getElementById('bondy-predict').innerText = GameState.bondyPredict.toFixed(1);

  document.getElementById('quota-1').innerText = GameState.quotas.cavity ? '[x] Cavity Prep' : '[ ] Cavity Prep';
  document.getElementById('quota-2').innerText = GameState.quotas.scaling ? '[x] Scaling' : '[ ] Scaling';
  document.getElementById('quota-3').innerText = GameState.quotas.signoff ? '[x] Supervisor Sign-Off' : '[ ] Supervisor Sign-Off';
  document.getElementById('quota-4').innerText = GameState.quotas.lab ? '[x] Lab Model Trimming' : '[ ] Lab Model Trimming';
}

function setBar(barId, textId, value, isReverse = false) {
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  bar.style.width = `${value}%`;
  text.innerText = `${Math.round(value)}%`;

  if (!isReverse) {
    if (value < 25) bar.className = "meter-fill danger";
    else if (value < 50) bar.className = "meter-fill warning";
    else bar.className = "meter-fill";
  } else {
    if (value > 80) bar.className = "meter-fill danger";
    else if (value > 50) bar.className = "meter-fill warning";
    else bar.className = "meter-fill";
  }
}

// ================= PARTNER ACTIONS & EVENTS =================
function triggerPartnerAction(action) {
  if (!GameState.running) return;

  if (action === 'suction') {
    GameState.morale = Math.min(100, GameState.morale + 5);
    showEvent("Farhan cleared saliva with suction! Morale +5%");
  } else if (action === 'lignocaine') {
    showEvent("Farhan handed over 2% Lignocaine cartridge.");
  } else if (action === 'distract') {
    audioFX.playFootTap();
    showEvent("Farhan distracted the supervisor with a clinical question!");
  } else if (action === 'toilet') {
    GameState.bladder = 0;
    GameState.timeMinutes += 15;
    showEvent("Quick toilet break taken. Bladder cleared! (+15 mins)");
  } else if (action === 'snack') {
    GameState.energy = Math.min(100, GameState.energy + 25);
    GameState.hunger = Math.min(100, GameState.hunger + 15);
    GameState.timeMinutes += 10;
    showEvent("Drank canned coffee from vending machine! Energy +25%");
  }
}

function showEvent(msg) {
  document.getElementById('event-text').innerText = msg;
}

// ================= GAME OVER / VICTORY LOGIC =================
function triggerGameOver(reason) {
  GameState.running = false;
  audioFX.stopDrill();
  document.getElementById('end-title').innerText = "❌ GAME OVER";
  document.getElementById('end-subtitle').innerText = reason;
  document.getElementById('final-score').innerText = "0%";
  document.getElementById('final-bondy').innerText = "(Avg: 1.0)";
  document.getElementById('final-quotas').innerText = "Failed";
  document.getElementById('earned-title').innerText = "The Unfortunate Dropout";
  document.getElementById('end-screen').style.display = "flex";
}

function triggerVictory() {
  GameState.running = false;
  audioFX.stopDrill();
  audioFX.playVictoryChime();
  
  const quotasCount = Object.values(GameState.quotas).filter(Boolean).length;
  const avgBondy = GameState.bondyPredict;
  const score = Math.min(100, Math.round((quotasCount / 4 * 40) + (avgBondy / 5 * 40) + (GameState.morale / 100 * 20)));

  const badgeEl = document.getElementById('bondy-grade-badge');
  if (avgBondy >= 4.5) {
    badgeEl.className = "bondy-badge bondy-5";
    badgeEl.innerText = "Bondy 5 - Independent";
  } else if (avgBondy >= 3.5) {
    badgeEl.className = "bondy-badge bondy-4";
    badgeEl.innerText = "Bondy 4 - Supervised";
  } else if (avgBondy >= 2.5) {
    badgeEl.className = "bondy-badge bondy-3";
    badgeEl.innerText = "Bondy 3 - Marginal";
  } else {
    badgeEl.className = "bondy-badge bondy-2";
    badgeEl.innerText = "Bondy 2 - Dependent";
  }

  let title = "The 'Pass Saja' Specialist";
  if (score >= 95) title = "🏆 The Polyclinic Legend (Master of Bondy 5)";
  else if (score >= 85) title = "🥇 The KOD Speedrunner";
  else if (score >= 70) title = "🥈 The Canteen Sprinter";

  document.getElementById('end-title').innerText = "🎉 SHIFT SURVIVED!";
  document.getElementById('end-subtitle').innerText = "All patients clerked & logbook submitted successfully!";
  document.getElementById('final-score').innerText = `${score}%`;
  document.getElementById('final-bondy').innerText = `(Avg: ${avgBondy.toFixed(1)})`;
  document.getElementById('final-quotas').innerText = `${quotasCount} / 4`;
  document.getElementById('earned-title').innerText = title;
  document.getElementById('end-screen').style.display = "flex";
}

// ================= CONTROLS & LISTENERS =================
document.getElementById('start-btn').addEventListener('click', () => {
  GameState.role = document.getElementById('role-select').value;
  GameState.difficulty = parseInt(document.getElementById('diff-select').value);
  document.getElementById('role-display').innerText = document.getElementById('role-select').selectedOptions.text;
  document.getElementById('diff-display').innerText = `Level ${GameState.difficulty}`;
  
  document.getElementById('menu-screen').style.display = 'none';
  GameState.running = true;
  lastTime = Date.now();
  gameLoop();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  window.location.reload();
});

const drillBtn = document.getElementById('drill-btn');
drillBtn.addEventListener('mousedown', () => { 
  GameState.isDrilling = true; 
  audioFX.startDrill(GameState.pulpalRisk === "CRITICAL ⚠️" ? 1.2 : 1.0);
});
drillBtn.addEventListener('mouseup', () => { 
  GameState.isDrilling = false; 
  audioFX.stopDrill();
});
drillBtn.addEventListener('touchstart', (e) => { 
  e.preventDefault(); 
  GameState.isDrilling = true; 
  audioFX.startDrill();
});
drillBtn.addEventListener('touchend', (e) => { 
  e.preventDefault(); 
  GameState.isDrilling = false; 
  audioFX.stopDrill();
});

window.onload = init3D;