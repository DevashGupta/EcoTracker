/* ═══════════════════════════════════════════════════════════
   EcoTracker — Application Logic
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ── EMISSION FACTOR CONSTANTS ───────────────────────────── */
const EF = {
  grid:          0.475,   // kg CO₂e / kWh
  gasoline:      0.192,   // kg CO₂e / km
  ev:            0.053,   // kg CO₂e / km
  transit:       0.028,   // kg CO₂e / km
  bike:          0.000,   // kg CO₂e / km
  meat:         27.000,   // kg CO₂e / kg
  plant:         1.500,   // kg CO₂e / kg
};

const TIER_THRESHOLDS = [
  { name: 'Eco Starter',  icon: '🌱', min: 0,    max: 500  },
  { name: 'Green Warrior',icon: '🌿', min: 500,  max: 1500 },
  { name: 'Climate Hero', icon: '🌍', min: 1500, max: 3000 },
  { name: 'Earth Legend', icon: '⭐', min: 3000, max: 6000 },
  { name: 'Eco God',      icon: '🏆', min: 6000, max: Infinity },
];

/* ── APP STATE ───────────────────────────────────────────── */
const state = {
  // Onboarding
  postalCode:     '',
  householdSize:  1,
  vehicleType:    'gasoline',
  dailyGoal:      5,
  onboardingDone: false,

  // Daily inputs
  electricity:    200,   // kWh/month
  distance:       20,    // km/day
  transitMode:    'gasoline',
  meat:           0.20,  // kg/day
  plant:          0.50,  // kg/day

  // Outputs
  eEnergy:        0,
  eTransit:       0,
  eFood:          0,
  totalFootprint: 0,
  carbonSaved:    0,
  ecoPoints:      0,

  // History (array of daily snapshot objects)
  history: [],

  // Rewards
  challengeClaimed: false,
  currentView: 'dashboard',
};

/* ── LOCAL STORAGE HELPERS ───────────────────────────────── */
const LS_KEY = 'ecotracker_v2';

function saveState() {
  const persist = {
    postalCode:       state.postalCode,
    householdSize:    state.householdSize,
    vehicleType:      state.vehicleType,
    dailyGoal:        state.dailyGoal,
    onboardingDone:   state.onboardingDone,
    electricity:      state.electricity,
    distance:         state.distance,
    transitMode:      state.transitMode,
    meat:             state.meat,
    plant:            state.plant,
    ecoPoints:        state.ecoPoints,
    history:          state.history,
    challengeClaimed: state.challengeClaimed,
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(persist)); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    return true;
  } catch(e) { return false; }
}

/* ── CALCULATION ENGINE ──────────────────────────────────── */
function recalculate() {
  const efMode = EF[state.transitMode] ?? EF.gasoline;

  state.eEnergy  = (state.electricity / 30) * EF.grid / state.householdSize;
  state.eTransit = state.distance * efMode;
  state.eFood    = (state.meat * EF.meat) + (state.plant * EF.plant);
  state.totalFootprint = state.eEnergy + state.eTransit + state.eFood;

  // Challenge: carbon saved by switching to transit vs gasoline
  state.carbonSaved = Math.max(0,
    (state.distance * EF.gasoline) - (state.distance * EF.transit)
  );
  const challengePoints = Math.floor(state.carbonSaved * 10);

  return { challengePoints };
}

/* ── DOM REFS ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const dom = {
  // Onboarding
  overlay:          $('onboardingOverlay'),
  obProgressFill:   $('obProgressFill'),
  steps:            [null, $('obStep1'), $('obStep2'), $('obStep3')],
  postalCode:       $('postalCode'),
  householdDisplay: $('householdDisplay'),

  // Header
  headerEcoPoints:  $('headerEcoPoints'),
  ecoPointsBadge:   $('ecoPointsBadge'),
  appMain:          $('appMain'),

  // Hero
  heroGreeting:         $('heroGreeting'),
  totalFootprintDisplay:$('totalFootprintDisplay'),
  heroGoalDisplay:      $('heroGoalDisplay'),
  goalStatusPill:       $('goalStatusPill'),
  goalStatusText:       $('goalStatusText'),
  ringFill:             $('ringFill'),
  ringGlow:             $('ringGlow'),
  ringPercent:          $('ringPercent'),

  // Subtotals
  energySubtotal: $('energySubtotal'),
  transitSubtotal:$('transitSubtotal'),
  foodSubtotal:   $('foodSubtotal'),
  energyBar:      $('energyBar'),
  transitBar:     $('transitBar'),
  foodBar:        $('foodBar'),

  // Sliders
  electricitySlider: $('electricitySlider'),
  electricityValue:  $('electricityValue'),
  distanceSlider:    $('distanceSlider'),
  distanceValue:     $('distanceValue'),
  meatSlider:        $('meatSlider'),
  meatValue:         $('meatValue'),
  plantSlider:       $('plantSlider'),
  plantValue:        $('plantValue'),

  // Mode tags
  modeTags:  document.querySelectorAll('.mode-tag'),

  // Challenge
  savingsKg:        $('savingsKg'),
  challengePoints:  $('challengePoints'),
  challengeRingFill:$('challengeRingFill'),
  claimBtn:         $('claimBtn'),

  // Tables
  baselineTableBody:  $('baselineTableBody'),

  // Celebration
  celebrationOverlay: $('celebrationOverlay'),
  celebPoints:        $('celebPoints'),
  celebKg:            $('celebKg'),
  celebClose:         $('celebClose'),
  confettiContainer:  $('confettiContainer'),

  // Toast
  toast: $('toast'),

  // Analytics
  tierBadgeIcon:    $('tierBadgeIcon'),
  tierName:         $('tierName'),
  totalPtsDisplay:  $('totalPtsDisplay'),
  tierProgressFill: $('tierProgressFill'),
  tierProgressLabel:$('tierProgressLabel'),
  weekSavings:      $('weekSavings'),
  weekAvg:          $('weekAvg'),
  weekBest:         $('weekBest'),
  barChartWrap:     $('barChartWrap'),
  chartGoalLineLabel:$('chartGoalLineLabel'),
  weeklyTableBody:  $('weeklyTableBody'),
};

/* ── UI RENDERING ────────────────────────────────────────── */
function updateGreeting() {
  const h = new Date().getHours();
  if (h < 12) dom.heroGreeting.textContent = 'Good morning ☀️';
  else if (h < 17) dom.heroGreeting.textContent = 'Good afternoon 🌤️';
  else dom.heroGreeting.textContent = 'Good evening 🌙';
}

function renderHero() {
  dom.totalFootprintDisplay.textContent = state.totalFootprint.toFixed(2);
  dom.heroGoalDisplay.textContent = `${state.dailyGoal.toFixed(1)} kg`;

  // Ring animation
  const CIRCUMFERENCE = 2 * Math.PI * 80; // r=80 => 502.65
  const pct = Math.min(state.totalFootprint / state.dailyGoal, 1.5);
  const offset = CIRCUMFERENCE - (pct * CIRCUMFERENCE);
  dom.ringFill.style.strokeDashoffset = offset;
  dom.ringGlow.style.strokeDashoffset = offset;
  dom.ringPercent.textContent = Math.round(pct * 100) + '%';

  const overRatio = state.totalFootprint / state.dailyGoal;
  if (overRatio > 1.3) {
    dom.ringFill.style.stroke = '#EF4444';
    dom.ringGlow.style.stroke = '#EF4444';
  } else if (overRatio > 1) {
    dom.ringFill.style.stroke = '#F59E0B';
    dom.ringGlow.style.stroke = '#F59E0B';
  } else {
    dom.ringFill.style.stroke = '#10B981';
    dom.ringGlow.style.stroke = '#10B981';
  }

  // Status pill
  dom.goalStatusPill.className = 'goal-status-pill';
  if (overRatio > 1.3) {
    dom.goalStatusPill.classList.add('danger');
    dom.goalStatusText.textContent = '⚠️ Significantly over goal';
  } else if (overRatio > 1) {
    dom.goalStatusPill.classList.add('over-goal');
    dom.goalStatusText.textContent = 'Slightly over goal';
  } else if (overRatio > 0.8) {
    dom.goalStatusText.textContent = '✓ On track';
  } else {
    dom.goalStatusText.textContent = '🌟 Excellent! Well below goal';
  }
}

function renderSubtotals() {
  const maxVal = Math.max(state.eEnergy, state.eTransit, state.eFood, 0.01);

  dom.energySubtotal.textContent  = state.eEnergy.toFixed(2);
  dom.transitSubtotal.textContent = state.eTransit.toFixed(2);
  dom.foodSubtotal.textContent    = state.eFood.toFixed(2);

  dom.energyBar.style.width  = Math.min((state.eEnergy  / maxVal) * 100, 100) + '%';
  dom.transitBar.style.width = Math.min((state.eTransit / maxVal) * 100, 100) + '%';
  dom.foodBar.style.width    = Math.min((state.eFood    / maxVal) * 100, 100) + '%';
}

function renderSliders() {
  // Update slider gradient fills
  function setGrad(el, pct, color) {
    el.style.background = `linear-gradient(to right, ${color} ${pct}%, #E5E7EB ${pct}%)`;
  }
  const ePct = (state.electricity / 1000) * 100;
  const dPct = (state.distance / 100) * 100;
  const mPct = (state.meat / 1) * 100;
  const pPct = (state.plant / 2) * 100;

  setGrad(dom.electricitySlider, ePct, '#3B82F6');
  setGrad(dom.distanceSlider, dPct, '#F59E0B');
  setGrad(dom.meatSlider, mPct, '#EF4444');
  setGrad(dom.plantSlider, pPct, '#10B981');

  dom.electricitySlider.value = state.electricity;
  dom.distanceSlider.value    = state.distance;
  dom.meatSlider.value        = state.meat;
  dom.plantSlider.value       = state.plant;

  dom.electricityValue.textContent = `${state.electricity} kWh`;
  dom.distanceValue.textContent    = `${state.distance} km`;
  dom.meatValue.textContent        = `${state.meat.toFixed(2)} kg`;
  dom.plantValue.textContent       = `${state.plant.toFixed(2)} kg`;
}

function renderModeTags() {
  dom.modeTags.forEach(tag => {
    tag.classList.toggle('active', tag.dataset.mode === state.transitMode);
  });
}

function renderChallenge({ challengePoints }) {
  const CIRC = 2 * Math.PI * 32; // r=32 => 201.06
  const pct  = state.challengeClaimed ? 1 : Math.min(challengePoints / 50, 1);
  dom.challengeRingFill.style.strokeDashoffset = CIRC - pct * CIRC;

  dom.savingsKg.textContent      = state.carbonSaved.toFixed(2);
  dom.challengePoints.textContent = challengePoints;

  if (state.challengeClaimed) {
    dom.claimBtn.textContent = '✓ Claimed!';
    dom.claimBtn.classList.add('claimed');
    dom.claimBtn.disabled = true;
  } else {
    dom.claimBtn.textContent = 'Claim Reward';
    dom.claimBtn.classList.remove('claimed');
    dom.claimBtn.disabled = false;
  }
}

function renderEcoPoints() {
  dom.headerEcoPoints.textContent = state.ecoPoints;
}

function renderBaselineTable() {
  const modeLabel = { gasoline:'⛽ Gasoline Car', ev:'⚡ EV', transit:'🚌 Bus/Train', bike:'🚲 Bike/Walk' };
  const efMode = EF[state.transitMode] ?? EF.gasoline;

  const rows = [
    {
      param: 'Monthly Electricity',
      value: `${state.electricity} kWh`,
      ef: `${EF.grid} kg/kWh ÷ ${state.householdSize} person(s)`,
      impact: state.eEnergy.toFixed(3),
      level: state.eEnergy < 1 ? 'green' : state.eEnergy < 3 ? 'amber' : 'red',
    },
    {
      param: 'Daily Distance',
      value: `${state.distance} km`,
      ef: `${efMode} kg/km (${modeLabel[state.transitMode]})`,
      impact: state.eTransit.toFixed(3),
      level: state.eTransit < 2 ? 'green' : state.eTransit < 5 ? 'amber' : 'red',
    },
    {
      param: 'Meat Consumption',
      value: `${state.meat.toFixed(2)} kg`,
      ef: `${EF.meat} kg CO₂e/kg`,
      impact: (state.meat * EF.meat).toFixed(3),
      level: state.meat < 0.1 ? 'green' : state.meat < 0.3 ? 'amber' : 'red',
    },
    {
      param: 'Plant Foods',
      value: `${state.plant.toFixed(2)} kg`,
      ef: `${EF.plant} kg CO₂e/kg`,
      impact: (state.plant * EF.plant).toFixed(3),
      level: 'green',
    },
    {
      param: '📊 Total Daily Footprint',
      value: `${state.totalFootprint.toFixed(3)} kg CO₂e`,
      ef: '—',
      impact: state.totalFootprint.toFixed(3),
      level: state.totalFootprint <= state.dailyGoal ? 'green' : state.totalFootprint <= state.dailyGoal * 1.3 ? 'amber' : 'red',
      bold: true,
    },
  ];

  dom.baselineTableBody.innerHTML = rows.map(r => `
    <tr>
      <td style="font-weight:${r.bold ? '700' : '400'}">${r.param}</td>
      <td>${r.value}</td>
      <td style="color:var(--slate-light);font-size:.8rem">${r.ef}</td>
      <td>
        <span class="badge-cell badge-${r.level}">
          ${r.impact} kg CO₂e
        </span>
      </td>
    </tr>
  `).join('');
}

/* ── MASTER RENDER ───────────────────────────────────────── */
function render() {
  const { challengePoints } = recalculate();
  renderHero();
  renderSubtotals();
  renderSliders();
  renderModeTags();
  renderChallenge({ challengePoints });
  renderEcoPoints();
  renderBaselineTable();
  saveState();
}

/* ── ANALYTICS RENDERING ─────────────────────────────────── */
function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function saveTodayToHistory() {
  const key = getTodayKey();
  const existing = state.history.findIndex(d => d.date === key);
  const snapshot = {
    date:    key,
    energy:  parseFloat(state.eEnergy.toFixed(3)),
    transit: parseFloat(state.eTransit.toFixed(3)),
    food:    parseFloat(state.eFood.toFixed(3)),
    total:   parseFloat(state.totalFootprint.toFixed(3)),
    points:  state.ecoPoints,
  };
  if (existing >= 0) {
    state.history[existing] = snapshot;
  } else {
    state.history.push(snapshot);
  }
  if (state.history.length > 7) state.history = state.history.slice(-7);
  saveState();
}

function getWeekData() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const found = state.history.find(h => h.date === key);
    days.push({
      date: key,
      day: dayName,
      energy:  found?.energy  ?? null,
      transit: found?.transit ?? null,
      food:    found?.food    ?? null,
      total:   found?.total   ?? null,
      points:  found?.points  ?? null,
    });
  }
  return days;
}

function renderAnalytics() {
  saveTodayToHistory();
  const weekData = getWeekData();

  // Tier
  const totalPts = state.ecoPoints;
  dom.totalPtsDisplay.textContent = totalPts;
  let tier = TIER_THRESHOLDS[0];
  for (const t of TIER_THRESHOLDS) {
    if (totalPts >= t.min) tier = t;
  }
  dom.tierBadgeIcon.textContent = tier.icon;
  dom.tierName.textContent = tier.name;

  const nextTier = TIER_THRESHOLDS.find(t => t.min > tier.min);
  if (nextTier) {
    const progress = ((totalPts - tier.min) / (nextTier.min - tier.min)) * 100;
    dom.tierProgressFill.style.width = Math.min(progress, 100) + '%';
    dom.tierProgressLabel.textContent = `${totalPts - tier.min} / ${nextTier.min - tier.min} pts to next tier`;
  } else {
    dom.tierProgressFill.style.width = '100%';
    dom.tierProgressLabel.textContent = 'Maximum tier achieved! 🏆';
  }

  // Stats
  const validDays = weekData.filter(d => d.total !== null);
  const totalSaved = validDays.reduce((s, d) => {
    const gasCost = (d.transit / (EF[state.transitMode] || EF.gasoline)) * EF.gasoline;
    return s + Math.max(0, gasCost - d.transit);
  }, 0);
  dom.weekSavings.textContent = totalSaved.toFixed(2) + ' kg';

  const avg = validDays.length ? validDays.reduce((s, d) => s + d.total, 0) / validDays.length : 0;
  dom.weekAvg.textContent = avg.toFixed(2) + ' kg/day';

  const best = validDays.length ? Math.min(...validDays.map(d => d.total)) : null;
  dom.weekBest.textContent = best !== null ? best.toFixed(2) + ' kg' : '—';

  // Bar chart
  const maxTotal = Math.max(...weekData.map(d => d.total ?? 0), state.dailyGoal, 0.1);
  const chartHeight = 160;
  const goalPct = (state.dailyGoal / maxTotal) * chartHeight;

  dom.chartGoalLineLabel.style.bottom = (goalPct + 36) + 'px'; // offset above bars

  dom.barChartWrap.style.setProperty('--goal-pct', goalPct + 'px');
  dom.barChartWrap.style.cssText += `; --goal-y: ${Math.round(chartHeight - goalPct)}px`;

  // Draw the dashed goal line via position
  dom.barChartWrap.style.position = 'relative';
  dom.barChartWrap.querySelector?.('#goalLine')?.remove();
  const goalLine = document.createElement('div');
  goalLine.id = 'goalLine';
  goalLine.style.cssText = `
    position:absolute;left:0;right:0;
    border-top:2px dashed #10B981;
    bottom:${Math.round(goalPct) + 20}px;
    pointer-events:none;
    z-index:2;
  `;
  dom.barChartWrap.appendChild(goalLine);

  dom.barChartWrap.innerHTML = '';
  dom.barChartWrap.appendChild(goalLine);

  weekData.forEach(d => {
    const pct = d.total !== null ? Math.min(d.total / maxTotal, 1) : 0;
    const h   = Math.round(pct * chartHeight);
    const color = d.total === null ? 'green' :
                  d.total <= state.dailyGoal ? 'green' : 
                  d.total <= state.dailyGoal * 1.3 ? 'amber' : 'red';
    const isToday = d.date === getTodayKey();

    const col = document.createElement('div');
    col.className = 'bar-col';
    col.innerHTML = `
      <div class="bar-value">${d.total !== null ? d.total.toFixed(1) : '—'}</div>
      <div class="bar-outer" title="${d.date}">
        <div class="bar-fill ${color}" style="height:${h}px;${isToday ? 'opacity:1;box-shadow:0 0 10px rgba(16,185,129,.35);' : 'opacity:.85'}"></div>
      </div>
      <div class="bar-day" style="${isToday ? 'color:var(--green-dark);font-weight:800;' : ''}">${d.day}${isToday ? ' •' : ''}</div>
    `;
    dom.barChartWrap.appendChild(col);
  });

  dom.barChartWrap.appendChild(goalLine);

  // Weekly table
  dom.weeklyTableBody.innerHTML = weekData.map(d => {
    const isToday = d.date === getTodayKey();
    const rowStyle = isToday ? 'background:var(--green-light);' : '';
    if (d.total === null) {
      return `<tr style="${rowStyle}">
        <td>${d.day} <span style="font-size:.7rem;color:var(--slate-light)">${d.date}</span>${isToday ? ' <span class="badge-cell badge-green">Today</span>' : ''}</td>
        <td colspan="5" style="color:var(--slate-light);font-style:italic">No data</td>
      </tr>`;
    }
    const lvl = d.total <= state.dailyGoal ? 'green' : d.total <= state.dailyGoal * 1.3 ? 'amber' : 'red';
    return `<tr style="${rowStyle}">
      <td>${d.day} <span style="font-size:.7rem;color:var(--slate-light)">${d.date}</span>${isToday ? ' <span class="badge-cell badge-green">Today</span>' : ''}</td>
      <td>${d.energy?.toFixed(2) ?? '—'}</td>
      <td>${d.transit?.toFixed(2) ?? '—'}</td>
      <td>${d.food?.toFixed(2) ?? '—'}</td>
      <td><span class="badge-cell badge-${lvl}">${d.total.toFixed(2)} kg</span></td>
      <td style="font-weight:700;color:var(--green-dark)">${d.points ?? 0} ⚡</td>
    </tr>`;
  }).join('');
}

/* ── ONBOARDING LOGIC ────────────────────────────────────── */
let currentObStep = 1;

function goToObStep(n) {
  dom.steps[currentObStep]?.classList.remove('active');
  currentObStep = n;
  dom.steps[currentObStep]?.classList.add('active');
  dom.obProgressFill.style.width = (n / 3 * 100) + '%';
}

function finishOnboarding() {
  state.onboardingDone = true;
  dom.overlay.style.opacity = '0';
  dom.overlay.style.pointerEvents = 'none';
  setTimeout(() => { dom.overlay.style.display = 'none'; }, 400);
  dom.appMain.style.display = 'block';
  setTimeout(() => render(), 50);
  showToast('🌱 Profile saved! Let\'s start tracking.');
}

/* ── VEHICLE SELECTOR ────────────────────────────────────── */
document.querySelectorAll('.vehicle-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.vehicleType  = card.dataset.value;
    state.transitMode  = card.dataset.value === 'none' ? 'bike' : card.dataset.value;
  });
});

/* ── GOAL SELECTOR ───────────────────────────────────────── */
document.querySelectorAll('.goal-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.dailyGoal = parseFloat(card.dataset.value);
  });
});

/* ── ONBOARDING BUTTONS ──────────────────────────────────── */
$('houseIncrease').addEventListener('click', () => {
  if (state.householdSize < 12) {
    state.householdSize++;
    dom.householdDisplay.textContent = state.householdSize;
  }
});
$('houseDecrease').addEventListener('click', () => {
  if (state.householdSize > 1) {
    state.householdSize--;
    dom.householdDisplay.textContent = state.householdSize;
  }
});

$('obStep1Next').addEventListener('click', () => {
  state.postalCode = dom.postalCode.value.trim();
  goToObStep(2);
});
$('obStep2Back').addEventListener('click', () => goToObStep(1));
$('obStep2Next').addEventListener('click', () => goToObStep(3));
$('obStep3Back').addEventListener('click', () => goToObStep(2));
$('obStep3Finish').addEventListener('click', finishOnboarding);
$('settingsBtn').addEventListener('click', () => {
  // Re-open onboarding
  state.onboardingDone = false;
  dom.overlay.style.display = 'flex';
  dom.overlay.style.opacity = '1';
  dom.overlay.style.pointerEvents = 'all';
  goToObStep(1);
  dom.householdDisplay.textContent = state.householdSize;
  dom.postalCode.value = state.postalCode;
});

/* ── SLIDER EVENT LISTENERS ──────────────────────────────── */
dom.electricitySlider.addEventListener('input', e => {
  state.electricity = parseInt(e.target.value);
  render();
});
dom.distanceSlider.addEventListener('input', e => {
  state.distance = parseInt(e.target.value);
  state.challengeClaimed = false;
  render();
});
dom.meatSlider.addEventListener('input', e => {
  state.meat = parseFloat(e.target.value);
  render();
});
dom.plantSlider.addEventListener('input', e => {
  state.plant = parseFloat(e.target.value);
  render();
});

/* ── TRANSIT MODE TAGS ───────────────────────────────────── */
dom.modeTags.forEach(tag => {
  tag.addEventListener('click', () => {
    state.transitMode = tag.dataset.mode;
    state.challengeClaimed = false;
    render();
  });
});

/* ── CLAIM CHALLENGE ─────────────────────────────────────── */
$('claimBtn').addEventListener('click', () => {
  if (state.challengeClaimed) return;

  const { challengePoints } = recalculate();
  if (challengePoints <= 0) {
    showToast('💡 Switch to Bus/Train mode to earn points!');
    return;
  }

  state.challengeClaimed = true;
  state.ecoPoints += challengePoints;

  // Update celebration modal
  dom.celebPoints.textContent = `${challengePoints} eco-points`;
  dom.celebKg.textContent     = state.carbonSaved.toFixed(2);

  // Show celebration
  dom.celebrationOverlay.classList.add('active');
  spawnConfetti();

  // Animate badge
  dom.ecoPointsBadge.classList.remove('bump');
  void dom.ecoPointsBadge.offsetWidth;
  dom.ecoPointsBadge.classList.add('bump');

  render();
  saveTodayToHistory();
});

$('celebClose').addEventListener('click', () => {
  dom.celebrationOverlay.classList.remove('active');
  dom.confettiContainer.innerHTML = '';
});

/* ── CONFETTI ─────────────────────────────────────────────── */
function spawnConfetti() {
  dom.confettiContainer.innerHTML = '';
  const colors = ['#10B981','#34D399','#6EE7B7','#F59E0B','#FCD34D','#3B82F6','#A78BFA','#F472B6'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 8;
    piece.style.cssText = `
      left:${Math.random() * 100}%;
      width:${size}px;
      height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${1.5 + Math.random() * 2}s;
      animation-delay:${Math.random() * .6}s;
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      transform:rotate(${Math.random()*360}deg);
    `;
    dom.confettiContainer.appendChild(piece);
  }
}

/* ── TOAST ───────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 3000);
}

/* ── NAV SWITCHING ───────────────────────────────────────── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    state.currentView = view;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('view' + view.charAt(0).toUpperCase() + view.slice(1)).classList.add('active');

    if (view === 'analytics') {
      renderAnalytics();
    }
  });
});

/* ── SEED DEMO HISTORY ───────────────────────────────────── */
function seedDemoHistory() {
  const today = new Date();
  const demoData = [
    { energy: 0.72, transit: 3.84, food: 6.15, points: 12 },
    { energy: 0.68, transit: 1.12, food: 8.10, points: 25 },
    { energy: 0.91, transit: 0.56, food: 4.50, points: 48 },
    { energy: 0.55, transit: 2.88, food: 3.30, points: 30 },
    { energy: 0.80, transit: 0.00, food: 2.25, points: 55 },
    { energy: 0.61, transit: 1.92, food: 7.20, points: 18 },
  ];

  for (let i = 6; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (!state.history.find(h => h.date === key)) {
      const demo = demoData[6 - i];
      if (demo) {
        state.history.push({
          date:    key,
          energy:  demo.energy,
          transit: demo.transit,
          food:    demo.food,
          total:   parseFloat((demo.energy + demo.transit + demo.food).toFixed(3)),
          points:  demo.points,
        });
      }
    }
  }
}

/* ── INIT ────────────────────────────────────────────────── */
function init() {
  updateGreeting();
  const hasState = loadState();

  if (hasState && state.onboardingDone) {
    // Hydrate UI from saved state
    dom.overlay.style.display = 'none';
    dom.appMain.style.display = 'block';

    // Restore slider values
    dom.electricitySlider.value = state.electricity;
    dom.distanceSlider.value    = state.distance;
    dom.meatSlider.value        = state.meat;
    dom.plantSlider.value       = state.plant;
    dom.householdDisplay.textContent = state.householdSize;

    // Restore mode tag
    renderModeTags();

    render();
    showToast('👋 Welcome back! Your progress has been restored.');
  } else {
    // Fresh start — show onboarding
    if (!state.history || state.history.length === 0) {
      seedDemoHistory();
    }
    dom.overlay.style.display = 'flex';
    goToObStep(1);
    dom.obProgressFill.style.width = '33%';
  }
}

/* ── AUTO-SAVE TODAY'S SNAPSHOT PERIODICALLY ─────────────── */
setInterval(() => {
  if (state.onboardingDone) saveTodayToHistory();
}, 60 * 1000); // every minute

init();
