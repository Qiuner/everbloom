/* 永生花 · Everbloom — 花田
 * 不往下滚，而是漫游：横轴是时间的土壤，每株花种在原作诞生的那一年。
 * 拖动漫游 · 滚轮穿越年份 · 双指 / Ctrl+滚轮缩放 · / 寻花 · N 札记
 */
(function () {
  const E = window.Everbloom;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const el = E.el;

  /* ---------------- 世界坐标 ---------------- */

  // 原作首次发布年份与版本（公开常识），决定每株花种在哪一年
  const BORN = {
    '001': [1990, 'Photoshop 1.0'], '002': [1991, 'Premiere 1.0'], '003': [1987, 'Illustrator 1.0'],
    '004': [2007, 'Lightroom 1.0'], '005': [1993, 'Acrobat 1.0'], '006': [1983, 'Word 1.0'],
    '007': [1991, 'Pro Tools'], '008': [1982, 'AutoCAD'], '009': [1987, 'PowerPoint 1.0'], '010': [1985, 'Excel 1.0']
  };
  // 同一年的花左右错开；高度只为构图，不编码数据
  const LAYOUT = {
    '001': [0, 860], '002': [-85, 600], '003': [-85, 740], '004': [0, 780], '005': [0, 640],
    '006': [0, 880], '007': [95, 960], '008': [0, 700], '009': [85, 540], '010': [0, 620]
  };

  const Y0 = 1979, Y1 = 2037, K = 150, PAD = 400;
  const GROUND = 1400, H = 2050;
  const X = y => PAD + (y - Y0) * K;
  const W = X(Y1) + PAD;
  const NOW = 2026 + 9.25 / 12;
  const PLOT0 = X(2027.4), PLOT1 = X(2036.6);
  const ZMAX = 2.2;

  const field = $('#field'), world = $('#world'), svg = $('#worldSvg'), labelsEl = $('#labels');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const rnd = E.rng(E.hash('field'));

  /* ---------------- 绘制：土壤、年份、野草、今天、采集地 ---------------- */

  const gBack = el('g', { class: 'back' }, svg);
  el('path', { d: `M${X(Y0)} ${GROUND} H${X(Y1)}`, class: 'soil' }, gBack);
  for (let y = Y0; y <= Y1; y++) {
    const major = y % 10 === 0, mid = y % 5 === 0;
    el('line', { x1: X(y), y1: GROUND, x2: X(y), y2: GROUND + (major ? 36 : mid ? 22 : 11), class: major ? 'tick tick-major' : 'tick' }, gBack);
    if (major || mid) {
      const t = el('text', { x: X(y), y: GROUND + (major ? 92 : 72), class: major ? 'year-label' : 'year-label minor' }, gBack);
      t.textContent = y;
    }
  }

  // 天空里淡淡的年代名
  [['八十年代', 1985], ['九十年代', 1995], ['千禧年后', 2005], ['一〇年代', 2015], ['二〇年代', 2024]].forEach(([t, y]) => {
    el('text', { x: X(y), y: GROUND - 1020, class: 'era-name' }, gBack).textContent = t;
  });

  // 一层野草（单条路径）
  let grass = '';
  for (let x = X(Y0) + 10; x < X(Y1) - 10; x += 14 + rnd() * 14) {
    const h = 18 + rnd() * 46, dx = (rnd() - .4) * 22;
    grass += `M${x.toFixed(0)} ${GROUND} Q${(x + dx * .3).toFixed(0)} ${(GROUND - h * .6).toFixed(0)} ${(x + dx).toFixed(0)} ${(GROUND - h).toFixed(0)}`;
  }
  el('path', { d: grass, class: 'grass' }, gBack);

  // 今天
  const nx = X(NOW);
  el('line', { x1: nx, y1: GROUND - 1180, x2: nx, y2: GROUND + 40, class: 'now-line' }, gBack);
  el('text', { x: nx + 22, y: GROUND - 1140, class: 'now-label' }, gBack).textContent = '今天 · 2026.10';
  el('text', { x: nx + 22, y: GROUND - 1090, class: 'now-sub' }, gBack).textContent = '这些花都在这一年被重新看见';

  // 采集地
  const gPlot = el('g', { class: 'plot' }, svg);
  for (let i = 0; i < 6; i++) {
    let d = `M${PLOT0} ${GROUND + 14 + i * 17}`;
    for (let x = PLOT0; x <= PLOT1; x += 120) d += ` Q${x + 60} ${GROUND + 8 + i * 17 + (i % 2 ? 4 : -4)} ${x + 120} ${GROUND + 14 + i * 17}`;
    el('path', { d, class: 'plot-furrow' }, gPlot);
  }
  el('text', { x: PLOT0, y: GROUND - 1000, class: 'plot-title' }, gPlot).textContent = '采集地';
  el('text', { x: PLOT0 + 4, y: GROUND - 945, class: 'plot-sub' }, gPlot).textContent = '世界上有这么多花。点一下种子袋，种一株世上还没有的。';

  // 种子袋
  const packet = el('g', { class: 'seed-packet', transform: `translate(${PLOT0 + 40} ${GROUND - 250})`, tabindex: 0, role: 'button', 'aria-label': '种一株随机的花', 'data-cursor': '种一株' }, gPlot);
  const pk = el('g', { class: 'packet-body' }, packet);
  el('path', { d: 'M0 30 L0 240 L170 240 L170 30 L150 0 L20 0 Z', class: 'packet-paper' }, pk);
  el('path', { d: 'M0 30 L170 30', class: 'packet-fold' }, pk);
  const pkf = el('g', { transform: 'translate(85 118) scale(1.05)' }, pk);
  E.drawBloom(pkf, E.SPECIES.cosmos, E.rng(3), true);
  el('text', { x: 85, y: 214, class: 'packet-text' }, pk).textContent = '种 子';
  el('rect', { x: -30, y: -30, width: 230, height: 300, class: 'hit' }, packet);

  /* ---------------- 装饰：小野花 ---------------- */

  const mainXs = E.SPECIMENS.map(s => X(BORN[s.no][0]) + LAYOUT[s.no][0]);
  const gWild = el('g', { class: 'wild' }, svg);
  const keys = Object.keys(E.SPECIES);
  let placed = 0;
  for (let tries = 0; placed < 34 && tries < 400; tries++) {
    const x = X(Y0 + 1) + rnd() * (X(NOW - .5) - X(Y0 + 1));
    if (mainXs.some(m => Math.abs(m - x) < 170)) continue;
    placed++;
    const h = 60 + rnd() * 150, bend = (rnd() - .5) * 30;
    const g = el('g', { transform: `translate(${x.toFixed(0)} ${GROUND})` }, gWild);
    el('path', { d: `M0 0 Q${bend * .3} ${-h * .5} ${bend} ${-h}`, class: 'wild-stem' }, g);
    const b = el('g', { transform: `translate(${bend} ${-h}) scale(${(.32 + rnd() * .22).toFixed(2)}) rotate(${(rnd() * 360).toFixed(0)})` }, g);
    const sp = E.SPECIES[keys[Math.floor(rnd() * keys.length)]];
    E.drawBloom(b, sp.cluster ? E.SPECIES.poppy : sp, rnd, true);
  }

  /* ---------------- 标本：每株花 ---------------- */

  const gFlowers = el('g', { class: 'flowers' }, svg);
  const cubicAt = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };

  function drawFlowerHead(parent, sp, r, radius) {
    if (sp.cluster) {
      const k = sp.cluster, s = radius / 58;
      const head = el('g', { transform: `scale(${s.toFixed(3)})` }, parent);
      for (let i = 0; i < k.count; i++) {
        const rr = Math.sqrt((i + .5) / k.count) * k.spread, a = i * 2.39996;
        const fg = el('g', { transform: `translate(${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr * .8).toFixed(1)}) scale(${(k.scale * (.85 + r() * .3)).toFixed(3)}) rotate(${(r() * 360).toFixed(0)})` }, head);
        E.drawBloom(fg, sp, r, true);
      }
    } else {
      const maxL = Math.max(...sp.rings.map(x => x.L));
      const head = el('g', { transform: `scale(${(radius / maxL).toFixed(3)}) rotate(${((r() - .5) * 20).toFixed(1)})` }, parent);
      E.drawBloom(head, sp, r, true);
    }
  }

  function growPlant(parent, x, h, sp, r, opts) {
    opts = opts || {};
    const g = el('g', { transform: `translate(${x.toFixed(1)} ${GROUND})`, class: opts.cls || '' }, parent);
    const sway = el('g', { class: 'sway', style: `--d:${(6 + r() * 3).toFixed(2)}s;--delay:${(-r() * 6).toFixed(2)}s` }, g);
    const bend = (r() - .5) * (opts.bend || 120);
    el('path', { d: `M0 0 C${(bend * .2).toFixed(1)} ${(-h * .35).toFixed(1)} ${bend.toFixed(1)} ${(-h * .65).toFixed(1)} ${bend.toFixed(1)} ${-h}`, class: 'fstem stem' }, sway);
    const nLeaves = Math.max(1, Math.round(h / 280));
    for (let i = 0; i < nLeaves; i++) {
      const t = .22 + i * (.5 / nLeaves);
      const px = cubicAt(0, bend * .2, bend, bend, t), py = cubicAt(0, -h * .35, -h * .65, -h, t);
      const left = i % 2 === 0;
      const leaf = sp.leaf === 'pad' || sp.leaf === 'blade' ? 'lance' : sp.leaf;
      E.drawLeaf(sway, px, py, left ? -150 - r() * 15 : -30 + r() * 15, (opts.leaf || 120) * (.85 + r() * .3), leaf, '#6E7F45', true, r);
    }
    const head = el('g', { class: 'bloom', transform: `translate(${bend.toFixed(1)} ${-h})` }, sway);
    drawFlowerHead(head, sp, r, opts.radius || 110);
    return { g, sway, top: { x: x + bend, y: GROUND - h } };
  }

  const flowers = E.SPECIMENS.map(s => {
    const [year, bornName] = BORN[s.no];
    const [dx, h] = LAYOUT[s.no];
    const x = X(year) + dx, pressed = !!s.status;
    const sp = E.SPECIES[s.species];
    const r = E.rng(E.hash('field-' + s.name));

    // 根：地下写着原作
    const gr = el('g', { class: 'roots', transform: `translate(${x} ${GROUND})` }, gFlowers);
    let rd = '';
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * .32 + (r() - .5) * .2, L = 80 + r() * 70;
      rd += `M0 4 Q${(Math.sin(a) * L * .4).toFixed(0)} ${(L * .5).toFixed(0)} ${(Math.sin(a) * L).toFixed(0)} ${L.toFixed(0)}`;
    }
    el('path', { d: rd, class: 'root' }, gr);
    el('text', { x: 0, y: 236, class: 'root-year' }, gr).textContent = year;
    el('text', { x: 0, y: 274, class: 'root-name' }, gr).textContent = bornName;

    const plant = growPlant(gFlowers, x, h, sp, r, { cls: 'flower ' + (pressed ? 'is-pressed' : 'bud') });
    const g = plant.g;
    g.setAttribute('data-no', s.no);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${s.name}，对应 ${s.orig}（${year}），${pressed ? '已压制，部分核实' : '花苞，待采集'}`);
    g.setAttribute('data-cursor', pressed ? '看看这株 →' : '看看花苞');
    el('circle', { cx: plant.top.x - x, cy: -h, r: 150, class: 'hit' }, plant.sway);

    const label = document.createElement('div');
    label.className = 'flabel ' + (pressed ? 'is-pressed' : 'is-lead');
    label.innerHTML = `
      <div class="no">No. ${s.no} · ${year}</div>
      <div class="nm">${s.name}</div>
      <div class="mt">${sp.zh} · 对应 ${s.orig}</div>
      <div class="more">
        ${pressed
          ? `<span class="stamp partial">部分核实</span>
             <p>以纯 Rust 重新写出的 ${s.orig} 风格编辑器。v0.3.0，early alpha；核查于 2026-10-07，文档核对、未运行。</p>
             <a class="btn" href="${s.href}">翻开标本 →</a>`
          : `<p>还是花苞。线索来自公开仓库的描述，尚未核查——${sp.zh}，${s.why}。</p>
             <a class="btn ghost" href="${s.repo}" target="_blank" rel="noopener">去源头看看 ↗</a>`}
      </div>`;
    labelsEl.appendChild(label);
    return { s, sp, year, bornName, x, h, g, label, top: plant.top, pressed };
  });
  const byYear = flowers.slice().sort((a, b) => a.x - b.x);

  /* ---------------- 采集地：你种下的花 ---------------- */

  const SLOT0 = PLOT0 + 440, GAP = 200;
  const SLOTS = Math.max(1, Math.floor((PLOT1 - SLOT0) / GAP) + 1);
  const gGarden = el('g', { class: 'garden' }, svg);
  const slotNodes = [];
  let garden = [];
  try { garden = JSON.parse(localStorage.getItem('everbloom-garden') || '[]'); } catch (e) { garden = []; }
  if (!Array.isArray(garden)) garden = [];

  function plant(seed, index, animate) {
    const slot = index % SLOTS;
    if (slotNodes[slot]) slotNodes[slot].remove();
    const sp = E.randomSpecies(seed);
    const r = E.rng(seed);
    const x = SLOT0 + slot * GAP + (r() - .5) * 50, h = 300 + r() * 380;
    const p = growPlant(gGarden, x, h, sp, r, { cls: 'planted', radius: 82, leaf: 90, bend: 80 });
    el('text', { x: 0, y: 70, class: 'plant-no' }, p.g).textContent = 'No. ∞–' + String(index + 1).padStart(4, '0');
    el('text', { x: 0, y: 110, class: 'plant-name' }, p.g).textContent = sp.zh;
    el('text', { x: 0, y: 142, class: 'plant-latin' }, p.g).textContent = sp.latin;
    slotNodes[slot] = p.g;
    if (animate && !reduced) {
      E.hideFlora(p.g);
      E.bloomIn(p.g, { speed: 1.1 });
    }
    return { sp, top: p.top };
  }
  const startAt = Math.max(0, garden.length - SLOTS);
  garden.slice(startAt).forEach((seed, i) => plant(seed, startAt + i, false));

  function sow() {
    const seed = Math.floor(Math.random() * 1e9);
    garden.push(seed);
    if (garden.length > 200) garden = garden.slice(-200);
    try { localStorage.setItem('everbloom-garden', JSON.stringify(garden)); } catch (e) {}
    const res = plant(seed, garden.length - 1, true);
    flyTo({ x: res.top.x - 80, y: GROUND - 330, z: .62 }, 900);
    packet.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px) rotate(-4deg)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)', composite: 'add' });
    toast(`种下了 <b>${res.sp.zh}</b> <i>${res.sp.latin}</i> · 第 ${garden.length} 株`);
  }

  /* ---------------- 镜头 ---------------- */

  let vw = innerWidth, vh = innerHeight;
  // 宽屏的全景装下 1980—2030；手机屏太窄，全景只取最密的 1980—1994，其余靠拖与缩放
  const fullZ = () => Math.min(vw / (X(2031) - X(1980)), vh / 1450);
  const fitZ = () => vw < 760 ? Math.min(vw / (X(1994.5) - X(1980.3)), vh / 1450) : fullZ();
  const zmin = () => fullZ() * .8;
  const cam = { x: X(1995), y: GROUND - 520, z: .2 };
  const tgt = { x: cam.x, y: cam.y, z: cam.z };
  let tween = null, level = '', lastKey = '', focused = null, moveTimer;

  // 镜头不越过时间的两端；土壤至少留在屏幕 65% 以下，免得只看见空空的天
  function clampCam(c) {
    c.z = clamp(c.z, zmin(), ZMAX);
    const half = vw / 2 / c.z;
    const lo = X(Y0) - 60 + half, hi = X(Y1) + 60 - half;
    c.x = lo > hi ? (X(Y0) + X(Y1)) / 2 : clamp(c.x, lo, hi);
    c.y = clamp(c.y, GROUND - 1150, Math.max(GROUND - 1150, GROUND - .15 * vh / c.z));
    return c;
  }
  clampCam(cam); Object.assign(tgt, cam);

  // 全景：土壤落在屏幕约 70% 的高度
  const overviewTarget = () => {
    const z = fitZ();
    const x = vw < 760 ? (X(1980.3) + X(1994.5)) / 2 : (X(1980) + X(2030)) / 2;
    return clampCam({ x, y: GROUND - .13 * vh / z, z });
  };

  function flyTo(target, dur) {
    const b = clampCam(Object.assign({}, target));
    if (reduced) { Object.assign(cam, b); Object.assign(tgt, b); return; }
    const dist = Math.hypot(b.x - cam.x, b.y - cam.y) * Math.min(cam.z, b.z);
    tween = {
      a: Object.assign({}, cam), b, t0: performance.now(),
      dur: dur || clamp(700 + dist * .35, 700, 2000),
      dip: clamp(dist / (vw * 2.2), 0, .6)
    };
  }

  function frame(now) {
    if (tween) {
      const t = clamp((now - tween.t0) / tween.dur, 0, 1), e = easeInOut(t);
      cam.x = lerp(tween.a.x, tween.b.x, e);
      cam.y = lerp(tween.a.y, tween.b.y, e);
      // 远距离飞行：中途拉远，像鸟一样起落
      cam.z = Math.exp(lerp(Math.log(tween.a.z), Math.log(tween.b.z), e)) * (1 - tween.dip * Math.sin(Math.PI * e));
      if (t >= 1) { Object.assign(cam, tween.b); tween = null; }
      Object.assign(tgt, cam);
    } else {
      cam.x = lerp(cam.x, tgt.x, .16);
      cam.y = lerp(cam.y, tgt.y, .16);
      cam.z = Math.exp(lerp(Math.log(cam.z), Math.log(tgt.z), .16));
    }
    const key = cam.x.toFixed(1) + ',' + cam.y.toFixed(1) + ',' + cam.z.toFixed(4);
    if (key !== lastKey) {
      lastKey = key;
      apply();
      world.classList.add('moving');
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => world.classList.remove('moving'), 220);
    }
    requestAnimationFrame(frame);
  }

  const yearNum = $('#yearNum'), era = $('#era');
  let shownYear = null, shownEra = -1;

  function apply() {
    const z = cam.z;
    world.style.transform = `translate(${(vw / 2 - cam.x * z).toFixed(2)}px, ${(vh / 2 - cam.y * z).toFixed(2)}px) scale(${z.toFixed(5)})`;
    const lvl = z < .24 ? 'far' : z < .62 ? 'mid' : 'near';
    if (lvl !== level) {
      if (level) field.classList.remove('field-' + level);
      field.classList.add('field-' + lvl);
      document.body.dataset.zoom = lvl;
      level = lvl;
    }
    layoutLabels(z);
    // 年份与年代的光
    const cy = Y0 + (cam.x - PAD) / K;
    const yr = cy > NOW + .3 ? '采集地' : String(Math.floor(clamp(cy, Y0, 2026)));
    if (yr !== shownYear) {
      shownYear = yr;
      yearNum.textContent = yr;
      yearNum.classList.toggle('word', yr === '采集地');
      if (!reduced) yearNum.animate([{ transform: 'translateY(.18em)', opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    const t = clamp((cy - 1980) / (2026 - 1980), 0, 1);
    const eo = Math.round((1 - t) * 100) / 100;
    if (eo !== shownEra) { shownEra = eo; era.style.opacity = (eo * .6).toFixed(2); }
    updateRuler();
  }

  // 标签排布：远景时像图例一样排在土壤下；中近景挂在花下，互相避让，聚焦的那株优先
  let measuredLevel = '';
  function layoutLabels(z) {
    if (measuredLevel !== level) {
      measuredLevel = level;
      flowers.forEach(f => { f.lw = f.label.offsetWidth; f.lh = f.label.offsetHeight; });
    }
    const groundY = (GROUND - cam.y) * z + vh / 2;
    const off = Math.max(16, 128 * z);
    const items = flowers.map(f => ({
      f,
      sx: ((level === 'far' ? f.x : f.top.x) - cam.x) * z + vw / 2,
      sy: level === 'far' ? groundY + 22 : (f.top.y - cam.y) * z + vh / 2 + off
    })).sort((a, b) => (b.f === focused) - (a.f === focused) || a.sx - b.sx);
    const placed = [];
    items.forEach(({ f, sx, sy }) => {
      const out = sx < -260 || sx > vw + 260 || sy < -160 || sy > vh + 60;
      if (out !== f.out) { f.out = out; f.label.style.visibility = out ? 'hidden' : 'visible'; }
      if (out) return;
      const w = f.lw || 120, h = f.lh || 40;
      let dy = 0, ok = false;
      const rows = f === focused ? 1 : level === 'far' ? 4 : 5;
      for (let k = 0; k < rows; k++) {
        const b = { x0: sx - w / 2 - 8, x1: sx + w / 2 + 8, y0: sy + dy, y1: sy + dy + h };
        if (!placed.some(p => p.x0 < b.x1 && b.x0 < p.x1 && p.y0 < b.y1 && b.y0 < p.y1)) { placed.push(b); ok = true; break; }
        dy += h + 4;
      }
      // 实在放不下就先藏起来，靠近了自然会出现
      f.label.style.opacity = ok || f === focused ? '' : '0';
      f.label.style.transform = `translate(${sx.toFixed(1)}px, ${(sy + dy).toFixed(1)}px) translate(-50%, 0)`;
    });
  }

  /* ---------------- 聚焦一株 ---------------- */

  function focusFlower(f, fly) {
    if (focused && focused !== f) unfocus(true);
    focused = f;
    f.g.classList.add('focus');
    f.label.classList.add('focus');
    field.classList.add('has-focus');
    measuredLevel = ''; lastKey = '';
    if (fly !== false) flyTo({ x: f.top.x + (vw > 760 ? 0 : 0), y: f.top.y + 150, z: Math.max(.95, Math.min(cam.z, 1.3)) });
  }
  function unfocus(silent) {
    if (!focused) return;
    focused.g.classList.remove('focus');
    focused.label.classList.remove('focus');
    focused = null;
    measuredLevel = ''; lastKey = '';
    if (!silent) field.classList.remove('has-focus');
  }
  function openFlower(f) {
    if (f.pressed) location.href = f.s.href;
    else window.open(f.s.repo, '_blank', 'noopener');
  }
  function tapFlower(f) {
    if (focused === f && level === 'near') openFlower(f);
    else focusFlower(f);
  }

  /* ---------------- 输入：拖、滚、捏、键 ---------------- */

  const pointers = new Map();
  let drag = null, pinch = null;

  function zoomAt(px, py, z, immediate) {
    z = clamp(z, zmin(), ZMAX);
    const base = immediate ? cam : tgt;
    const wx = base.x + (px - vw / 2) / base.z, wy = base.y + (py - vh / 2) / base.z;
    tgt.z = z;
    tgt.x = wx - (px - vw / 2) / z;
    tgt.y = wy - (py - vh / 2) / z;
    clampCam(tgt);
    if (immediate) Object.assign(cam, tgt);
  }

  field.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('.flabel a, .flabel button')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { field.setPointerCapture(e.pointerId); } catch (err) {}
    tween = null;
    dismissHint();
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), vx: 0, vy: 0, moved: false, target: e.target };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z };
      drag = null;
    }
  });

  field.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, true);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      drag.moved = true;
      field.classList.add('dragging');
    }
    if (drag.moved) {
      tgt.x -= dx / cam.z;
      tgt.y -= dy / cam.z;
      clampCam(tgt);
      cam.x = tgt.x; cam.y = tgt.y;
      const dt = Math.max(1, now - drag.t);
      drag.vx = lerp(drag.vx, dx / dt, .4);
      drag.vy = lerp(drag.vy, dy / dt, .4);
    }
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
  });

  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    if (!drag) return;
    field.classList.remove('dragging');
    if (!drag.moved && e.type === 'pointerup') {
      const t = drag.target;
      const fg = t.closest && t.closest('.flower[data-no]');
      if (fg) tapFlower(flowers.find(f => f.s.no === fg.dataset.no));
      else if (t.closest && t.closest('.seed-packet')) sow();
      else unfocus();
    } else if (performance.now() - drag.t < 80) {
      // 甩一下：惯性滑行
      tgt.x -= drag.vx * 260 / cam.z;
      tgt.y -= drag.vy * 260 / cam.z;
      clampCam(tgt);
    }
    drag = null;
  };
  field.addEventListener('pointerup', endPointer);
  field.addEventListener('pointercancel', endPointer);

  field.addEventListener('wheel', (e) => {
    e.preventDefault();
    tween = null;
    dismissHint();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? vh : 1;
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, tgt.z * Math.exp(-e.deltaY * unit * .0028));
    } else {
      // 滚轮不翻页：穿越年份
      tgt.x += (e.deltaY + e.deltaX) * unit * 1.1 / cam.z;
      clampCam(tgt);
    }
  }, { passive: false });

  field.addEventListener('dblclick', (e) => {
    if (e.target.closest('.flabel')) return;
    zoomAt(e.clientX, e.clientY, tgt.z * 1.9);
  });

  flowers.forEach(f => {
    f.g.addEventListener('focus', () => { if (!drag) focusFlower(f); });
    f.g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFlower(f); } });
    if (fine) {
      f.g.addEventListener('pointerenter', () => f.label.classList.add('hover'));
      f.g.addEventListener('pointerleave', () => f.label.classList.remove('hover'));
    }
  });
  packet.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sow(); } });

  function stepFlower(dir) {
    const cur = focused ? byYear.indexOf(focused) : -1;
    const next = byYear[(cur + dir + byYear.length) % byYear.length];
    focusFlower(next);
  }

  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (gateOpen) {
      if (['Enter', 'ArrowDown', 'PageDown', ' '].includes(e.key) && document.activeElement && !document.activeElement.closest('a, button')) { e.preventDefault(); enterField(); }
      return;
    }
    const step = 260 / cam.z;
    switch (e.key) {
      case 'ArrowLeft': tween = null; tgt.x -= step; clampCam(tgt); break;
      case 'ArrowRight': tween = null; tgt.x += step; clampCam(tgt); break;
      case 'ArrowUp': tween = null; tgt.y -= step * .6; clampCam(tgt); break;
      case 'ArrowDown': tween = null; tgt.y += step * .6; clampCam(tgt); break;
      case '+': case '=': zoomAt(vw / 2, vh / 2, tgt.z * 1.45); break;
      case '-': case '_': zoomAt(vw / 2, vh / 2, tgt.z / 1.45); break;
      case '0': case 'h': case 'H': unfocus(); flyTo(overviewTarget()); break;
      case ']': stepFlower(1); break;
      case '[': stepFlower(-1); break;
      case '/': e.preventDefault(); openPalette(); break;
      case 'n': case 'N': toggleNotebook(); break;
      case 'Escape':
        if (palette.classList.contains('open')) closePalette();
        else if (notebook.classList.contains('open')) toggleNotebook(false);
        else unfocus();
        break;
      default: return;
    }
    dismissHint();
  });

  addEventListener('resize', () => {
    vw = innerWidth; vh = innerHeight;
    clampCam(tgt); clampCam(cam);
    buildRuler();
    lastKey = '';
  });

  /* ---------------- 年代尺 ---------------- */

  const ruler = $('#ruler');
  let rulerW = 0, rWin = null;
  const RY0 = 1979, RY1 = 2037;
  const rx = (y) => (y - RY0) / (RY1 - RY0) * rulerW;
  const yearFromRuler = (px) => RY0 + clamp(px / rulerW, 0, 1) * (RY1 - RY0);

  function buildRuler() {
    rulerW = ruler.clientWidth;
    const rs = $('svg', ruler);
    rs.innerHTML = '';
    rs.setAttribute('viewBox', `0 0 ${rulerW} 54`);
    el('line', { x1: 0, y1: 30, x2: rulerW, y2: 30, class: 'r-base' }, rs);
    for (let y = RY0; y <= RY1; y++) {
      const major = y % 10 === 0;
      el('line', { x1: rx(y), y1: 30, x2: rx(y), y2: major ? 40 : 34, class: major ? 'r-tick major' : 'r-tick' }, rs);
      if (major) el('text', { x: rx(y), y: 52, class: 'r-label' }, rs).textContent = y;
    }
    el('rect', { x: rx(2027.4), y: 27, width: rx(2036.6) - rx(2027.4), height: 6, class: 'r-plot' }, rs);
    el('line', { x1: rx(NOW), y1: 18, x2: rx(NOW), y2: 40, class: 'r-now' }, rs);
    flowers.forEach(f => {
      el('circle', { cx: rx(f.year + (f.x - X(f.year)) / K), cy: 30, r: f.pressed ? 4.5 : 3.5, class: f.pressed ? 'r-mark pressed' : 'r-mark', style: `fill:${f.sp.rings[0].color}` }, rs);
    });
    rWin = el('rect', { x: 0, y: 14, width: 10, height: 30, rx: 3, class: 'r-win' }, rs);
    updateRuler();
  }

  function updateRuler() {
    if (!rWin || !rulerW) return;
    const y0 = Y0 + (cam.x - vw / 2 / cam.z - PAD) / K, y1 = Y0 + (cam.x + vw / 2 / cam.z - PAD) / K;
    const a = clamp(rx(y0), 0, rulerW), b = clamp(rx(y1), 0, rulerW);
    rWin.setAttribute('x', a.toFixed(1));
    rWin.setAttribute('width', Math.max(6, b - a).toFixed(1));
  }

  let rDrag = false;
  const rulerSeek = (e, smooth) => {
    const r = ruler.getBoundingClientRect();
    const y = yearFromRuler(e.clientX - r.left);
    if (smooth) flyTo({ x: X(y), y: cam.y, z: cam.z }, 700);
    else { tween = null; tgt.x = X(y); clampCam(tgt); }
  };
  ruler.addEventListener('pointerdown', (e) => {
    rDrag = true;
    try { ruler.setPointerCapture(e.pointerId); } catch (err) {}
    rulerSeek(e, true);
    dismissHint();
  });
  ruler.addEventListener('pointermove', (e) => { if (rDrag) rulerSeek(e, false); });
  ruler.addEventListener('pointerup', () => { rDrag = false; });
  ruler.addEventListener('pointercancel', () => { rDrag = false; });

  /* ---------------- 控件 ---------------- */

  $('#zIn').addEventListener('click', () => zoomAt(vw / 2, vh / 2, tgt.z * 1.5));
  $('#zOut').addEventListener('click', () => zoomAt(vw / 2, vh / 2, tgt.z / 1.5));
  $('#zHome').addEventListener('click', () => { unfocus(); flyTo(overviewTarget()); });

  /* ---------------- 札记 ---------------- */

  const notebook = $('#notebook'), scrim = $('#scrim');
  function toggleNotebook(force, tab) {
    const open = typeof force === 'boolean' ? force : !notebook.classList.contains('open');
    notebook.classList.toggle('open', open);
    scrim.classList.toggle('show', open || palette.classList.contains('open'));
    notebook.setAttribute('aria-hidden', String(!open));
    if (tab) showTab(tab);
    if (open) setTimeout(() => $('.nb-tabs button.on', notebook).focus({ preventScroll: true }), 50);
  }
  function showTab(name) {
    $$('.nb-tabs button', notebook).forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    $$('.nb-page', notebook).forEach(p => p.classList.toggle('on', p.dataset.page === name));
    $('.nb-body', notebook).scrollTop = 0;
  }
  $$('.nb-tabs button', notebook).forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $('#btnNotebook').addEventListener('click', () => toggleNotebook());
  $('#nbClose').addEventListener('click', () => toggleNotebook(false));
  scrim.addEventListener('click', () => { toggleNotebook(false); closePalette(); });

  /* ---------------- 寻花 ---------------- */

  const palette = $('#palette'), palInput = $('#palInput'), palList = $('#palList');
  const ACTIONS = [
    ...flowers.map(f => ({
      label: f.s.name, sub: `${f.sp.zh} · ${f.s.orig} · ${f.year}${f.pressed ? ' · 已压制' : ' · 花苞'}`,
      hay: [f.s.name, f.s.orig, f.sp.zh, f.sp.latin, f.year, f.s.use].join(' ').toLowerCase(),
      run: () => focusFlower(f), dot: f.sp.rings[0].color
    })),
    { label: '采集地', sub: '种一株世上还没有的花', hay: '采集地 种子 garden seed 花园', run: () => flyTo({ x: PLOT0 + 600, y: GROUND - 520, z: .45 }) },
    { label: '札记 · 序', sub: '永生花是什么', hay: '札记 序 preface 关于 about', run: () => toggleNotebook(true, 'preface') },
    { label: '札记 · 怎么读这片花田', sub: '横轴、花苞与采集地', hay: '札记 怎么读 how 帮助 help 操作', run: () => toggleNotebook(true, 'read') },
    { label: '札记 · 两种墨水', sub: '铅笔与墨水、四枚印章', hay: '札记 方法 method 墨水 ink 印章 状态', run: () => toggleNotebook(true, 'method') },
    { label: '全景', sub: '1980 — 2030', hay: '全景 overview home 总览', run: () => { unfocus(); flyTo(overviewTarget()); } },
    { label: '回到入口', sub: '那扇正在融化的窗口', hay: '入口 gate home 首页 开场', run: () => backToGate() },
    { label: '图录', sub: '一页读完的线性版本', hay: '图录 read 线性 列表 list', run: () => { location.href = 'read.html'; } }
  ];
  let palItems = [], palSel = 0;

  function renderPalette() {
    const q = palInput.value.trim().toLowerCase();
    palItems = ACTIONS.filter(a => !q || a.hay.includes(q) || a.label.toLowerCase().includes(q));
    palSel = clamp(palSel, 0, Math.max(0, palItems.length - 1));
    palList.innerHTML = palItems.map((a, i) => `
      <li role="option" aria-selected="${i === palSel}" class="${i === palSel ? 'sel' : ''}" data-i="${i}">
        <span class="pdot" style="${a.dot ? 'background:' + a.dot : ''}"></span>
        <span class="pl">${a.label}</span><span class="ps">${a.sub}</span>
      </li>`).join('') || '<li class="empty">没有找到。世界上有这么多花，这一株还没被采到。</li>';
  }
  function openPalette() {
    if (gateOpen) enterField();
    palette.classList.add('open');
    scrim.classList.add('show');
    palInput.value = '';
    palSel = 0;
    renderPalette();
    setTimeout(() => palInput.focus(), 30);
  }
  function closePalette() {
    palette.classList.remove('open');
    if (!notebook.classList.contains('open')) scrim.classList.remove('show');
  }
  function runPalette(i) {
    const a = palItems[i];
    if (!a) return;
    closePalette();
    a.run();
  }
  palInput.addEventListener('input', () => { palSel = 0; renderPalette(); });
  palInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); renderPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(palSel - 1, 0); renderPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPalette(palSel); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });
  palList.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) runPalette(+li.dataset.i); });
  palette.addEventListener('click', (e) => { if (e.target === palette) closePalette(); });
  $('#btnSearch').addEventListener('click', openPalette);

  /* ---------------- 提示 ---------------- */

  const hint = $('#hint');
  let hintTimer;
  function showHint() {
    hint.textContent = fine
      ? '拖动漫游 · 滚轮穿越年份 · Ctrl+滚轮缩放 · 点花看看 · 按 / 寻花'
      : '拖动漫游 · 双指缩放 · 点花看看';
    hint.classList.add('show');
    hintTimer = setTimeout(dismissHint, 8000);
  }
  function dismissHint() { clearTimeout(hintTimer); hint.classList.remove('show'); }

  const toastEl = $('#toast');
  let toastTimer;
  function toast(html) {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  /* ---------------- 飘落的花瓣 ---------------- */

  if (!reduced) {
    const drifts = $('#drifts');
    const cols = ['#C8553D', '#E4A9B4', '#D9A23A', '#8FA6CF', '#E3B7B2', '#8C7BB8'];
    for (let i = 0; i < 7; i++) {
      const d = document.createElement('span');
      d.className = 'drift';
      d.style.left = (10 + Math.random() * 95) + 'vw';
      d.style.background = cols[i % cols.length];
      d.style.animationDuration = (16 + Math.random() * 12).toFixed(1) + 's';
      d.style.animationDelay = (-Math.random() * 25).toFixed(1) + 's';
      d.style.setProperty('--sway', (Math.random() * 30 + 20).toFixed(0) + 'vw');
      drifts.appendChild(d);
    }
  }

  /* ---------------- 入口：穿过窗口，走进花田 ---------------- */

  const gate = $('#gate');
  let gateOpen = !!gate && !gate.classList.contains('gone');

  function enterField(target) {
    if (!gateOpen) return;
    gateOpen = false;
    document.body.classList.add('in-field');
    try { sessionStorage.setItem('everbloom-entered', '1'); } catch (e) {}
    const pc = flowers[0];
    // 镜头先贴在虞美人的花心上，再拉远
    Object.assign(cam, clampCam({ x: pc.top.x, y: pc.top.y, z: 1.9 }));
    Object.assign(tgt, cam);
    lastKey = '';
    apply();
    if (reduced) {
      gate.classList.add('gone');
      E.heroPaused = true;
      Object.assign(cam, target || overviewTarget()); Object.assign(tgt, cam);
    } else {
      gate.animate([
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
        { opacity: 0, transform: 'scale(1.35)', filter: 'blur(8px)' }
      ], { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }).finished.then(() => {
        gate.classList.add('gone');
        E.heroPaused = true;
      });
      setTimeout(() => flyTo(target || overviewTarget(), 2300), 250);
    }
    history.replaceState(null, '', '#field');
    setTimeout(showHint, reduced ? 0 : 2300);
    setTimeout(() => field.focus({ preventScroll: true }), 50);
  }

  function backToGate() {
    if (gateOpen || !gate) return;
    gateOpen = true;
    unfocus();
    document.body.classList.remove('in-field');
    E.heroPaused = false;
    gate.classList.remove('gone');
    gate.getAnimations().forEach(a => a.cancel());
    if (!reduced) {
      gate.animate([
        { opacity: 0, transform: 'scale(1.35)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }
      ], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    history.replaceState(null, '', location.pathname);
  }

  if (gate) {
    $('#enter').addEventListener('click', () => enterField());
    let acc = 0, accT = 0;
    gate.addEventListener('wheel', (e) => {
      if (!$('#heroArt').classList.contains('alive')) return;
      const now = performance.now();
      if (now - accT > 400) acc = 0;
      accT = now;
      acc += e.deltaY;
      if (acc > 80) enterField();
    }, { passive: true });
    let ty = null;
    gate.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
    gate.addEventListener('touchend', (e) => {
      if (ty !== null && ty - e.changedTouches[0].clientY > 70 && gate.scrollTop + gate.clientHeight >= gate.scrollHeight - 4) enterField();
      ty = null;
    }, { passive: true });
  }
  $('.brand').addEventListener('click', (e) => {
    if (!gate) return;
    e.preventDefault();
    if (gateOpen) enterField(); else backToGate();
  });

  // 深链接：#photocraft 直接落在那株花前；#field / #garden 跳过入口
  const hash = decodeURIComponent(location.hash.slice(1)).toLowerCase();
  const start = flowers.find(f => f.s.name.toLowerCase() === hash);
  let entered = false;
  try { entered = sessionStorage.getItem('everbloom-entered') === '1'; } catch (e) {}
  if (gate && (start || hash === 'field' || hash === 'garden')) {
    gate.classList.add('gone');
    gateOpen = false;
    E.heroPaused = true;
    document.body.classList.add('in-field');
    if (start) {
      Object.assign(cam, clampCam({ x: start.top.x, y: start.top.y + 150, z: 1 }));
      Object.assign(tgt, cam);
      focusFlower(start, false);
    } else if (hash === 'garden') {
      Object.assign(cam, clampCam({ x: PLOT0 + 600, y: GROUND - 520, z: .45 }));
      Object.assign(tgt, cam);
    } else {
      Object.assign(cam, overviewTarget()); Object.assign(tgt, cam);
    }
    setTimeout(showHint, 600);
  }
  void entered;

  buildRuler();
  apply();
  requestAnimationFrame(frame);

  window.EverbloomField = { flyTo, focusFlower, enterField, backToGate, cam, flowers, sow };
})();
