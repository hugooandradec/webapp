// /app-operacao/js/sync.js
// v2025-09-24 — Sync offline-first (REST ou Legacy), filas e auto-sync ao voltar online
// - Mantém {acao, dados} no legacy
// - Prefixos de storage específicos do módulo
// - Exporta helpers e filas para uso nos demais JS do app-operacao

export const URL_BACKEND = (window.URL_BACKEND || "https://ajudante-api.onrender.com").replace(/\/+$/, "");
window.URL_BACKEND = URL_BACKEND;

/* ================== chaves de storage ================== */
const K = {
  clientes: "clientes_lista_v1",
  vales:    "vales_lista_v2",
  maquinas: "maquinas_lista_v1",
};
const Q = {
  clientes: "queue_clientes_v1",
  vales:    "queue_vales_v1",
  maquinas: "queue_maquinas_v1",
};

// Exporto chaves usadas no front
export const CLIENTES_KEY = K.clientes;
export const VALES_KEY    = K.vales;
export const MAQS_KEY     = K.maquinas;

/* ================== helpers ================== */
const low = (s)=> (s||"").toString().trim().toLowerCase();

function _readQ(key){ try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function _writeQ(key, arr){ localStorage.setItem(key, JSON.stringify(arr || [])); }

async function httpJSON(path, { method="POST", body, timeout=12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${URL_BACKEND}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  } finally { clearTimeout(t); }
}

/* ================== detecção de modo ================== */
const API_MODE_KEY = "api_mode_v1"; // "rest" | "legacy" | "auto"
function getApiMode(){ return window.API_MODE || localStorage.getItem(API_MODE_KEY) || "auto"; }
function setApiMode(m){ window.API_MODE = m; localStorage.setItem(API_MODE_KEY, m); }

/** Descobre o modo uma vez por sessão (e persiste). */
async function ensureApiMode(){
  const m = getApiMode();
  if (m !== "auto") return m;
  try {
    await httpJSON(`/clientes`, { method:"GET" }); // se existir, é REST
    setApiMode("rest");
    return "rest";
  } catch (e) {
    if (e.status === 404) { setApiMode("legacy"); return "legacy"; }
    // outro erro transitório? mantém auto para tentar de novo depois
    return "auto";
  }
}

/* =========================================================
   PULL (usa modo conhecido; se der 404, troca pra legacy e repete 1x)
========================================================= */
export async function pullClientes() {
  let mode = await ensureApiMode();
  try {
    if (mode === "rest") {
      const data = await httpJSON(`/clientes`, { method:"GET" }); // { ok, docs }
      const docs = data.docs || [];
      localStorage.setItem(K.clientes, JSON.stringify(docs));
      return { ok:true, count: docs.length, mode:"rest" };
    }
    // legacy
    const data = await httpJSON(`/`, { method:"POST", body:{ acao:"listarClientes" } });
    const arr = Array.isArray(data.clientes) ? data.clientes : [];
    const docs = arr.map(n => ({
      id: n.id || crypto?.randomUUID?.() || String(Date.now()),
      nome: low(n.nome), endereco: low(n.endereco), bairro: low(n.bairro),
      rota: low(n.rota), pctCliente: Number(n.pctCliente)||0,
      negativo: Number(n.negativo)||0, recuperacao: Number(n.recuperacao)||0
    }));
    localStorage.setItem(K.clientes, JSON.stringify(docs));
    return { ok:true, count: docs.length, mode:"legacy" };
  } catch (e) {
    if (e.status === 404 && mode === "rest") { setApiMode("legacy"); return pullClientes(); }
    throw e;
  }
}

export async function pullVales() {
  let mode = await ensureApiMode();
  try {
    if (mode === "rest") {
      const data = await httpJSON(`/vales`, { method:"GET" });
      localStorage.setItem(K.vales, JSON.stringify(data.docs || []));
      return { ok:true, count:(data.docs||[]).length, mode:"rest" };
    }
    const data = await httpJSON(`/`, { method:"POST", body:{ acao:"listarVales" } });
    const docs = Array.isArray(data.vales) ? data.vales : [];
    localStorage.setItem(K.vales, JSON.stringify(docs));
    return { ok:true, count:docs.length, mode:"legacy" };
  } catch (e) {
    if (e.status === 404 && mode === "rest") { setApiMode("legacy"); return pullVales(); }
    throw e;
  }
}

export async function pullMaquinas() {
  let mode = await ensureApiMode();
  try {
    if (mode === "rest") {
      const data = await httpJSON(`/maquinas`, { method:"GET" });
      localStorage.setItem(K.maquinas, JSON.stringify(data.docs || []));
      return { ok:true, count:(data.docs||[]).length, mode:"rest" };
    }
    const data = await httpJSON(`/`, { method:"POST", body:{ acao:"listarMaquinas" } });
    const docs = Array.isArray(data.maquinas) ? data.maquinas : [];
    localStorage.setItem(K.maquinas, JSON.stringify(docs));
    return { ok:true, count:docs.length, mode:"legacy" };
  } catch (e) {
    if (e.status === 404 && mode === "rest") { setApiMode("legacy"); return pullMaquinas(); }
    throw e;
  }
}

/* =========================================================
   PUSH (usa modo conhecido; se 404 no REST, muda pra legacy e repete)
========================================================= */
export async function pushClientes({ upserts=[], deletes=[] }) {
  let mode = await ensureApiMode();
  try {
    if (mode === "rest") {
      return await httpJSON(`/clientes/bulk`, { method:"POST", body:{ upserts, deletes } });
    }
    for (const it of upserts)  await httpJSON(`/`, { method:"POST", body:{ acao:"cadastrarCliente", dados: it } });
    for (const id of deletes) await httpJSON(`/`, { method:"POST", body:{ acao:"excluirCliente", id } });
    return { ok:true, mode:"legacy" };
  } catch (e) {
    if (e.status === 404 && mode === "rest") { setApiMode("legacy"); return pushClientes({ upserts, deletes }); }
    throw e;
  }
}

export async function pushVales({ upserts=[], deletes=[] }) {
  let mode = await ensureApiMode();
  try {
    if (mode === "rest") {
      return await httpJSON(`/vales/bulk`, { method:"POST", body:{ upserts, deletes } });
    }
    for (const it of upserts)  await httpJSON(`/`, { method:"POST", body:{ acao:"cadastrarVale", dados: it } });
    for (const id of deletes) await httpJSON(`/`, { method:"POST", body:{ acao:"excluirVale", id } });
    return { ok:true, mode:"legacy" };
  } catch (e) {
    if (e.status === 404 && mode === "rest") { setApiMode("legacy"); return pushVales({ upserts, deletes }); }
    throw e;
  }
}

export async function pushMaquinas({ upserts=[], deletes=[] }) {
  let mode = await ensureApiMode();
  try {
    if (mode === "rest") {
      return await httpJSON(`/maquinas/bulk`, { method:"POST", body:{ upserts, deletes } });
    }
    for (const it of upserts)  await httpJSON(`/`, { method:"POST", body:{ acao:"cadastrarMaquina", dados: it } });
    for (const id of deletes) await httpJSON(`/`, { method:"POST", body:{ acao:"excluirMaquina", id } });
    return { ok:true, mode:"legacy" };
  } catch (e) {
    if (e.status === 404 && mode === "rest") { setApiMode("legacy"); return pushMaquinas({ upserts, deletes }); }
    throw e;
  }
}

/* =========================================================
   FILAS OFFLINE por coleção
========================================================= */
// CLIENTES
export function queueCliente(item){
  const keyNome = low(item?.nome);
  let q = _readQ(Q.clientes);
  const i = q.findIndex(op =>
    op.type === "upsert" &&
    ((op.item?.id && item?.id && op.item.id === item.id) || low(op.item?.nome) === keyNome)
  );
  if (i >= 0) q[i] = { type:"upsert", item:{ ...q[i].item, ...item } };
  else q.push({ type:"upsert", item });
  _writeQ(Q.clientes, q);
}
export function queueClienteDelete(id){
  let q = _readQ(Q.clientes);
  q.push({ type:"delete", id });
  _writeQ(Q.clientes, q);
}

// VALES
export function queueVale(item){
  let q = _readQ(Q.vales);
  const i = q.findIndex(op => op.type === "upsert" && op.item?.id && item?.id && op.item.id === item.id);
  if (i >= 0) q[i] = { type:"upsert", item:{ ...q[i].item, ...item } };
  else q.push({ type:"upsert", item });
  _writeQ(Q.vales, q);
}
export function queueValeDelete(id){
  let q = _readQ(Q.vales);
  q.push({ type:"delete", id });
  _writeQ(Q.vales, q);
}

// MÁQUINAS
export function queueMaquina(item){
  let q = _readQ(Q.maquinas);
  const i = q.findIndex(op => op.type === "upsert" && op.item?.id && item?.id && op.item.id === item.id);
  if (i >= 0) q[i] = { type:"upsert", item:{ ...q[i].item, ...item } };
  else q.push({ type:"upsert", item });
  _writeQ(Q.maquinas, q);
}
export function queueMaquinaDelete(id){
  let q = _readQ(Q.maquinas);
  q.push({ type:"delete", id });
  _writeQ(Q.maquinas, q);
}

/* =========================================================
   Processa filas e depois atualiza caches
========================================================= */
export async function processarFila(){
  // CLIENTES
  {
    const qKey = Q.clientes;
    let q = _readQ(qKey), keep=[];
    for (const op of q){
      try {
        if (op.type === "upsert")      await pushClientes({ upserts:[op.item], deletes:[] });
        else if (op.type === "delete") await pushClientes({ upserts:[], deletes:[op.id] });
      } catch { keep.push(op); }
    }
    _writeQ(qKey, keep);
  }
  // VALES
  {
    const qKey = Q.vales;
    let q = _readQ(qKey), keep=[];
    for (const op of q){
      try {
        if (op.type === "upsert")      await pushVales({ upserts:[op.item], deletes:[] });
        else if (op.type === "delete") await pushVales({ upserts:[], deletes:[op.id] });
      } catch { keep.push(op); }
    }
    _writeQ(qKey, keep);
  }
  // MÁQUINAS
  {
    const qKey = Q.maquinas;
    let q = _readQ(qKey), keep=[];
    for (const op of q){
      try {
        if (op.type === "upsert")      await pushMaquinas({ upserts:[op.item], deletes:[] });
        else if (op.type === "delete") await pushMaquinas({ upserts:[], deletes:[op.id] });
      } catch { keep.push(op); }
    }
    _writeQ(qKey, keep);
  }
  // Atualiza caches com o modo vigente
  await Promise.allSettled([pullClientes(), pullVales(), pullMaquinas()]);
}

// Quando voltar a conexão, processa fila e faz pull.
window.addEventListener("online", async () => {
  try { await processarFila(); } catch {}
});

/* ============== util compat (se já usava) ============== */
export function syncTry(fn, timeoutMs = 8000){
  return new Promise((resolve, reject) => {
    let done = false;
    const to = setTimeout(() => { if (!done){ done=true; reject(new Error("timeout")); } }, timeoutMs + 500);
    Promise.resolve().then(fn).then(v => { if (!done){ done=true; clearTimeout(to); resolve(v); }})
    .catch(e => { if (!done){ done=true; clearTimeout(to); reject(e); }});
  });
}
