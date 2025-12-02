// /app-operacao/js/vales.js
// v2025-09-24 — Vales multi-contexto (Sala vs Ilha/ZS) com relatório em modal e histórico
// - Imports corrigidos para common e sync do módulo
// - Offline-first com storage por contexto e sync em background

import { inicializarPagina } from "../../common/js/navegacao.js";
import { syncTry, pushVales } from "../js/sync.js";

/* ====== CTX obrigatório ====== */
const _ctxParam = new URLSearchParams(location.search).get("ctx");
if (!_ctxParam) {
  location.replace("menu-vales.html#ctx-obrigatorio");
  throw new Error("CTX ausente: vales.html só funciona com ?ctx=ilha|zs|sala");
}
const CTX = _ctxParam.toLowerCase();
const CTX_LABEL = { ilha: "Ilha", zs: "ZS / Centro", sala: "Sala" }[CTX] || CTX.toUpperCase();
const IS_RUA  = (CTX === "ilha" || CTX === "zs");
const IS_SALA = (CTX === "sala");

// controla o modo do modal: 'sala' (3 abas) | 'rua' (visão simples) | 'history' (histórico do cliente)
let MODAL_MODE = "sala";

/* ====== toast fallback ====== */
window.toast = window.toast || {
  ok: (m) => console.log("OK:", m),
  warn: (m) => console.warn("AVISO:", m),
  err: (m) => console.error("ERRO:", m),
};

/* ====== helpers ====== */
const fmtBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const parseValor = (v) => parseFloat((v || "0").toString().replace(",", ".")) || 0;
const lower = (s) => (s || "").toString().trim().toLowerCase();

/* ===== Datas (locale-safe, fuso Brasil) ===== */

/** Confere se está no formato AAAA-MM-DD */
const isValidISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

/** Converte ISO (AAAA-MM-DD) para BR (dd/mm/aaaa) sem mudar fuso */
const toBR = (iso) => {
  if (!isValidISO(iso)) return "-";
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
};

/**
 * Retorna a data **de hoje** no formato ISO (AAAA-MM-DD),
 * corrigindo o fuso local (Brasil) para evitar adiantar o dia por causa do UTC.
 */
function hojeISO() {
  const agora = new Date();
  // Ajusta para “data local” antes de extrair YYYY-MM-DD
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 10);
}

/**
 * Compara duas datas ISO (AAAA-MM-DD) de forma segura (ordem cronológica)
 * Retorna <0, 0, >0 como um compare padrão.
 */
const cmpISO = (a, b) => String(a || "").localeCompare(String(b || ""));

/* ===== Helpers para abas do modal (uma única definição) ===== */
function hideTabs(){
  const t = document.getElementById("tabsSala");
  if (t){
    t.setAttribute("aria-disabled","true");
    t.style.display = "none";
  }
}
function showTabs(){
  const t = document.getElementById("tabsSala");
  if (t){
    t.removeAttribute("aria-disabled");
    t.style.display = "";
  }
}

const somaPagamentos = (it) => (it.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
const saldoVale = (it) => (Number(it.valor) || 0) - somaPagamentos(it);

/* ====== storage (por contexto) ====== */
const STORAGE_KEY   = `vales_lista_v2_${CTX}`;
const PENDENTES_KEY = `vales_pendentes_v1_${CTX}`;

export let lista = [];
let pendentes = [];

/* ====== init ====== */
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina(`Vales - ${CTX_LABEL}`);
  document.title = `Vales - ${CTX_LABEL}`;

  wireModal(); // liga eventos do modal

  carregarDoStorage();

  // Sala: data sempre hoje
  if (IS_SALA) {
    const campo = document.getElementById("data");
    if (campo) campo.value = hojeISO();
  }

  document.getElementById("data")?.addEventListener("input", () => {
    salvarNoStorage();
    atualizarResumo();
  });
});

/* ====== storage ====== */
function salvarNoStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  localStorage.setItem("dataValesRef", document.getElementById("data")?.value || "");
  localStorage.setItem(PENDENTES_KEY, JSON.stringify(pendentes));
}
function carregarNoFormDataRef() {
  const ref = localStorage.getItem("dataValesRef");
  const campo = document.getElementById("data");
  if (campo) campo.value = ref || campo.value || "";
}
function carregarDoStorage() {
  carregarNoFormDataRef();

  const raw = localStorage.getItem(STORAGE_KEY);
  lista = raw ? JSON.parse(raw) : [];

  lista = (lista || [])
    .filter((it) => (it.ctx || CTX) === CTX)
    .map((it) => ({
      ...it,
      ctx: it.ctx || CTX,
      tipo: (it.tipo || "cliente"),
      pagamentos: Array.isArray(it.pagamentos) ? it.pagamentos : [],
      status: it.status || "aberto",
      cliente: lower(it.cliente),
      autorizadoPor: lower(it.autorizadoPor),
      remetente: lower(it.remetente),
    }))
    .filter((it) => it.id || saldoVale(it) > 0);

  const p = localStorage.getItem(PENDENTES_KEY);
  pendentes = p ? JSON.parse(p) : [];

  atualizarLista();
}

/* ====== form ====== */
export function adicionarEntrada(item = {}, idx = null) {
  const hoje = hojeISO();
  const tipo = item.tipo || "cliente";
  const c = document.getElementById("container-nova-entrada");
  c.innerHTML = `
    <input type="hidden" id="editIndex" value="${idx ?? ""}">
    <label for="tipo">tipo do vale:</label>
    <select id="tipo">
      <option value="cliente" ${tipo === "cliente" ? "selected" : ""}>Cliente (empréstimo)</option>
      <option value="operacional" ${tipo === "operacional" ? "selected" : ""}>Operacional (caixa do ponto)</option>
    </select>

    <label for="cliente">${tipo === "operacional" ? "ponto:" : "cliente:"}</label>
    <input id="cliente" type="text" value="${item.cliente ?? ""}" placeholder="${tipo === "operacional" ? "nome do ponto" : "nome do cliente"}" />

    <label for="valor">valor:</label>
    <input id="valor" type="number" inputmode="decimal" value="${item.valor ?? ""}" placeholder="R$" />

    <div id="blocoCliente" style="${tipo === "cliente" ? "" : "display:none"}">
      <label for="autorizadoPor">autorizado por:</label>
      <input id="autorizadoPor" type="text" value="${item.autorizadoPor ?? ""}" />
      <label for="dataPagto">data de pagamento:</label>
      <input id="dataPagto" type="date" value="${item.dataPagto ?? hoje}" />
    </div>

    <div id="blocoOper" style="${tipo === "operacional" ? "" : "display:none"}">
      <label for="remetente">remetente:</label>
      <input id="remetente" type="text" value="${item.remetente ?? ""}" placeholder="quem enviou o dinheiro" />
    </div>

    <label for="dataSolic">data de solicitação:</label>
    <input id="dataSolic" type="date" value="${item.dataSolic ?? hoje}" />

    <button class="btn" id="btnSalvarVale" type="button" onclick="salvarEntrada()">
      ${idx !== null ? "atualizar" : "salvar"} vale
    </button>
  `;

  const sel = c.querySelector("#tipo");
  sel.addEventListener("change", () => {
    const t = sel.value;
    c.querySelector("#blocoCliente").style.display = t === "cliente" ? "" : "none";
    c.querySelector("#blocoOper").style.display = t === "operacional" ? "" : "none";
    c.querySelector("label[for=cliente]").textContent = t === "operacional" ? "ponto:" : "cliente:";
    c.querySelector("#cliente").placeholder = t === "operacional" ? "nome do ponto" : "nome do cliente";
  });

  c.querySelector("#cliente")?.focus();
}

/* ====== salvar ====== */
export async function salvarEntrada() {
  const btn = document.getElementById("btnSalvarVale");
  if (btn) { btn.disabled = true; btn.textContent = "salvando..."; }

  try {
    const editIndex = document.getElementById("editIndex")?.value ?? "";
    const tipo = (document.getElementById("tipo")?.value || "cliente").toLowerCase();
    const cliente = lower(document.getElementById("cliente")?.value);
    const valor = parseValor(document.getElementById("valor")?.value);
    const dataSolic = document.getElementById("dataSolic")?.value || hojeISO();

    const autorizadoPor = lower(document.getElementById("autorizadoPor")?.value);
    const dataPagto = document.getElementById("dataPagto")?.value || "";
    const remetente = lower(document.getElementById("remetente")?.value);

    if (!cliente || !valor || !isValidISO(dataSolic)) {
      toast.warn("preencha cliente/ponto, valor e data");
      return;
    }
    if (tipo === "cliente") {
      if (!autorizadoPor || !isValidISO(dataPagto)) {
        toast.warn("preencha autorizado por e data de pagamento");
        return;
      }
    }
    if (tipo === "operacional" && !remetente) {
      toast.warn("preencha o remetente");
      return;
    }

    let upsert;
    if (editIndex !== "") {
      const it = lista[Number(editIndex)];
      if (!it) return;
      it.tipo = tipo;
      it.cliente = cliente;
      it.valor = valor;
      it.dataSolic = dataSolic;
      it.autorizadoPor = tipo === "cliente" ? autorizadoPor : "";
      it.dataPagto = tipo === "cliente" ? dataPagto : "";
      it.remetente = tipo === "operacional" ? remetente : "";
      it.status = it.status || "aberto";
      it.pagamentos = Array.isArray(it.pagamentos) ? it.pagamentos : [];
      ensureCtxTipo(it);
      upsert = it;
    } else {
      upsert = {
        id: crypto?.randomUUID?.() || String(Date.now()),
        ts: Date.now(),
        ctx: CTX, tipo, cliente, valor, dataSolic,
        autorizadoPor: tipo === "cliente" ? autorizadoPor : "",
        dataPagto:     tipo === "cliente" ? dataPagto     : "",
        remetente:     tipo === "operacional" ? remetente : "",
        status: "aberto", pagamentos: [],
      };
      lista.push(upsert);
    }

    salvarNoStorage();
    atualizarLista();

    const box = document.getElementById("container-nova-entrada");
    if (box) box.innerHTML = "";

    toast.ok("vale salvo localmente ✅");
    pushBg(upsert);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "salvar vale"; }
  }
}

/* ====== sync ====== */
const ensureCtxTipo = (it) => { it.ctx = it.ctx || CTX; it.tipo = it.tipo || "cliente"; return it; };
function pushBg(upsert) {
  ensureCtxTipo(upsert);
  const TRY_TIMEOUT_MS = 6000;
  const tentativa = syncTry(() => pushVales({ upserts: [upsert], deletes: [] }), TRY_TIMEOUT_MS);
  Promise.resolve(tentativa).then(
    () => { toast.ok("sincronizado ✅"); },
    () => {
      pendentes.push({ upsert, ts: Date.now() });
      salvarNoStorage();
      toast.warn("sem servidor: ficará pendente p/ sync");
    }
  );
}

/* ====== listagem ====== */
export function atualizarLista() {
  const wrap = document.getElementById("entradas"); if (!wrap) return;
  wrap.innerHTML = ""; atualizarResumo(true);

  const grupos = new Map(); // key = `${cliente}|||${autorizadoPor}|||${tipo}`
  for (let idx = 0; idx < lista.length; idx++) {
    const it = lista[idx];
    const k = `${lower(it.cliente)}|||${lower(it.autorizadoPor)}|||${it.tipo}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push({ it, idx });
  }

  const chavesOrdenadas = Array.from(grupos.keys()).sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"}));
  const hoje = hojeISO();

  chavesOrdenadas.forEach((k) => {
    const itensIdx = grupos.get(k);
    const [cliente, autorizadoPor, tipo] = k.split("|||");

    let total = 0, pago = 0, saldo = 0, temVencido = false;
    itensIdx.forEach(({ it }) => {
      const s = saldoVale(it);
      total += Number(it.valor) || 0;
      pago  += somaPagamentos(it);
      saldo += s;
      if (it.tipo === "cliente" && s > 0 && it.dataPagto < hoje) temVencido = true;
    });

    const linha = document.createElement("div");
    linha.className = "linha-lancamento";

    const topo = document.createElement("div");
    topo.className = "linha-top";

    const labelLadoNome =
      (tipo === "cliente") ? `autorizado por: <strong>${autorizadoPor || "-"}</strong>` : `remessas para ponto`;

    const classeSaldo =
      (tipo === "operacional" && IS_RUA) ? "negativo" :
      (tipo === "cliente" && IS_SALA) ? (temVencido ? "negativo" : "positivo") :
      (saldo > 0 ? "negativo" : "zero");

    topo.innerHTML = `
      <div>
        <strong>${cliente}</strong> — ${labelLadoNome}<br/>
        Total: ${fmtBRL(total)} | Pago: <span class="positivo">${fmtBRL(pago)}</span> |
        Saldo: <span class="${classeSaldo}">${fmtBRL(saldo)}</span>
      </div>
      <div class="acoes">
        <button class="editar" title="mostrar/ocultar itens"><i class="fas fa-chevron-down"></i></button>
        <button class="editar" title="${tipo === "operacional" ? "registrar recolhimento" : "registrar pagamento"}"
          onclick="registrarPagamentoGrupo(${JSON.stringify({ cliente, autorizadoPor, tipo }).replace(/"/g,'&quot;')})">
          <i class="fas fa-check"></i>
        </button>
        <button class="editar" title="histórico"
          onclick="mostrarHistoricoCliente(${JSON.stringify(cliente).replace(/"/g,'&quot;')})">
          <i class="fas fa-clock-rotate-left"></i>
        </button>
      </div>
    `;

    const detalhe = document.createElement("div");
    detalhe.className = "itens-grupo";
    detalhe.innerHTML = itensIdx.map(({ it, idx }) => {
      const pagamentosHtml = (it.pagamentos || []).map((p, j) => `
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:#555; margin-top:2px">
          • ${toBR(p.data)} — ${fmtBRL(p.valor)} ${p.recebedor ? `(por ${p.recebedor})` : ""}
          <button class="editar" title="editar pagamento" style="font-size:11px;padding:2px 6px" onclick="editarPagamento(${idx}, ${j})"><i class="fas fa-pen-to-square"></i></button>
          <button class="excluir" title="excluir pagamento" style="font-size:11px;padding:2px 6px" onclick="excluirPagamento(${idx}, ${j})"><i class="fas fa-trash"></i></button>
        </div>`).join("");

      const extra = it.tipo === "operacional" ? `<small>remetente: ${it.remetente || "-"}</small>` : `<small>autorizado: ${it.autorizadoPor || "-"}</small>`;

      return `
      <div class="item">
        <div>
          <div><strong>${toBR(it.dataSolic)}${it.tipo==="cliente" && it.dataPagto ? ` → ${toBR(it.dataPagto)}` : ""}</strong></div>
          <small>valor: ${fmtBRL(it.valor)} · saldo: ${fmtBRL(saldoVale(it))} · ${it.status || "aberto"}</small><br/>
          ${extra}
          ${pagamentosHtml ? `<div style="margin-top:4px">${pagamentosHtml}</div>` : ""}
        </div>
        <div class="acoes">
          <button class="editar" title="editar" onclick="editarRegistro(${idx})"><i class="fas fa-pen-to-square"></i></button>
          <button class="excluir" title="excluir" onclick="excluirRegistro(${idx})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join("");

    topo.querySelector(".fa-chevron-down").parentElement.addEventListener("click", () => {
      detalhe.classList.toggle("aberto");
      const icon = topo.querySelector(".fa-chevron-down"); if (icon) icon.classList.toggle("fa-chevron-up");
    });

    linha.appendChild(topo); linha.appendChild(detalhe); wrap.appendChild(linha);
  });

  atualizarResumo();
}

/* ====== resumo ====== */
export function atualizarResumo() {
  const hoje = hojeISO();
  let totalCliente = 0, vencido = 0, aVencer = 0;
  let totalOperacional = 0;

  for (const it of lista) {
    const s = saldoVale(it);
    if (s <= 0) continue;
    if (it.tipo === "operacional") totalOperacional += s;
    else {
      totalCliente += s;
      if (it.dataPagto && it.dataPagto < hoje) vencido += s; else aVencer += s;
    }
  }

  let dataRef = document.getElementById("data")?.value || "";
  if (isValidISO(dataRef)) dataRef = toBR(dataRef);

  const box = document.getElementById("resumoVales");
  if (IS_RUA) {
    box.innerHTML = `<p><strong>data de referência:</strong> ${dataRef || "-"}</p><p><strong>saldo:</strong> ${fmtBRL(totalOperacional)}</p>`;
  } else {
    box.innerHTML = `
      <p><strong>data:</strong> ${dataRef || "-"}</p>
      <p><strong>total:</strong> ${fmtBRL(totalCliente)}</p>
      <p><strong>vencido:</strong> <span class="negativo">${fmtBRL(vencido)}</span></p>
      <p><strong>a vencer:</strong> <span class="positivo">${fmtBRL(aVencer)}</span></p>`;
  }
  salvarNoStorage();
}

/* =============================================================================
   MODAL (compatível com vales.html — #overlayRelatorio / #modalRelatorio)
============================================================================= */
function wireModal(){
  document.getElementById("btnFecharRelatorio")?.addEventListener("click", fecharRelatorio);
  document.getElementById("btnFecharRelatorio2")?.addEventListener("click", fecharRelatorio);

  // Abas da Sala: só funcionam quando o modal está no modo 'sala'
  document.querySelectorAll("#tabsSala .tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if (MODAL_MODE !== "sala") return; // ignora cliques quando estamos em histórico/rua

      document.querySelectorAll("#tabsSala .tab").forEach(b=>b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const key = btn.dataset.tab;
      mostrarAbaSala(key);
    });
  });
}
function abrirRelatorio(){ document.getElementById("overlayRelatorio")?.classList.add("aberto"); }
function fecharRelatorio(){ document.getElementById("overlayRelatorio")?.classList.remove("aberto"); }
window.fecharRelatorio = fecharRelatorio;

/* === Ação pública chamada pelo HTML === */
function visualizarRelatorio(){ if (IS_SALA) visualizarRelatorioSala(); else visualizarRelatorioRua(); }
window.visualizarRelatorio = visualizarRelatorio;

/* ---------- Sala: 3 abas ---------- */
function visualizarRelatorioSala(){
  MODAL_MODE = "sala";
  showTabs();
  document.getElementById("tituloRelatorio").textContent = `Relatório — ${CTX_LABEL}`;

  const rua = document.getElementById("view-rua"); if (rua){ rua.hidden = true; rua.innerHTML = ""; }
  document.getElementById("tabsSala").hidden = false;

  document.querySelectorAll("#tabsSala .tab").forEach(b=>b.classList.remove("is-active"));
  document.querySelector('#tabsSala .tab[data-tab="detalhado"]')?.classList.add("is-active");

  mostrarAbaSala("detalhado");
  abrirRelatorio();
}
function mostrarAbaSala(key){
  const det = document.getElementById("view-detalhado");
  const cli = document.getElementById("view-cliente");
  const aut = document.getElementById("view-autorizacao");
  const rua = document.getElementById("view-rua");          // limpa histórico/rua
  if (rua){ rua.hidden = true; rua.innerHTML = ""; }
  det.hidden = cli.hidden = aut.hidden = true;

  if (key==="detalhado"){ det.hidden = false; renderDetalhado(det); return; }
  if (key==="cliente"){   cli.hidden = false; renderPorCliente(cli); return; }
  if (key==="autorizacao"){ aut.hidden = false; renderPorAutorizacao(aut); return; }
}
function baseLinhasSala(){
  const hoje = hojeISO();
  return (lista||[])
    .filter(x=>x.tipo==="cliente")
    .map(v=>{
      const saldo = saldoVale(v);
      const sit = (saldo>0 && v.dataPagto && v.dataPagto < hoje) ? "Vencido" : (saldo>0 ? "A vencer" : "Pago");
      return { dataSolic: v.dataSolic||"", dataPagto: v.dataPagto||"", cliente: v.cliente||"", autorizadoPor: v.autorizadoPor||"", saldo, situacao: sit };
    })
    .filter(x=>x.saldo>0);
}
function renderDetalhado(container){
  const linhas = baseLinhasSala().sort((a,b)=>cmpISO(a.dataPagto,b.dataPagto)||cmpISO(a.dataSolic,b.dataSolic));
  container.innerHTML = `
    <h4 style="margin:6px 0 8px">Detalhado (por Data de Pagamento)</h4>
    <div style="overflow:auto">
      <table>
        <thead>
          <tr><th>Solicitado</th><th>Pagamento</th><th>Cliente</th><th>Autorizado por</th><th class="num">Saldo</th><th>Situação</th></tr>
        </thead>
        <tbody>
          ${linhas.map(l=>`
            <tr>
              <td>${toBR(l.dataSolic)}</td>
              <td>${toBR(l.dataPagto)}</td>
              <td>${l.cliente}</td>
              <td>${l.autorizadoPor}</td>
              <td class="num">${fmtBRL(l.saldo)}</td>
              <td class="${l.situacao==='Vencido' ? 'negativo' : 'positivo'}">${l.situacao}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
function renderPorCliente(container){
  const hoje = hojeISO();
  const grupos = new Map(); // cliente -> itens
  for (const it of (lista||[]).filter(x=>x.tipo==='cliente')) {
    const k = lower(it.cliente); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(it);
  }
  const items = [];
  for (const [k, arr] of grupos.entries()) {
    let totalSaldo = 0, aVencer = 0, vencido = 0;
    const countAuth = new Map();
    for (const it of arr) {
      const s = saldoVale(it);
      totalSaldo += s;
      if (s > 0) { if (it.dataPagto && it.dataPagto < hoje) vencido += s; else aVencer += s; }
      const a = lower(it.autorizadoPor||""); countAuth.set(a, (countAuth.get(a)||0)+1);
    }
    const autMais = [...countAuth.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || "-";
    items.push({ cliente: arr[0]?.cliente||k, autorizadoPor: autMais, total: totalSaldo, vencido, aVencer });
  }
  items.sort((a,b)=>a.cliente.localeCompare(b.cliente,"pt-BR",{sensitivity:"base"}));
  container.innerHTML = `
    <h4 style="margin:6px 0 8px">Relatório por Cliente</h4>
    <div style="overflow:auto">
      <table>
        <thead>
          <tr><th>Cliente</th><th>Autorizado por</th><th class="num">Total</th><th class="num">Vencido</th><th class="num">A vencer</th></tr>
        </thead>
        <tbody>
          ${items.map(x=>`
            <tr>
              <td>${x.cliente}</td>
              <td>${x.autorizadoPor}</td>
              <td class="num">${fmtBRL(x.total)}</td>
              <td class="num negativo">${fmtBRL(x.vencido)}</td>
              <td class="num positivo">${fmtBRL(x.aVencer)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
function renderPorAutorizacao(container){
  const hoje = hojeISO();
  const grupos = new Map(); // autorizadoPor -> itens
  for (const it of (lista||[]).filter(x=>x.tipo==='cliente')) {
    const k = lower(it.autorizadoPor||"-"); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(it);
  }
  const items = [];
  for (const [k, arr] of grupos.entries()) {
    let totalSaldo = 0, aVencer = 0, vencido = 0;
    const clientes = new Set();
    for (const it of arr) {
      const s = saldoVale(it);
      totalSaldo += s;
      if (s > 0) { if (it.dataPagto && it.dataPagto < hoje) vencido += s; else aVencer += s; }
      if (it.cliente) clientes.add(it.cliente);
    }
    items.push({ autorizadoPor: arr[0]?.autorizadoPor || k, clientes: Array.from(clientes).sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"})), total: totalSaldo, vencido, aVencer });
  }
  items.sort((a,b)=>a.autorizadoPor.localeCompare(b.autorizadoPor,"pt-BR",{sensitivity:"base"}));
  container.innerHTML = `
    <h4 style="margin:6px 0 8px">Relatório por Autorização</h4>
    <div style="overflow:auto">
      <table>
        <thead>
          <tr><th>Autorizado por</th><th>Clientes</th><th class="num">Total</th><th class="num">Vencido</th><th class="num">A vencer</th></tr>
        </thead>
        <tbody>
          ${items.map(x=>`
            <tr>
              <td>${x.autorizadoPor}</td>
              <td>${x.clientes.join(", ")}</td>
              <td class="num">${fmtBRL(x.total)}</td>
              <td class="num negativo">${fmtBRL(x.vencido)}</td>
              <td class="num positivo">${fmtBRL(x.aVencer)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Ilha/ZS: visão simples ---------- */
function visualizarRelatorioRua(){
  MODAL_MODE = "rua";
  hideTabs();
  document.getElementById("tituloRelatorio").textContent = "Operacional (saldo a recolher)";

  document.getElementById("view-detalhado").hidden = true;
  document.getElementById("view-cliente").hidden  = true;
  document.getElementById("view-autorizacao").hidden = true;

  const rua = document.getElementById("view-rua");
  rua.hidden = false;

  const ops = (lista||[]).filter(x=>x.tipo==="operacional");
  const rows = ops.map(o=>`
    <tr>
      <td>${o.cliente}</td>
      <td class="num">${fmtBRL(saldoVale(o))}</td>
      <td>${o.remetente || "-"}</td>
      <td>${toBR(o.dataSolic)}</td>
    </tr>`).join("");

  rua.innerHTML = `
    <div style="overflow:auto">
      <table>
        <thead>
          <tr><th>Ponto</th><th class="num">Saldo</th><th>Remetente</th><th>Solicitação</th></tr>
        </thead>
        <tbody>${rows || ""}</tbody>
      </table>
    </div>`;
  abrirRelatorio();
}

/* ====== Ações auxiliares ====== */
function limparVales(){
  if (!confirm(`Limpar todos os registros de ${CTX_LABEL}?`)) return;
  lista = [];
  salvarNoStorage();
  atualizarLista();
  toast.ok("registros limpos (local) ✅");
}
function editarRegistro(idx){ adicionarEntrada(lista[idx]||{}, idx); }
function excluirRegistro(idx){
  if (!confirm("Excluir este registro?")) return;
  const it = lista[idx];
  if (!it) return;
  lista.splice(idx,1);
  salvarNoStorage(); atualizarLista();
}

/* ====== registrar pagamento do grupo (rateio FIFO) ====== */
function registrarPagamentoGrupo({ cliente, autorizadoPor, tipo }) {
  try {
    // 1) pedir dados básicos
    const valorStr = prompt("Valor recebido (R$):", "");
    if (valorStr == null) return; // cancelado
    const valorTotal = Number(valorStr.replace(/\./g, "").replace(",", ".")) || 0;
    if (valorTotal <= 0) { toast.warn("valor inválido"); return; }

    const data = prompt("Data do recebimento (AAAA-MM-DD):", hojeISO());
    if (!isValidISO(data)) { toast.warn("data inválida"); return; }

    const recebedor = prompt("Recebedor (opcional):", "") || "";

    // 2) selecionar os itens do grupo
    const keyCliente = (cliente || "").toLowerCase();
    const keyAuth    = (autorizadoPor || "").toLowerCase();
    const itensGrupo = lista
      .filter(it =>
        (it.tipo || "cliente") === (tipo || "cliente") &&
        (it.cliente || "").toLowerCase() === keyCliente &&
        (it.autorizadoPor || "").toLowerCase() === keyAuth
      )
      // mais antigos primeiro
      .sort((a, b) => cmpISO(a.dataSolic, b.dataSolic));

    if (!itensGrupo.length) { toast.warn("nenhum item encontrado no grupo"); return; }

    // 3) distribuir o pagamento FIFO
    let restante = valorTotal;
    for (const it of itensGrupo) {
      if (restante <= 0) break;
      const saldo = (Number(it.valor) || 0) - (it.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
      if (saldo <= 0) continue;

      const pago = Math.min(restante, saldo);
      it.pagamentos = Array.isArray(it.pagamentos) ? it.pagamentos : [];
      it.pagamentos.push({ data, valor: pago, recebedor });

      // fecha automaticamente se quitado
      if (saldo - pago <= 0.0001) it.status = "pago";

      restante -= pago;
    }

    if (restante > 0.0001) {
      toast.warn(`sobrou ${fmtBRL(restante)} sem alocação (não havia saldo suficiente)`);
    }

    // 4) persistir e atualizar UI
    salvarNoStorage();
    atualizarLista();
    toast.ok(`pagamento registrado: ${fmtBRL(valorTotal)} (${cliente})`);
  } catch (e) {
    console.error(e);
    toast.err("falha ao registrar pagamento");
  }
}

/* ====== editar pagamento ====== */
function editarPagamento(idx, j) {
  try {
    const it = lista[idx];
    if (!it) return toast.warn("registro não encontrado");
    it.pagamentos = Array.isArray(it.pagamentos) ? it.pagamentos : [];
    const p = it.pagamentos[j];
    if (!p) return toast.warn("pagamento não encontrado");

    // pega defaults
    const valorPadrao = (Number(p.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const novoValorStr = prompt("Novo valor (R$):", valorPadrao);
    if (novoValorStr == null) return;

    const novoValor = Number(novoValorStr.replace(/\./g, "").replace(",", ".")) || 0;
    if (novoValor <= 0) { toast.warn("valor inválido"); return; }

    const novaData = prompt("Nova data (AAAA-MM-DD):", p.data || hojeISO());
    if (!isValidISO(novaData)) { toast.warn("data inválida"); return; }

    const novoRecebedor = prompt("Recebedor (opcional):", p.recebedor || "") || "";

    // aplica alterações
    p.valor = novoValor;
    p.data = novaData;
    p.recebedor = novoRecebedor;

    // recalcula status (pago/aberto)
    const s = saldoVale(it);
    it.status = s <= 0.0001 ? "pago" : "aberto";

    salvarNoStorage();
    atualizarLista();
    toast.ok("pagamento atualizado ✓");
  } catch (e) {
    console.error(e);
    toast.err("falha ao editar pagamento");
  }
}

/* ====== excluir pagamento ====== */
function excluirPagamento(idx, j) {
  try {
    const it = lista[idx];
    if (!it) return toast.warn("registro não encontrado");
    it.pagamentos = Array.isArray(it.pagamentos) ? it.pagamentos : [];
    const p = it.pagamentos[j];
    if (!p) return toast.warn("pagamento não encontrado");

    const ok = confirm(`Excluir pagamento de ${fmtBRL(p.valor)} em ${p.data}?`);
    if (!ok) return;

    it.pagamentos.splice(j, 1);

    // recalcula status
    const s = saldoVale(it);
    it.status = s <= 0.0001 ? "pago" : "aberto";

    salvarNoStorage();
    atualizarLista();
    toast.ok("pagamento excluído ✓");
  } catch (e) {
    console.error(e);
    toast.err("falha ao excluir pagamento");
  }
}

/* ====== histórico do cliente (usa o mesmo modal) ====== */
function mostrarHistoricoCliente(cliente) {
  try {
    // modo Histórico → sem abas e sem alternância
    MODAL_MODE = "history";
    hideTabs();

    const nome = (cliente || "").toString();
    const key  = nome.toLowerCase();

    // esconde views das abas
    document.getElementById("view-detalhado").hidden = true;
    document.getElementById("view-cliente").hidden  = true;
    document.getElementById("view-autorizacao").hidden = true;

    // prepara view única
    const view = document.getElementById("view-rua");
    view.hidden = false;
    view.innerHTML = "";

    // título
    document.getElementById("tituloRelatorio").textContent = `Histórico — ${nome}`;

    // seleciona vales do cliente (tipo cliente)
    const itens = (lista || []).map((it, idx) => ({ it, idx }))
      .filter(({ it }) => it.tipo === "cliente" && (it.cliente || "").toLowerCase() === key)
      .sort((a, b) => cmpISO(a.it.dataSolic, b.it.dataSolic));

    if (!itens.length) {
      view.innerHTML = `<p style="margin:8px 2px">Sem lançamentos para <strong>${nome}</strong>.</p>`;
      abrirRelatorio();
      return;
    }

    const html = itens.map(({ it, idx }) => {
      const s = saldoVale(it);
      const pagamentosHtml = (it.pagamentos || []).map((p, j) => `
        <tr>
          <td>${toBR(p.data)}</td>
          <td class="num">${fmtBRL(p.valor)}</td>
          <td>${p.recebedor || "-"}</td>
          <td style="text-align:right; white-space:nowrap">
            <button class="editar" title="editar pagamento" style="font-size:12px;border:none;background:transparent;color:#6a1b9a;cursor:pointer"
              onclick="editarPagamento(${idx}, ${j})"><i class="fas fa-pen-to-square"></i></button>
            <button class="excluir" title="excluir pagamento" style="font-size:12px;border:none;background:transparent;color:#c0392b;cursor:pointer"
              onclick="excluirPagamento(${idx}, ${j})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join("");

      return `
        <div style="margin:10px 0 14px; padding:10px; border:1px solid #eee; border-radius:8px; background:#fff">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <div>
              <div style="font-weight:700">${toBR(it.dataSolic)} ${it.dataPagto ? "→ " + toBR(it.dataPagto) : ""}</div>
              <div style="font-size:13px; color:#555">
                valor: ${fmtBRL(it.valor)} · saldo: ${fmtBRL(s)} · ${it.status || "aberto"} · autorizado: ${it.autorizadoPor || "-"}
              </div>
            </div>
            <div>
              <button class="editar" title="editar lançamento" style="font-size:13px;border:none;background:#f5f0ff;color:#6a1b9a;border-radius:6px;padding:6px 10px;cursor:pointer"
                onclick="editarRegistro(${idx})"><i class="fas fa-pen-to-square"></i> editar</button>
            </div>
          </div>

          ${(it.pagamentos && it.pagamentos.length)
            ? `
              <div style="margin-top:8px; overflow:auto">
                <table style="width:100%; border-collapse:collapse">
                  <thead>
                    <tr style="background:#f7f7fb">
                      <th style="text-align:left; padding:6px">Data</th>
                      <th class="num" style="padding:6px">Valor</th>
                      <th style="text-align:left; padding:6px">Recebedor</th>
                      <th style="padding:6px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pagamentosHtml}
                  </tbody>
                </table>
              </div>`
            : `<div style="margin-top:8px; font-size:13px; color:#777">Sem pagamentos.</div>`
          }
        </div>
      `;
    }).join("");

    view.innerHTML = html;
    abrirRelatorio();
  } catch (e) {
    console.error(e);
    toast.err("falha ao mostrar histórico");
  }
}

/* ====== exports globais ====== */
window.adicionarEntrada = adicionarEntrada;
window.salvarEntrada = salvarEntrada;
window.limparVales = limparVales;
window.editarRegistro = editarRegistro;
window.excluirRegistro = excluirRegistro;
window.editarPagamento = editarPagamento;
window.excluirPagamento = excluirPagamento;
window.registrarPagamentoGrupo = registrarPagamentoGrupo;
window.visualizarRelatorio = visualizarRelatorio;
window.mostrarHistoricoCliente = mostrarHistoricoCliente;
window.atualizarResumo = atualizarResumo;
window.atualizarLista = atualizarLista;