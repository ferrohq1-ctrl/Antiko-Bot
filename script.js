/**
 * Low-Poly Red Cluster (Right Side, closer to center) + THICKER wire + clearer motion
 * - Pure Canvas (no images)
 * - Delaunay triangulation (Bowyer–Watson)
 */

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

let W=0, H=0, DPR=1;

function resize(){
  DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  W = innerWidth; H = innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W+"px";
  canvas.style.height = H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
  buildScene();
}
addEventListener("resize", resize);

const rand = (a,b)=> a + Math.random()*(b-a);
const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));

/* ---------- Geometry helpers ---------- */
function circumcircle(tri, pts){
  const ax = pts[tri.a].x, ay = pts[tri.a].y;
  const bx = pts[tri.b].x, by = pts[tri.b].y;
  const cx = pts[tri.c].x, cy = pts[tri.c].y;

  const d = 2*(ax*(by-cy) + bx*(cy-ay) + cx*(ay-by));
  if (Math.abs(d) < 1e-9) return {x:0,y:0,r2:Infinity};

  const ax2ay2 = ax*ax + ay*ay;
  const bx2by2 = bx*bx + by*by;
  const cx2cy2 = cx*cx + cy*cy;

  const ux = (ax2ay2*(by-cy) + bx2by2*(cy-ay) + cx2cy2*(ay-by)) / d;
  const uy = (ax2ay2*(cx-bx) + bx2by2*(ax-cx) + cx2cy2*(bx-ax)) / d;

  const dx = ux-ax, dy = uy-ay;
  return {x:ux, y:uy, r2: dx*dx + dy*dy};
}
function pointInCircumcircle(p, cc){
  const dx = p.x-cc.x, dy = p.y-cc.y;
  return dx*dx + dy*dy <= cc.r2;
}
function edgeKey(i,j){ return i<j ? `${i},${j}` : `${j},${i}`; }

/* ---------- Delaunay triangulation ---------- */
function delaunay(pts){
  const margin = Math.max(W,H) * 10;
  const p0 = {x: -margin, y: -margin};
  const p1 = {x:  W/2,     y:  margin*2};
  const p2 = {x:  W+margin, y: -margin};

  const baseIndex = pts.length;
  const all = pts.concat([p0,p1,p2]);

  let tris = [{
    a: baseIndex, b: baseIndex+1, c: baseIndex+2,
    cc: circumcircle({a:baseIndex,b:baseIndex+1,c:baseIndex+2}, all)
  }];

  for (let i=0;i<pts.length;i++){
    const p = all[i];
    const bad = [];
    for (const t of tris){
      if (pointInCircumcircle(p, t.cc)) bad.push(t);
    }

    const edgeCount = new Map();
    for (const t of bad){
      const e1 = edgeKey(t.a, t.b);
      const e2 = edgeKey(t.b, t.c);
      const e3 = edgeKey(t.c, t.a);
      edgeCount.set(e1, (edgeCount.get(e1)||0)+1);
      edgeCount.set(e2, (edgeCount.get(e2)||0)+1);
      edgeCount.set(e3, (edgeCount.get(e3)||0)+1);
    }

    tris = tris.filter(t => !bad.includes(t));

    for (const [k, cnt] of edgeCount.entries()){
      if (cnt !== 1) continue;
      const [sa, sb] = k.split(",").map(Number);
      const nt = {a: sa, b: sb, c: i};
      nt.cc = circumcircle(nt, all);
      tris.push(nt);
    }
  }

  tris = tris.filter(t => t.a<baseIndex && t.b<baseIndex && t.c<baseIndex);
  for (const t of tris) t.shade = rand(0.78, 1.25);
  return tris;
}

/* ---------- Scene ---------- */
let points = [];
let triangles = [];
let frame = 0;

/* ✅ هنا قربنا الكتلة من النص (مش أقصى يمين) */
function buildScene(){
  points = [];
  const rightBias = W * 0.50;       // كان 0.60 → قربناه للنص
  const denseCount = 135;           // زودنا الكثافة شوية
  const sparseCount = 40;

  for (let i=0;i<denseCount;i++){
    // push more points to right side BUT closer to middle
    const x = rightBias + (Math.random()**0.60) * (W - rightBias);
    const y = (Math.random()**0.92) * H;
    points.push({
      x, y,
      vx: rand(-0.35, 0.35),        // ✅ حركة أوضح
      vy: rand(-0.35, 0.35),
      ax: rand(0, Math.PI*2),
      sp: rand(0.006, 0.018)        // ✅ oscillation أسرع شوية
    });
  }

  for (let i=0;i<sparseCount;i++){
    const x = (Math.random()**1.35) * rightBias;
    const y = Math.random() * H;
    points.push({
      x, y,
      vx: rand(-0.16, 0.16),
      vy: rand(-0.16, 0.16),
      ax: rand(0, Math.PI*2),
      sp: rand(0.004, 0.012)
    });
  }

  // boundary points (static)
  const pad = 40;
  const step = Math.max(120, Math.min(W,H)/6);
  for (let x=-pad; x<=W+pad; x+=step){
    points.push({x, y:-pad, vx:0, vy:0, ax:0, sp:0});
    points.push({x, y:H+pad, vx:0, vy:0, ax:0, sp:0});
  }
  for (let y=-pad; y<=H+pad; y+=step){
    points.push({x:-pad, y, vx:0, vy:0, ax:0, sp:0});
    points.push({x:W+pad, y, vx:0, vy:0, ax:0, sp:0});
  }

  triangles = delaunay(points);
}

/* ---------- Rendering (✅ أوضح + خطوط أتقل) ---------- */
function bgGradient(){
  const g = ctx.createLinearGradient(0,0,W,0);
  g.addColorStop(0.00, "#05060a");
  g.addColorStop(0.55, "#05060a");
  g.addColorStop(0.82, "#07070d");
  g.addColorStop(1.00, "#06060b");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // stronger red bloom to make it visible
  const r = Math.min(W,H) * 0.90;
  const gx = W*0.74, gy = H*0.48;   // ✅ أقرب للسنتر
  const rg = ctx.createRadialGradient(gx,gy, 0, gx,gy, r);
  rg.addColorStop(0.00, "rgba(255,42,42,0.20)");
  rg.addColorStop(0.35, "rgba(255,42,42,0.11)");
  rg.addColorStop(0.75, "rgba(255,42,42,0.04)");
  rg.addColorStop(1.00, "rgba(0,0,0,0.00)");
  ctx.fillStyle = rg;
  ctx.fillRect(0,0,W,H);
}

function triFillColor(cx){
  const t = clamp((cx - W*0.45) / (W*0.55), 0, 1);
  const r = 130 + t*120;
  const g = 10  + t*28;
  const b = 12  + t*28;
  return {r,g,b,t};
}

function draw(){
  bgGradient();

  // triangles (fill) — stronger alpha
  for (const tr of triangles){
    const a = points[tr.a], b = points[tr.b], c = points[tr.c];
    const cx = (a.x+b.x+c.x)/3;

    if (cx < W*0.32 && Math.random() < 0.78) continue;

    const col = triFillColor(cx);
    const alpha = (0.05 + col.t*0.30) * tr.shade;  // ✅ أوضح

    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.lineTo(c.x,c.y);
    ctx.closePath();

    ctx.fillStyle = `rgba(${col.r|0},${col.g|0},${col.b|0},${alpha})`;
    ctx.fill();
  }

  // wireframe — thicker + brighter
  ctx.lineWidth = 1.6;  // ✅ أتقل
  for (const tr of triangles){
    const a = points[tr.a], b = points[tr.b], c = points[tr.c];
    const cx = (a.x+b.x+c.x)/3;
    const t = clamp((cx - W*0.40) / (W*0.60), 0, 1);

    const alpha = 0.08 + t*0.45; // ✅ أقوى
    if (cx < W*0.32 && alpha < 0.22) continue;

    ctx.strokeStyle = `rgba(255,42,42,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
    ctx.lineTo(c.x,c.y); ctx.closePath();
    ctx.stroke();
  }

  // highlights (glow edges) — more and clearer
  ctx.lineWidth = 2.2;
  for (let i=0;i<170;i++){
    const tr = triangles[(Math.random()*triangles.length)|0];
    const a = points[tr.a], b = points[tr.b];
    const cx = (a.x+b.x)/2;
    const t = clamp((cx - W*0.45) / (W*0.55), 0, 1);
    if (t <= 0.05) continue;

    ctx.strokeStyle = `rgba(255,95,95,${0.06 + t*0.26})`;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }
}

/* ---------- Motion (✅ أوضح) ---------- */
function step(){
  frame++;

  const centerX = W*0.70; // ✅ قربناه للنص أكتر

  for (let i=0;i<points.length;i++){
    const p = points[i];
    if (p.sp === 0) continue;

    p.ax += p.sp;

    // larger oscillation to be visible
    const ox = Math.cos(p.ax) * 0.32;     // ✅ أكبر
    const oy = Math.sin(p.ax*0.9) * 0.32;

    p.x += p.vx + ox;
    p.y += p.vy + oy;

    // pull slightly towards the cluster center
    const pull = (p.x < W*0.35) ? 0.0012 : 0.00055;
    p.vx += (centerX - p.x) * pull;

    p.vx = clamp(p.vx, -0.85, 0.85);
    p.vy = clamp(p.vy, -0.75, 0.75);

    if (p.y < 0 || p.y > H) p.vy *= -0.98;

    p.x = clamp(p.x, -60, W+60);
    p.y = clamp(p.y, -60, H+60);
  }

  // re-triangulate more often so motion is noticeable
  if (frame % 12 === 0){
    triangles = delaunay(points);
  }

  draw();
  requestAnimationFrame(step);
}

resize();
step();









