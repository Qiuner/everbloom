/* 永生花 · Everbloom — 花种、压花渲染、毛边台纸、主题切换 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function hash(s) {
    let h = 2166136261;
    for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // amt > 0 变亮，< 0 变暗
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((f - r) * p + r);
    g = Math.round((f - g) * p + g);
    b = Math.round((f - b) * p + b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // 花瓣朝上（-y），基部在原点
  function petalPath(shape, L, W) {
    switch (shape) {
      case 'round':
        return `M0 0 C${W * 1.1} ${-L * .25} ${W * .95} ${-L} 0 ${-L} C${-W * .95} ${-L} ${-W * 1.1} ${-L * .25} 0 0Z`;
      case 'pointed':
        return `M0 0 C${W} ${-L * .3} ${W * .5} ${-L * .8} 0 ${-L} C${-W * .5} ${-L * .8} ${-W} ${-L * .3} 0 0Z`;
      case 'slender':
        return `M0 0 C${W * .7} ${-L * .2} ${W * .6} ${-L * .85} 0 ${-L} C${-W * .6} ${-L * .85} ${-W * .7} ${-L * .2} 0 0Z`;
      case 'notched':
        return `M0 0 C${W} ${-L * .3} ${W * .95} ${-L * .88} ${W * .55} ${-L * .98} L${W * .25} ${-L * .9} L0 ${-L} L${-W * .25} ${-L * .9} L${-W * .55} ${-L * .98} C${-W * .95} ${-L * .88} ${-W} ${-L * .3} 0 0Z`;
      default:
        return petalPath('round', L, W);
    }
  }

  // 世界上有这么多花：每个项目一个花种
  const SPECIES = {
    poppy: {
      zh: '虞美人', latin: 'Papaver rhoeas',
      rings: [
        { n: 4, L: 46, W: 40, shape: 'round', color: '#C8553D', rot: 45 },
        { n: 4, L: 38, W: 33, shape: 'round', color: '#B5412D', rot: 0 }
      ],
      center: { type: 'poppy', r: 8, color: '#2B2A28' },
      leaves: 2, leaf: 'lobed', stemCurve: 18
    },
    sunflower: {
      zh: '向日葵', latin: 'Helianthus annuus',
      rings: [
        { n: 21, L: 44, W: 7, shape: 'slender', color: '#D9A23A', rot: 0 },
        { n: 21, L: 37, W: 7, shape: 'slender', color: '#C68B27', rot: 8.6 }
      ],
      center: { type: 'disk', r: 19, color: '#5A3B22' },
      leaves: 3, leaf: 'lance', stemCurve: 10
    },
    iris: {
      zh: '鸢尾', latin: 'Iris sanguinea',
      rings: [
        { n: 3, L: 52, W: 20, shape: 'round', color: '#5B5FA0', rot: 60 },
        { n: 3, L: 46, W: 11, shape: 'pointed', color: '#7A7FBD', rot: 0 }
      ],
      center: { type: 'beard', r: 4, color: '#E0B84C' },
      leaves: 3, leaf: 'blade', stemCurve: 8
    },
    epiphyllum: {
      zh: '昙花', latin: 'Epiphyllum oxypetalum',
      rings: [
        { n: 13, L: 54, W: 8, shape: 'pointed', color: '#D9CBA8', rot: 0 },
        { n: 11, L: 42, W: 10, shape: 'slender', color: '#F1EBDA', rot: 12 }
      ],
      center: { type: 'stamens', r: 15, color: '#C9A94A' },
      leaves: 2, leaf: 'lance', stemCurve: 26
    },
    camellia: {
      zh: '山茶', latin: 'Camellia japonica',
      rings: [
        { n: 6, L: 42, W: 29, shape: 'round', color: '#E3B7B2', rot: 0 },
        { n: 6, L: 31, W: 22, shape: 'round', color: '#D79896', rot: 30 },
        { n: 5, L: 18, W: 13, shape: 'round', color: '#C97B7D', rot: 10 }
      ],
      center: { type: 'stamens', r: 7, color: '#D9B54A' },
      leaves: 3, leaf: 'oval', stemCurve: 14
    },
    forgetmenot: {
      zh: '勿忘我', latin: 'Myosotis scorpioides',
      rings: [{ n: 5, L: 22, W: 18, shape: 'round', color: '#7FA3C9', rot: 0 }],
      center: { type: 'dot', r: 4.5, color: '#F2D36B' },
      cluster: { count: 7, spread: 34, scale: .5 },
      leaves: 2, leaf: 'oval', stemCurve: 20
    },
    bellflower: {
      zh: '风铃草', latin: 'Campanula medium',
      rings: [{ n: 5, L: 26, W: 13, shape: 'pointed', color: '#8C7BB8', rot: 0 }],
      center: { type: 'dot', r: 4, color: '#EDE7F5' },
      cluster: { count: 4, spread: 40, scale: .62 },
      leaves: 2, leaf: 'lance', stemCurve: 30
    },
    lotus: {
      zh: '莲', latin: 'Nelumbo nucifera',
      rings: [
        { n: 8, L: 50, W: 22, shape: 'pointed', color: '#E4A9B4', rot: 0 },
        { n: 6, L: 38, W: 18, shape: 'pointed', color: '#D88A9A', rot: 22 },
        { n: 4, L: 24, W: 12, shape: 'pointed', color: '#C9707F', rot: 45 }
      ],
      center: { type: 'pod', r: 9, color: '#C6B460' },
      leaves: 1, leaf: 'pad', stemCurve: 6
    },
    cosmos: {
      zh: '波斯菊', latin: 'Cosmos bipinnatus',
      rings: [{ n: 8, L: 46, W: 20, shape: 'notched', color: '#C9578A', rot: 0 }],
      center: { type: 'disk', r: 7, color: '#D9A23A' },
      leaves: 3, leaf: 'thread', stemCurve: 22
    },
    hydrangea: {
      zh: '绣球', latin: 'Hydrangea macrophylla',
      rings: [{ n: 4, L: 22, W: 21, shape: 'round', color: '#8FA6CF', rot: 45 }],
      center: { type: 'dot', r: 2, color: '#5E6E9C' },
      cluster: { count: 17, spread: 40, scale: .5 },
      leaves: 2, leaf: 'oval', stemCurve: 12
    }
  };

  function pressFilter(svg, seed) {
    const id = 'press-' + (++uid);
    let defs = svg.querySelector('defs') || el('defs', {}, svg);
    const f = el('filter', { id, x: '-15%', y: '-15%', width: '130%', height: '130%' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '.06', numOctaves: '2', seed: String(seed % 97), result: 't' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 't', scale: '2.2', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }, f);
    el('feDropShadow', { in: 'd', dx: '.6', dy: '.9', stdDeviation: '.7', 'flood-color': '#3a2f22', 'flood-opacity': '.25' }, f);
    return id;
  }

  function outline(node) {
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', '.7');
    node.setAttribute('stroke-dasharray', '2 2');
    node.setAttribute('vector-effect', 'non-scaling-stroke');
    node.classList.add('line-out');
  }

  function drawBloom(g, sp, r, pressed) {
    for (const ring of sp.rings) {
      for (let i = 0; i < ring.n; i++) {
        const a = (ring.rot || 0) + i * 360 / ring.n + (r() - .5) * (pressed ? 9 : 2);
        const L = ring.L * (1 + (r() - .5) * .12);
        const sj = r();
        const og = el('g', { transform: `rotate(${a.toFixed(2)})` }, g);
        const pg = el('g', { class: 'petal' }, og);
        const p = el('path', { d: petalPath(ring.shape, L, ring.W) }, pg);
        if (pressed) {
          p.setAttribute('fill', shade(ring.color, (sj - .5) * .18));
          p.setAttribute('fill-opacity', '.9');
          p.setAttribute('stroke', shade(ring.color, -.35));
          p.setAttribute('stroke-width', '.5');
          el('path', {
            d: `M0 -2 Q${(ring.W * .12).toFixed(1)} ${-L * .5} 0 ${-L * .86}`,
            fill: 'none', stroke: shade(ring.color, -.3), 'stroke-width': '.4', opacity: '.5'
          }, pg);
        } else {
          outline(p);
        }
      }
    }
    const c = sp.center;
    g = el('g', { class: 'core' }, g);
    if (!pressed) {
      outline(el('circle', { r: c.r }, g));
      // 与压制版消耗同样多的随机数，保证两种画法的几何一致
      if (c.type === 'stamens') for (let i = 0; i < 36; i++) r();
      return;
    }
    if (c.type === 'poppy') {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, x = Math.cos(a) * (c.r + 5), y = Math.sin(a) * (c.r + 5);
        el('line', { x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1), stroke: '#2B2A28', 'stroke-width': '.5' }, g);
        el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: '1', fill: '#2B2A28' }, g);
      }
      el('circle', { r: c.r, fill: '#5E6B3C' }, g);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        el('line', { x1: 0, y1: 0, x2: (Math.cos(a) * c.r * .9).toFixed(1), y2: (Math.sin(a) * c.r * .9).toFixed(1), stroke: '#2B2A28', 'stroke-width': '.6' }, g);
      }
    } else if (c.type === 'disk') {
      el('circle', { r: c.r, fill: c.color }, g);
      const n = Math.round(c.r * c.r * .55);
      for (let i = 0; i < n; i++) {
        const rr = Math.sqrt(i / n) * c.r * .92, a = i * 2.39996;
        el('circle', { cx: (Math.cos(a) * rr).toFixed(2), cy: (Math.sin(a) * rr).toFixed(2), r: '.55', fill: shade(c.color, .35) }, g);
      }
    } else if (c.type === 'beard') {
      for (const a of [60, 180, 300]) {
        el('ellipse', { cx: 0, cy: -16, rx: c.r * .7, ry: 10, fill: c.color, transform: `rotate(${a})` }, g);
      }
      el('circle', { r: 3, fill: '#4A4C80' }, g);
    } else if (c.type === 'stamens') {
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2 + r() * .2, len = c.r * (.6 + r() * .4);
        const x = Math.cos(a) * len, y = Math.sin(a) * len;
        el('line', { x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1), stroke: shade(c.color, -.2), 'stroke-width': '.45' }, g);
        el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: '1.1', fill: c.color }, g);
      }
    } else if (c.type === 'pod') {
      el('circle', { r: c.r, fill: c.color }, g);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        el('circle', { cx: (Math.cos(a) * c.r * .55).toFixed(1), cy: (Math.sin(a) * c.r * .55).toFixed(1), r: '1.3', fill: shade(c.color, -.4) }, g);
      }
      el('circle', { r: 1.3, fill: shade(c.color, -.4) }, g);
    } else {
      el('circle', { r: c.r, fill: c.color }, g);
    }
  }

  function drawLeaf(g, x, y, angle, len, type, color, pressed, r) {
    const lg = el('g', { class: 'leaf-in' }, el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})` }, g));
    const lj = r();
    let d;
    if (type === 'lobed') {
      // 羽状浅裂：每侧几片圆润的小裂片，越往叶尖越小
      const lobes = 4, side = (s) => {
        let p = '';
        for (let i = 0; i < lobes; i++) {
          const t0 = i / lobes, t1 = (i + 1) / lobes;
          const w = len * .17 * Math.sin((t0 + .5 / lobes) * Math.PI * .9 + .25);
          p += ` Q${(len * (t0 + .2 / lobes)).toFixed(1)} ${(s * w * 1.5).toFixed(1)} ${(len * (t0 + .75 / lobes)).toFixed(1)} ${(s * w).toFixed(1)}`;
          p += ` Q${(len * (t1 - .1 / lobes)).toFixed(1)} ${(s * w * .5).toFixed(1)} ${(len * t1).toFixed(1)} ${(s * w * .35 * (i < lobes - 1 ? 1 : 0)).toFixed(1)}`;
        }
        return p;
      };
      const back = side(1).trim().split(' Q').filter(Boolean);
      // 下侧沿相反方向走回基部
      let lower = '';
      const pts = [[0, 0]];
      back.forEach(seg => { const n = seg.replace('Q', '').trim().split(/\s+/).map(Number); pts.push([n[0], n[1]], [n[2], n[3]]); });
      for (let i = pts.length - 1; i >= 2; i -= 2) lower += ` Q${pts[i - 1][0]} ${pts[i - 1][1]} ${pts[i - 2][0]} ${pts[i - 2][1]}`;
      d = `M0 0${side(-1)}${lower}Z`;
    } else if (type === 'blade') {
      d = `M0 0 C${len * .3} ${-len * .07} ${len * .8} ${-len * .05} ${len} 0 C${len * .8} ${len * .04} ${len * .3} ${len * .06} 0 0Z`;
    } else if (type === 'oval') {
      d = `M0 0 C${len * .2} ${-len * .32} ${len * .8} ${-len * .3} ${len} 0 C${len * .8} ${len * .3} ${len * .2} ${len * .32} 0 0Z`;
    } else if (type === 'pad') {
      d = `M0 0 m${len * .5} 0 a${len * .5} ${len * .16} 0 1 0 .1 0Z`;
    } else if (type === 'thread') {
      const tg = el('g', {}, lg);
      for (let i = 0; i < 5; i++) {
        const t = (i + 1) / 6 * len, s = i % 2 ? 1 : -1;
        const ln = el('path', { d: `M${t * .6} 0 Q${t * .8} ${s * 6} ${t} ${s * 12}`, fill: 'none', stroke: color, 'stroke-width': '.7' }, tg);
        if (!pressed) outline(ln);
      }
      const mid = el('path', { d: `M0 0 L${len} 0`, fill: 'none', stroke: color, 'stroke-width': '.8' }, tg);
      if (!pressed) outline(mid);
      return;
    } else {
      d = `M0 0 C${len * .3} ${-len * .18} ${len * .7} ${-len * .16} ${len} 0 C${len * .7} ${len * .16} ${len * .3} ${len * .18} 0 0Z`;
    }
    const leaf = el('path', { d }, lg);
    if (pressed) {
      leaf.setAttribute('fill', shade(color, (lj - .5) * .15));
      leaf.setAttribute('fill-opacity', '.88');
      leaf.setAttribute('stroke', shade(color, -.3));
      leaf.setAttribute('stroke-width', '.5');
      el('path', { d: `M1 0 L${len * .92} 0`, stroke: shade(color, -.35), 'stroke-width': '.5', opacity: '.6' }, lg);
    } else {
      outline(leaf);
    }
  }

  // 在 viewBox 0 0 200 260 中画整株
  function drawPlant(svg, key, opts) {
    opts = opts || {};
    const sp = typeof key === 'string' ? SPECIES[key] : key;
    const seed = hash(opts.seed || (typeof key === 'string' ? key : 'flora'));
    const r = rng(seed);
    const pressed = opts.pressed !== false;
    const W = 200, H = 260, cx = 100, by = opts.bloomY || 92;
    const leafColor = '#6E7F45';
    const root = el('g', { class: pressed ? 'plant pressed' : 'plant sketch' }, svg);
    if (pressed) root.setAttribute('filter', `url(#${pressFilter(svg, seed)})`);

    const x0 = cx + (r() - .5) * 24, y0 = H - 12;
    const ctrlX = cx + (r() > .5 ? 1 : -1) * sp.stemCurve, ctrlY = (by + y0) / 2;
    const stemTop = sp.cluster ? by + sp.cluster.spread * .8 : by;
    const stem = el('path', { d: `M${x0.toFixed(1)} ${y0} Q${ctrlX.toFixed(1)} ${ctrlY} ${cx} ${stemTop}`, fill: 'none', class: 'stem' }, root);
    if (pressed) { stem.setAttribute('stroke', leafColor); stem.setAttribute('stroke-width', '1.8'); stem.setAttribute('stroke-linecap', 'round'); }
    else outline(stem);

    const q = (t) => ({
      x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ctrlX + t * t * cx,
      y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ctrlY + t * t * stemTop
    });
    const leafLen = sp.leaf === 'pad' ? 70 : sp.leaf === 'blade' ? 78 : 44;
    for (let i = 0; i < sp.leaves; i++) {
      const t = sp.leaf === 'blade' ? .05 + i * .06 : .28 + i * .2;
      const p = q(t);
      const left = i % 2 === 0;
      const ang = sp.leaf === 'blade' ? (left ? -100 + i * 8 : -80 - i * 8) - i * 4
        : sp.leaf === 'pad' ? (left ? -10 : 190)
        : left ? -150 - r() * 15 : -30 + r() * 15;
      drawLeaf(root, p.x, p.y, ang, leafLen * (.85 + r() * .3), sp.leaf, leafColor, pressed, r);
    }

    const rad = opts.radius || 58;
    const maxL = Math.max(...sp.rings.map(x => x.L));
    if (sp.cluster) {
      const k = sp.cluster, spread = k.spread * rad / 58;
      for (let i = 0; i < k.count; i++) {
        const rr = Math.sqrt((i + .5) / k.count) * spread, a = i * 2.39996;
        const fx = cx + Math.cos(a) * rr, fy = by + Math.sin(a) * rr * .8;
        const br = el('path', { d: `M${cx} ${stemTop} Q${((cx + fx) / 2).toFixed(1)} ${(stemTop - 4).toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}`, fill: 'none', class: 'stem branch' }, root);
        if (pressed) { br.setAttribute('stroke', leafColor); br.setAttribute('stroke-width', '.8'); } else outline(br);
      }
      for (let i = 0; i < k.count; i++) {
        const rr = Math.sqrt((i + .5) / k.count) * spread, a = i * 2.39996;
        const fx = cx + Math.cos(a) * rr, fy = by + Math.sin(a) * rr * .8;
        const s = k.scale * rad / 58 * (.85 + r() * .3);
        const g = el('g', { transform: `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${s.toFixed(3)}) rotate(${(r() * 360).toFixed(0)})` }, root);
        drawBloom(g, sp, r, pressed);
      }
    } else {
      const s = rad / maxL;
      const g = el('g', { transform: `translate(${cx} ${by}) scale(${s.toFixed(3)}) rotate(${((r() - .5) * 20).toFixed(1)})` }, root);
      drawBloom(g, sp, r, pressed);
    }

    if (opts.tapes) {
      const p1 = q(.2), p2 = q(.5);
      for (const [p, rot] of [[p1, -8], [p2, 6]]) {
        el('rect', {
          x: (p.x - 15).toFixed(1), y: (p.y - 4.5).toFixed(1), width: 30, height: 9,
          fill: 'var(--tape)', class: 'tape-rect', transform: `rotate(${rot} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`
        }, svg);
      }
    }
    return root;
  }

  // 成熟度之花：自评表一项一瓣，设置项一粒种子
  function drawScorecard(svg, d) {
    const cx = 200, cy = 200, total = d.done + d.partial + d.missing;
    const g = el('g', { transform: `translate(${cx} ${cy})` }, svg);
    const names = { done: '完成', partial: '部分完成', missing: '缺失' };
    for (let i = 0; i < total; i++) {
      const kind = i < d.done ? 'done' : i < d.done + d.partial ? 'partial' : 'missing';
      const L = i % 2 ? 112 : 124;
      const og = el('g', { transform: `rotate(${i * 360 / total})` }, g);
      const p = el('path', { d: petalPath('slender', L, 12), class: `sc-${kind} sc-petal`, 'data-kind': kind }, og);
      el('title', {}, p).textContent = `工具项 · ${names[kind]}`;
    }
    for (let i = 0; i < d.settings; i++) {
      const a = i / d.settings * Math.PI * 2 - Math.PI / 2;
      const dead = i >= d.settings - d.dead;
      el('circle', {
        cx: (Math.cos(a) * 166).toFixed(2), cy: (Math.sin(a) * 166).toFixed(2), r: 2.6,
        class: (dead ? 'sc-seed-dead' : 'sc-seed') + ' sc-dot', 'data-kind': dead ? 'dead' : 'alive'
      }, g);
    }
    const core = el('g', { class: 'sc-core-g' }, g);
    el('circle', { r: 26, class: 'sc-core' }, core);
    const t = el('text', { y: 4, class: 'sc-core-text', id: 'scCoreText' }, core);
    t.textContent = `${d.done}/${total}`;
  }

  // 毛边台纸
  function deckle(node, amp, step) {
    amp = amp || 2.4; step = step || 7;
    const r = rng(hash(node.dataset.seed || 'sheet'));
    const jit = Array.from({ length: 4000 }, () => r() * amp);
    function build() {
      const w = node.offsetWidth, h = node.offsetHeight;
      if (!w || !h) return;
      const pts = []; let k = 0;
      const j = () => jit[(k++) % jit.length].toFixed(1);
      for (let x = 0; x <= w; x += step) pts.push(`${x}px ${j()}px`);
      for (let y = 0; y <= h; y += step) pts.push(`${(w - j()).toFixed(1)}px ${y}px`);
      for (let x = w; x >= 0; x -= step) pts.push(`${x}px ${(h - j()).toFixed(1)}px`);
      for (let y = h; y >= 0; y -= step) pts.push(`${j()}px ${y}px`);
      node.style.clipPath = `polygon(${pts.join(',')})`;
    }
    build();
    if (window.ResizeObserver) new ResizeObserver(build).observe(node);
  }

  // 主题：auto → light → dark
  function initTheme() {
    const btn = document.querySelector('.theme-toggle');
    let mode = 'auto';
    try { mode = localStorage.getItem('everbloom-theme') || 'auto'; } catch (e) {}
    const labels = { auto: '跟随系统', light: '日间', dark: '夜间' };
    function apply() {
      if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', mode);
      if (btn) btn.textContent = labels[mode];
    }
    apply();
    if (btn) btn.addEventListener('click', () => {
      const go = () => {
        mode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto';
        try { localStorage.setItem('everbloom-theme', mode); } catch (e) {}
        apply();
      };
      // 夜幕从按钮处圆形展开
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduced) return go();
      const b = btn.getBoundingClientRect(), root = document.documentElement;
      root.style.setProperty('--vx', (b.left + b.width / 2) + 'px');
      root.style.setProperty('--vy', (b.top + b.height / 2) + 'px');
      root.classList.add('theme-vt');
      document.startViewTransition(go).finished.finally(() => root.classList.remove('theme-vt'));
    });
  }

  // 收录数据（来自 README 与 LEADS）
  const SPECIMENS = [
    { no: '001', name: 'PhotoCraft', orig: 'Photoshop', use: '图像', species: 'poppy', why: '层叠如图层', status: 'partial', href: 'specimen.html', repo: 'https://github.com/storytold/photocraft' },
    { no: '002', name: 'FilmCraft', orig: 'Premiere Pro', use: '视频', species: 'sunflower', why: '逐帧追光', repo: 'https://github.com/storytold/filmcraft' },
    { no: '003', name: 'VectorCraft', orig: 'Illustrator', use: '矢量设计', species: 'iris', why: '线条锋利', repo: 'https://github.com/storytold/vectorcraft' },
    { no: '004', name: 'LightCraft', orig: 'Lightroom', use: '摄影', species: 'epiphyllum', why: '为光而开', repo: 'https://github.com/storytold/lightcraft' },
    { no: '005', name: 'PDFCraft', orig: 'Acrobat', use: 'PDF', species: 'camellia', why: '层层叠页', repo: 'https://github.com/storytold/pdfcraft' },
    { no: '006', name: 'WordCraft', orig: 'Word', use: '办公', species: 'forgetmenot', why: '字句可记', repo: 'https://github.com/storytold/wordcraft' },
    { no: '007', name: 'SoundCraft', orig: 'Pro Tools', use: '音频', species: 'bellflower', why: '随风有声', repo: 'https://github.com/storytold/soundcraft' },
    { no: '008', name: 'CADCraft', orig: 'AutoCAD 风格工作流', use: '工程设计', species: 'lotus', why: '对称而精确', repo: 'https://github.com/storytold/cadcraft' },
    { no: '009', name: 'DeckCraft', orig: 'PowerPoint', use: '演示', species: 'cosmos', why: '一页一瓣', repo: 'https://github.com/storytold/deckcraft' },
    { no: '010', name: 'GridCraft', orig: 'Excel 风格工作流', use: '表格', species: 'hydrangea', why: '千格成团', repo: 'https://github.com/storytold/gridcraft' }
  ];

  window.Everbloom = { el, hash, rng, shade, petalPath, SPECIES, SPECIMENS, drawPlant, drawBloom, drawLeaf, drawScorecard, pressFilter, deckle };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTheme);
  else initTheme();
})();
