/* RoadWatch AI — app logic
 * Hazard classification: Google Teachable Machine (TensorFlow.js, in-browser).
 * If ./model/metadata.json is present, the real trained model is loaded;
 * otherwise a lightweight DEMO heuristic is used so the site still works end-to-end.
 * Storage: localStorage (client-side only by design).
 */
"use strict";

let LABELS = ["Pothole", "Waterlogging", "Debris", "Clear Road"]; // overridden by model metadata labels once loaded
const CLASS_COLORS = {
  "Pothole": "#d35400",
  "Potholes": "#d35400",
  "Waterlogging": "#2980b9",
  "Debris": "#8e44ad",
  "Clear Road": "#27ae60",
};
const DEFAULT_CENTER = [28.61, 77.21]; // Delhi NCR
const DEFAULT_ZOOM = 11;
const STORE_KEY = "roadwatch_reports_v1";

/* ---------- state ---------- */
let model = null;          // Teachable Machine model (or null => demo mode)
let modelMode = "loading"; // loading | live | demo
let currentPhoto = null;   // dataURL
let currentPrediction = null; // {label, confidence, probs}
let currentLatLng = null;
let map, marker;

/* ---------- persistence ---------- */
function loadReports() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveReports(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

/* ---------- model loading ---------- */
async function loadModel() {
  const badge = document.getElementById("modelStatus");
  try {
    const res = await fetch("model/metadata.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no model files");
    const meta = await res.json();
    // Load with Teachable Machine community library (exposes tmImage)
    model = await window.tmImage.load("model/model.json", "model/metadata.json");
    modelMode = "live";
    if (Array.isArray(meta.labels) && meta.labels.length) LABELS = meta.labels;
    badge.textContent = "AI model: LIVE (" + meta.labels.join(", ") + ")";
    badge.className = "model-badge live";
  } catch {
    modelMode = "demo";
    badge.textContent = "Demo mode — drop your Teachable Machine export in /model to go live";
    badge.className = "model-badge demo";
  }
}

/* DEMO classifier: simple image-statistics heuristic, good enough to
 * demonstrate the end-to-end flow until the real model is exported. */
async function demoPredict(imgEl) {
  const canvas = document.createElement("canvas");
  const S = 64;
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, S, S);
  const d = ctx.getImageData(0, 0, S, S).data;

  let blueish = 0, dark = 0, gray = 0, total = S * S;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (b > r + 18 && b > 70) blueish++;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 60) dark++;
    if (Math.abs(r - g) < 14 && Math.abs(g - b) < 14 && lum > 60 && lum < 190) gray++;
  }
  const p = {
    "Waterlogging": 0.15 + (blueish / total) * 3.2,
    "Pothole": 0.15 + (dark / total) * 2.6,
    "Debris": 0.15 + (gray / total) * 1.6,
    "Clear Road": 0.3,
  };
  const sum = Object.values(p).reduce((a, b) => a + b, 0);
  const probs = {};
  for (const k of LABELS) {
    const key = k.startsWith("Pothole") ? "Pothole" : k;
    probs[k] = (p[key] ?? 0) / sum;
  }
  const label = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
  return { label, confidence: probs[label], probs };
}

async function predict(imgEl) {
  if (modelMode === "live") {
    const preds = await model.predict(imgEl);
    const probs = {};
    let label = preds[0].className, conf = 0;
    for (const p of preds) {
      probs[p.className] = p.probability;
      if (p.probability > conf) { conf = p.probability; label = p.className; }
    }
    return { label, confidence: conf, probs };
  }
  return demoPredict(imgEl);
}

/* ---------- photo + prediction UI ---------- */
function readPhoto(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    currentPhoto = e.target.result;
    const img = new Image();
    img.onload = async () => {
      const preview = document.getElementById("preview");
      preview.src = currentPhoto;
      preview.hidden = false;
      document.getElementById("dropHint").hidden = true;

      const box = document.getElementById("predictionBox");
      const main = document.getElementById("predictionMain");
      const bars = document.getElementById("predictionBars");
      main.textContent = "Analysing image…";
      bars.innerHTML = "";
      box.hidden = false;

      currentPrediction = await predict(img);
      renderPrediction(currentPrediction);
      updateSubmitState();
    };
    img.src = currentPhoto;
  };
  reader.readAsDataURL(file);
}

function renderPrediction(pred) {
  const main = document.getElementById("predictionMain");
  const bars = document.getElementById("predictionBars");
  main.textContent = `${pred.label} — ${(pred.confidence * 100).toFixed(1)}% confidence`;
  if (modelMode === "demo") main.textContent += "  (demo)";
  bars.innerHTML = "";
  for (const cls of LABELS) {
    const v = pred.probs[cls] ?? 0;
    bars.insertAdjacentHTML("beforeend",
      `<li><span>${cls}</span><span class="bar"><i style="width:${(v * 100).toFixed(0)}%;background:${CLASS_COLORS[cls]}"></i></span><span>${(v * 100).toFixed(1)}%</span></li>`);
  }
}

/* ---------- map ---------- */
function initMap() {
  map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  map.on("click", (e) => {
    currentLatLng = [e.latlng.lat, e.latlng.lng];
    setMarker(currentLatLng);
    updateSubmitState();
  });
}

function setMarker(latlng) {
  if (!marker) {
    marker = L.marker(latlng, { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      currentLatLng = [p.lat, p.lng];
    });
  } else {
    marker.setLatLng(latlng);
  }
  map.panTo(latlng);
}

function pinIcon(report) {
  const color = CLASS_COLORS[report.hazardClass] || "#555";
  return L.divIcon({
    className: "",
    html: `<div class="pin" style="width:14px;height:14px;background:${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function renderMapPins() {
  map.eachLayer((layer) => { if (layer instanceof L.Marker) map.removeLayer(layer); });
  for (const r of loadReports()) {
    const m = L.marker([r.lat, r.lng], { icon: pinIcon(r) }).addTo(map);
    m.bindPopup(`
      <img src="${r.photo}" style="width:160px;border-radius:6px" />
      <div style="margin-top:.4rem">
        <b>${r.hazardClass}</b> ${(r.confidence * 100).toFixed(1)}%
        ${r.verified ? ' <span class="badge-verified">✔ verified</span>' : ""}
        <div style="font-size:.75rem;color:#555">${r.locationText || ""}</div>
        <div style="font-size:.7rem;color:#888">${new Date(r.timestamp).toLocaleString()}</div>
      </div>`);
  }
  const n = loadReports().length;
  document.getElementById("reportCount").textContent = n ? `· ${n} report${n > 1 ? "s" : ""}` : "";
}

/* ---------- reports list ---------- */
function renderReports() {
  const wrap = document.getElementById("reportsList");
  const reports = loadReports().sort((a, b) => b.timestamp - a.timestamp);
  wrap.innerHTML = "";
  if (!reports.length) {
    wrap.innerHTML = '<p class="hint">No reports yet — upload a photo, pick a spot on the map, and submit the first one!</p>';
    return;
  }
  for (const r of reports) {
    const card = document.createElement("div");
    card.className = "report-card";
    card.innerHTML = `
      <img src="${r.photo}" alt="hazard photo" />
      <div class="rc-body">
        <div class="rc-class" style="color:${CLASS_COLORS[r.hazardClass]}">${r.hazardClass}
          ${(r.confidence * 100).toFixed(1)}%${r.verified ? '<span class="badge-verified">✔</span>' : ""}</div>
        <div class="rc-meta">${r.locationText || "Unnamed location"}<br>${new Date(r.timestamp).toLocaleString()}</div>
      </div>
      <div class="rc-actions">
        <button class="verify" data-id="${r.id}">${r.verified ? "Unverify" : "Verify"}</button>
        <button class="delete" data-id="${r.id}">Delete</button>
      </div>`;
    wrap.appendChild(card);
  }
  wrap.querySelectorAll("button.verify").forEach((b) =>
    b.addEventListener("click", () => {
      const list = loadReports();
      const rep = list.find((x) => x.id === b.dataset.id);
      rep.verified = !rep.verified;
      saveReports(list);
      renderReports(); renderMapPins();
    }));
  wrap.querySelectorAll("button.delete").forEach((b) =>
    b.addEventListener("click", () => {
      saveReports(loadReports().filter((x) => x.id !== b.dataset.id));
      renderReports(); renderMapPins();
    }));
}

/* ---------- submit ---------- */
function updateSubmitState() {
  const ok = currentPhoto && currentPrediction && currentLatLng;
  document.getElementById("submitReport").disabled = !ok;
  const err = document.getElementById("formError");
  if (ok) { err.hidden = true; return; }
  const missing = [];
  if (!currentPhoto) missing.push("a photo");
  if (!currentLatLng) missing.push("a location (click the map)");
  err.textContent = missing.length ? `Still needed: ${missing.join(", ")}` : "";
  err.hidden = false;
}

function submitReport() {
  if (!currentPhoto || !currentPrediction || !currentLatLng) return;
  const reports = loadReports();
  reports.push({
    id: crypto.randomUUID(),
    photo: currentPhoto,
    hazardClass: currentPrediction.label,
    confidence: currentPrediction.confidence,
    probs: currentPrediction.probs,
    lat: currentLatLng[0],
    lng: currentLatLng[1],
    locationText: document.getElementById("locationText").value.trim(),
    timestamp: Date.now(),
    verified: false, // every new report starts as an unverified pin
  });
  saveReports(reports);

  // reset form
  currentPhoto = currentPrediction = currentLatLng = null;
  if (marker) { map.removeLayer(marker); marker = null; }
  document.getElementById("photoInput").value = "";
  document.getElementById("preview").hidden = true;
  document.getElementById("dropHint").hidden = false;
  document.getElementById("predictionBox").hidden = true;
  document.getElementById("locationText").value = "";
  updateSubmitState();

  renderReports(); renderMapPins();
  map.setView(currentLatLng || DEFAULT_CENTER, DEFAULT_ZOOM);
}

/* ---------- GPS button ---------- */
function useGps() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLatLng = [pos.coords.latitude, pos.coords.longitude];
      setMarker(currentLatLng);
      updateSubmitState();
    },
    () => alert("Could not get your location — please click the map instead."),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

/* ---------- sample reports (for empty demos) ---------- */
function loadSampleReports() {
  const spots = [
    { lat: 28.6139, lng: 77.2090, loc: "Connaught Place outer ring", cls: "Pothole" },
    { lat: 28.5494, lng: 77.2001, loc: "Near Saket Metro Station", cls: "Waterlogging" },
    { lat: 28.6304, lng: 77.2177, loc: "Civil Lines service road", cls: "Debris" },
    { lat: 28.4595, lng: 77.0266, loc: "Gurgaon Golf Course Road", cls: "Pothole" },
    { lat: 28.7041, lng: 77.1025, loc: "Rohini Sector 7 market", cls: "Clear Road" },
  ];
  const reports = loadReports();
  const samplePhotos = [
    "training-data/pothole/pothole_3.jpg",
    "training-data/waterlogging/wl_1.jpg",
    "training-data/debris/debris_1.jpg",
    "training-data/pothole/pothole_5.jpg",
    "training-data/clear_road/road_1.jpg",
  ];
  spots.forEach((s, i) => {
    reports.push({
      id: crypto.randomUUID(),
      photo: samplePhotos[i],
      hazardClass: s.cls,
      confidence: 0.82 + i * 0.03,
      probs: {},
      lat: s.lat, lng: s.lng,
      locationText: s.loc,
      timestamp: Date.now() - (i + 1) * 86400000,
      verified: i === 0,
      sample: true,
    });
  });
  saveReports(reports);
  renderReports(); renderMapPins();
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  renderReports();
  renderMapPins();
  await loadModel();

  const input = document.getElementById("photoInput");
  const dz = document.getElementById("dropzone");
  dz.addEventListener("click", () => input.click());
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault(); dz.classList.remove("drag");
    if (e.dataTransfer.files[0]) readPhoto(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", () => {
    if (input.files[0]) readPhoto(input.files[0]);
  });

  document.getElementById("useGps").addEventListener("click", useGps);
  document.getElementById("loadSamples").addEventListener("click", loadSampleReports);
  document.getElementById("submitReport").addEventListener("click", submitReport);
  updateSubmitState();
});
