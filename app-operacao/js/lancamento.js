// js/lancamento.js

/* ===== HELPERS ===== */
function formatarMoeda(valor){
  return (Number(valor)||0).toLocaleString("pt-BR",{
    style:"currency",
    currency:"BRL",
    minimumFractionDigits:2
  });
}

function parseValor(v){
  return parseFloat((v||"0").toString().replace(",", ".")) || 0;
}

function normalizarPonto(n){
  return (n||"").trim().toLowerCase();
}

function normalizarCaixa(n){
  return (n||"").trim().toLowerCase();
}

function formatarNomeCaixa(n){
  return (n||"").trim();
}

function formatarDataHora(ts){
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return "--";

  const dt = new Date(n);
  if (Number.isNaN(dt.getTime())) return "--";

  const data = dt.toLocaleDateString("pt-BR", {
    day:"2-digit",
    month:"2-digit",
    year:"numeric"
  });

  const hora = dt.toLocaleTimeString("pt-BR", {
    hour:"2-digit",
    minute:"2-digit"
  });

  return `${data} ${hora}`;
}

function getHojeIso(){
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function textoSeguro(txt){
  return String(txt ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatarDataTela(dataIso){
  if (!dataIso) return "-";
  const [yyyy, mm, dd] = dataIso.split("-");
  if (!yyyy || !mm || !dd) return "-";
  return `${dd}/${mm}/${yyyy}`;
}

/* ===== CORES ===== */
const corPos = "#1b8f2e";
const corNeg = "#c0392b";
const roxo   = "#6a1b9a";

/* ===== STORAGE ===== */
const APP_STORAGE_KEY = "lancamento_caixas_v1";

/* ===== ESTADO ===== */
const listaLancamentos = [];
let historicoRaw = [];
let caixaAtiva = "";
let dadosApp = criarEstruturaBase();

function criarEstruturaBase(){
  return {
    caixaAtiva: "",
    caixas: [],
    dadosPorCaixa: {}
  };
}

function criarCaixaVazia(){
  return {
    data: "",
    valorInicial: "",
    historicoRaw: []
  };
}

function garantirCaixa(nome){
  const key = normalizarCaixa(nome);
  if (!key) return "";

  if (!Array.isArray(dadosApp.caixas)) dadosApp.caixas = [];
  if (!dadosApp.dadosPorCaixa || typeof dadosApp.dadosPorCaixa !== "object") {
    dadosApp.dadosPorCaixa = {};
  }

  if (!dadosApp.caixas.includes(key)) {
    dadosApp.caixas.push(key);
  }

  if (!dadosApp.dadosPorCaixa[key]) {
    dadosApp.dadosPorCaixa[key] = criarCaixaVazia();
  }

  return key;
}

function getDadosCaixaAtual(){
  if (!caixaAtiva) return criarCaixaVazia();
  return dadosApp.dadosPorCaixa[caixaAtiva] || criarCaixaVazia();
}

function sincronizarEstadoCaixaAtual(){
  if (!caixaAtiva) {
    historicoRaw = [];
    listaLancamentos.length = 0;
    return;
  }

  const dados = getDadosCaixaAtual();
  historicoRaw = Array.isArray(dados.historicoRaw) ? [...dados.historicoRaw] : [];
  rebuildAgregadoFromRaw();
}

function atualizarEstadoDoCaixaAtual(){
  if (!caixaAtiva) return;

  const dados = getDadosCaixaAtual();
  dados.historicoRaw = [...historicoRaw];
  dados.data = document.getElementById("data")?.value || "";
  dados.valorInicial = document.getElementById("valorInicial")?.value || "";
}

function preencherCamposCaixaAtual(){
  const dados = getDadosCaixaAtual();
  const d  = document.getElementById("data");
  const vi = document.getElementById("valorInicial");

  if (d) d.value = dados.data || getHojeIso();
  if (vi) vi.value = dados.valorInicial || "";
}

function renderizarSeletorCaixas(){
  const select = document.getElementById("caixaAtiva");
  const wrap = document.getElementById("wrapCaixaSelect");
  if (!select || !wrap) return;

  const caixas = [...new Set((dadosApp.caixas || [])
    .map(c => normalizarCaixa(c))
    .filter(Boolean))];

  dadosApp.caixas = caixas;

  if (!caixas.length) {
    wrap.style.display = "none";
    select.innerHTML = "";
    caixaAtiva = "";
    return;
  }

  wrap.style.display = "block";

  select.innerHTML = caixas.map(c => {
    const nome = formatarNomeCaixa(c);
    return `<option value="${textoSeguro(c)}">${textoSeguro(nome)}</option>`;
  }).join("");

  if (!caixaAtiva || !caixas.includes(caixaAtiva)) {
    caixaAtiva = caixas[0];
  }

  select.value = caixaAtiva;
}

function atualizarEstadoBotoes(){
  const temCaixaAtiva = !!caixaAtiva;
  const temCaixas = (dadosApp.caixas || []).length > 0;

  const btnNovaEntrada = document.getElementById("btnNovaEntrada");
  const btnRelatorio = document.getElementById("btnRelatorio");
  const btnRelatorioTotal = document.getElementById("btnRelatorioTotal");
  const btnLimparTudo = document.getElementById("btnLimparTudo");

  if (btnNovaEntrada) btnNovaEntrada.disabled = !temCaixaAtiva;
  if (btnRelatorio) btnRelatorio.disabled = !temCaixaAtiva;
  if (btnLimparTudo) btnLimparTudo.disabled = !temCaixaAtiva;
  if (btnRelatorioTotal) btnRelatorioTotal.disabled = !temCaixas;
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  carregarDoStorage();

  ["data","valorInicial"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        salvarNoStorage();
        atualizarTotais();
      });
    }
  });

  const seletor = document.getElementById("caixaAtiva");
  seletor?.addEventListener("change", (e) => {
    trocarCaixa(e.target.value);
  });

  const modal = document.getElementById("modal-relatorio");
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) fecharRelatorio();
  });
});

/* ===== STORAGE ===== */
function migrarEstruturaAntigaParaCaixas(salvoAntigo){
  if (!salvoAntigo || typeof salvoAntigo !== "object") {
    return criarEstruturaBase();
  }

  const caixas = Array.isArray(salvoAntigo.categorias)
    ? salvoAntigo.categorias.map(normalizarCaixa).filter(Boolean)
    : [];

  const dadosPorCaixa = {};
  const origem = salvoAntigo.dadosPorCategoria || {};

  caixas.forEach(cx => {
    const item = origem[cx] || {};
    dadosPorCaixa[cx] = {
      data: item.data || "",
      valorInicial: item.valorInicial || "",
      historicoRaw: Array.isArray(item.historicoRaw) ? item.historicoRaw : []
    };
  });

  return {
    caixaAtiva: normalizarCaixa(salvoAntigo.categoriaAtiva || caixas[0] || ""),
    caixas,
    dadosPorCaixa
  };
}

function salvarNoStorage(){
  atualizarEstadoDoCaixaAtual();
  dadosApp.caixaAtiva = caixaAtiva;
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(dadosApp));
}

function carregarDoStorage(){
  const salvoNovo = localStorage.getItem(APP_STORAGE_KEY);
  const salvoAntigo = localStorage.getItem("lancamento_categorias_v1");

  if (salvoNovo) {
    try {
      dadosApp = JSON.parse(salvoNovo);
    } catch {
      dadosApp = criarEstruturaBase();
    }
  } else if (salvoAntigo) {
    try {
      dadosApp = migrarEstruturaAntigaParaCaixas(JSON.parse(salvoAntigo));
    } catch {
      dadosApp = criarEstruturaBase();
    }
  } else {
    dadosApp = criarEstruturaBase();
  }

  if (!dadosApp || typeof dadosApp !== "object") {
    dadosApp = criarEstruturaBase();
  }

  if (!Array.isArray(dadosApp.caixas)) dadosApp.caixas = [];
  if (!dadosApp.dadosPorCaixa || typeof dadosApp.dadosPorCaixa !== "object") {
    dadosApp.dadosPorCaixa = {};
  }

  caixaAtiva = normalizarCaixa(dadosApp.caixaAtiva || "");

  renderizarSeletorCaixas();
  preencherCamposCaixaAtual();
  sincronizarEstadoCaixaAtual();
  atualizarLista();
  atualizarEstadoBotoes();
  salvarNoStorage();
}

/* ===== AGREGAÇÃO ===== */
function rebuildAgregadoFromRaw(){
  const mapa = new Map();
  const ordem = [];

  for (const e of historicoRaw){
    const k = normalizarPonto(e.ponto);
    if (!k) continue;

    if (!mapa.has(k)){
      mapa.set(k, { ponto:k, dinheiro:0, saida:0 });
      ordem.push(k);
    }

    const acc = mapa.get(k);
    acc.dinheiro += Number(e.dinheiro) || 0;
    acc.saida    += Number(e.saida) || 0;
  }

  listaLancamentos.length = 0;
  for (const k of ordem) {
    listaLancamentos.push(mapa.get(k));
  }
}

function calcularResumoDoCaixa(nomeCaixa){
  const dados = dadosApp.dadosPorCaixa[nomeCaixa] || criarCaixaVazia();
  const historico = Array.isArray(dados.historicoRaw) ? dados.historicoRaw : [];

  let entrada = 0;
  let saida = 0;

  for (const item of historico) {
    entrada += Number(item.dinheiro) || 0;
    saida += Number(item.saida) || 0;
  }

  const valorInicial = parseValor(dados.valorInicial || 0);
  const valorTotal = valorInicial + entrada - saida;

  return {
    data: dados.data || "",
    valorInicial,
    entrada,
    saida,
    valorTotal
  };
}

/* ===== CAIXAS ===== */
window.criarNovoCaixa = function(){
  const nomeInformado = prompt("Nome do novo caixa:");
  if (nomeInformado === null) return;

  const nome = normalizarCaixa(nomeInformado);
  if (!nome) {
    window.toast?.error?.("informe um nome para o caixa.");
    return;
  }

  if ((dadosApp.caixas || []).includes(nome)) {
    caixaAtiva = nome;
    renderizarSeletorCaixas();
    trocarCaixa(nome);
    window.toast?.error?.("esse caixa já existe.");
    return;
  }

  garantirCaixa(nome);
  caixaAtiva = nome;
  dadosApp.caixaAtiva = caixaAtiva;

  renderizarSeletorCaixas();
  preencherCamposCaixaAtual();
  sincronizarEstadoCaixaAtual();

  const box = document.getElementById("container-nova-entrada");
  if (box) box.innerHTML = "";

  atualizarLista();
  atualizarEstadoBotoes();
  salvarNoStorage();

  window.toast?.success?.("Caixa criado.");
};

function trocarCaixa(nome){
  salvarNoStorage();

  caixaAtiva = normalizarCaixa(nome);
  if (!caixaAtiva || !(dadosApp.caixas || []).includes(caixaAtiva)) {
    caixaAtiva = "";
  }

  dadosApp.caixaAtiva = caixaAtiva;

  renderizarSeletorCaixas();
  preencherCamposCaixaAtual();
  sincronizarEstadoCaixaAtual();

  const box = document.getElementById("container-nova-entrada");
  if (box) box.innerHTML = "";

  atualizarLista();
  atualizarEstadoBotoes();
  salvarNoStorage();
}

/* ===== UI: NOVA ENTRADA / EDITAR ===== */
window.adicionarEntrada = function(lanc = {}, idx = null){
  if (!caixaAtiva){
    window.toast?.error?.("crie um caixa antes de lançar.");
    return;
  }

  const box = document.getElementById("container-nova-entrada");
  if (!box) return;

  const pontoNorm = normalizarPonto(lanc.ponto ?? "");

  box.innerHTML = `
    <input type="hidden" id="editIndex" value="${idx ?? ""}">
    <input type="hidden" id="pontoOriginal" value="${textoSeguro(pontoNorm)}">

    <label for="ponto">Ponto</label>
    <input id="ponto" type="text" placeholder="Nome do ponto" value="${textoSeguro(pontoNorm)}" />

    <label for="dinheiro">Entrada</label>
    <input id="dinheiro" type="number" placeholder="R$" value="${lanc.dinheiro ?? ""}" />

    <label for="saida">Saída</label>
    <input id="saida" type="number" placeholder="R$" value="${lanc.saida ?? ""}" />

    <button class="btn" onclick="salvarEntrada()">${idx !== null ? "Atualizar" : "Salvar"} Entrada</button>
  `;

  document.getElementById("ponto")?.focus();
};

window.salvarEntrada = function(){
  if (!caixaAtiva){
    window.toast?.error?.("crie um caixa antes de lançar.");
    return;
  }

  const pontoNovo = normalizarPonto(document.getElementById("ponto")?.value || "");
  const entrada   = parseValor(document.getElementById("dinheiro")?.value || 0);
  const saida     = parseValor(document.getElementById("saida")?.value || 0);
  const editIdx   = document.getElementById("editIndex")?.value ?? "";
  const pontoOrig = normalizarPonto(document.getElementById("pontoOriginal")?.value || "");

  if (!pontoNovo){
    window.toast?.error?.("informe o nome do ponto.");
    return;
  }

  const base = {
    id: crypto?.randomUUID?.() || String(Date.now()),
    ts: Date.now(),
    ponto: pontoNovo,
    dinheiro: entrada,
    saida
  };

  if (editIdx !== ""){
    const idx = Number(editIdx);
    const antigo = listaLancamentos[idx];
    if (!antigo) return;

    const keyAntiga = normalizarPonto(pontoOrig || antigo.ponto);
    const keyNova   = normalizarPonto(pontoNovo);

    if (keyAntiga && keyNova && keyAntiga !== keyNova){
      historicoRaw = historicoRaw.map(r => {
        const k = normalizarPonto(r.ponto);
        if (k === keyAntiga) return { ...r, ponto: keyNova };
        return r;
      });
    }

    rebuildAgregadoFromRaw();
    const atualNovo = listaLancamentos.find(x => normalizarPonto(x.ponto) === keyNova) || { dinheiro:0, saida:0 };

    historicoRaw.push({
      ...base,
      dinheiro: entrada - (Number(atualNovo.dinheiro) || 0),
      saida: saida - (Number(atualNovo.saida) || 0),
      cartao: 0,
      outros: 0,
      caixa: caixaAtiva
    });

    rebuildAgregadoFromRaw();
    window.toast?.success?.("Entrada atualizada.");
  }
  else {
    historicoRaw.push({
      ...base,
      cartao: 0,
      outros: 0,
      caixa: caixaAtiva
    });
    rebuildAgregadoFromRaw();
    window.toast?.success?.("Entrada salva.");
  }

  document.getElementById("container-nova-entrada").innerHTML = "";
  salvarNoStorage();
  atualizarLista();
};

/* ===== LISTA ===== */
function atualizarLista(){
  const lista = document.getElementById("entradas");
  if (!lista) return;

  lista.innerHTML = "";

  if (!caixaAtiva) {
    lista.innerHTML = `<p style="margin:0; color:#666;">Nenhum caixa cadastrado.</p>`;
    atualizarTotais();
    atualizarEstadoBotoes();
    return;
  }

  if (!listaLancamentos.length) {
    lista.innerHTML = `<p style="margin:0; color:#666;">Sem entradas neste caixa.</p>`;
  }

  listaLancamentos.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "linha-lancamento";

    const bloco = document.createElement("div");
    bloco.style.minWidth = "0";
    bloco.innerHTML = `<strong>${textoSeguro(it.ponto)}</strong><br/>`;

    const parts = [];
    if (it.dinheiro) parts.push(`Entrada: <span style="color:${corPos}">${formatarMoeda(it.dinheiro)}</span>`);
    if (it.saida) parts.push(`Saída: <span style="color:${corNeg}">-${formatarMoeda(it.saida)}</span>`);
    bloco.innerHTML += parts.join(" | ");

    const acoes = document.createElement("div");
    acoes.className = "acoes";
    acoes.innerHTML = `
      <button title="Editar" onclick="editarLancamento(${idx})"><i class="fas fa-pen"></i></button>
      <button title="Histórico" onclick="visualizarHistorico(${idx})"><i class="fas fa-clock-rotate-left"></i></button>
      <button title="Excluir" onclick="excluirLancamento(${idx})"><i class="fas fa-trash"></i></button>
    `;

    div.appendChild(bloco);
    div.appendChild(acoes);
    lista.appendChild(div);
  });

  atualizarTotais();
  atualizarEstadoBotoes();
}

/* ===== RESUMO (TELA) ===== */
function atualizarTotais(){
  const box = document.getElementById("resumoLancamento");
  if (!box) return;

  if (!caixaAtiva) {
    box.innerHTML = `<p style="margin:0; color:#666;">Crie um caixa para começar os lançamentos.</p>`;
    return;
  }

  const totalEntrada = listaLancamentos.reduce((s, e) => s + (Number(e.dinheiro) || 0), 0);
  const totalSaida   = listaLancamentos.reduce((s, e) => s + (Number(e.saida) || 0), 0);

  const valorInicial = parseValor(document.getElementById("valorInicial")?.value || 0);
  const valorTotal   = valorInicial + totalEntrada - totalSaida;

  let dataResumo = document.getElementById("data")?.value || "";
  if (dataResumo){
    const [yyyy, mm, dd] = dataResumo.split("-");
    const d = new Date(+yyyy, +mm - 1, +dd);
    const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
    dataResumo = `${dd}/${mm}/${yyyy} (${dia})`;
  }

  box.innerHTML = `
    <p><strong>Caixa:</strong> ${textoSeguro(formatarNomeCaixa(caixaAtiva))}</p>
    <p><strong>Data:</strong> ${textoSeguro(dataResumo || "-")}</p>
    <p><strong>Valor Inicial:</strong>
      <span style="color:${valorInicial < 0 ? corNeg : corPos}">${formatarMoeda(valorInicial)}</span>
    </p>
    <p><strong>Entrada:</strong>
      <span style="color:${corPos}">${formatarMoeda(totalEntrada)}</span>
    </p>
    <p><strong>Saída:</strong>
      <span style="color:${corNeg}">-${formatarMoeda(totalSaida)}</span>
    </p>
    <p><strong>Valor Total:</strong>
      <span style="color:${valorTotal < 0 ? corNeg : corPos}">${formatarMoeda(valorTotal)}</span>
    </p>
  `;

  salvarNoStorage();
}

/* ===== AÇÕES ===== */
window.editarLancamento = (i) => {
  const it = listaLancamentos[i];
  if (!it) return;
  window.adicionarEntrada(it, i);
};

window.excluirLancamento = (i) => {
  const it = listaLancamentos[i];
  if (!it) return;

  if (!confirm(`Excluir este lançamento do caixa "${formatarNomeCaixa(caixaAtiva)}" (e o histórico deste ponto)?`)) return;

  const key = normalizarPonto(it.ponto);
  historicoRaw = historicoRaw.filter(e => normalizarPonto(e.ponto) !== key);
  rebuildAgregadoFromRaw();

  salvarNoStorage();
  atualizarLista();
  window.toast?.success?.("Lançamento removido.");
};

/* ===== MODAL ===== */
function abrirModal(html){
  const conteudo = document.getElementById("conteudo-relatorio");
  const modal = document.getElementById("modal-relatorio");
  if (!conteudo || !modal) return;

  conteudo.innerHTML = html;
  modal.classList.add("aberta");

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

window.fecharRelatorio = function(){
  const modal = document.getElementById("modal-relatorio");
  if (!modal) return;
  modal.classList.remove("aberta");
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
};

/* ===== RELATÓRIO DO CAIXA ATUAL ===== */
window.visualizarRelatorio = function(){
  if (!caixaAtiva){
    window.toast?.error?.("crie um caixa antes de visualizar o relatório.");
    return;
  }

  const dataIso = document.getElementById("data")?.value || "";
  let dataFmt = "-";
  if (dataIso){
    const [y, m, d] = dataIso.split("-");
    const dt = new Date(+y, +m - 1, +d);
    const dia = dt.toLocaleDateString("pt-BR", { weekday:"long" });
    dataFmt = `${d}/${m}/${y} (${dia})`;
  }

  const valorInicial = parseValor(document.getElementById("valorInicial")?.value || 0);
  const totalEntrada = listaLancamentos.reduce((s, e) => s + (Number(e.dinheiro) || 0), 0);
  const totalSaida   = listaLancamentos.reduce((s, e) => s + (Number(e.saida) || 0), 0);
  const valorTotal   = valorInicial + totalEntrada - totalSaida;
  const totalSub     = totalEntrada - totalSaida;

  const linhas = listaLancamentos.map(e => {
    const sub = (Number(e.dinheiro) || 0) - (Number(e.saida) || 0);
    return `<tr>
      <td style="text-transform:lowercase; padding:8px 6px; border-bottom:1px solid #eee;">${textoSeguro(e.ponto)}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;">${e.dinheiro ? `<span style="color:${corPos}">${formatarMoeda(e.dinheiro)}</span>` : "-"}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;">${e.saida ? `<span style="color:${corNeg}">-${formatarMoeda(e.saida)}</span>` : "-"}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; font-weight:700; ${sub < 0 ? `color:${corNeg}` : `color:${corPos}` }">${formatarMoeda(sub)}</td>
    </tr>`;
  }).join("");

  const html = `
    <button onclick="fecharRelatorio()"
      style="position:fixed; top:10px; right:14px; z-index:9999;
             background:transparent; border:none; padding:0;
             font-size:28px; line-height:1; color:${roxo}; cursor:pointer;">
      ×
    </button>

    <div style="font-family: Arial; font-size:14px; padding:16px;">
      <h3 style="color:${roxo}; text-align:center; margin:0 0 10px;">Resumo do Caixa</h3>

      <div style="margin:0 0 10px;">
        <p><strong>Caixa:</strong> ${textoSeguro(formatarNomeCaixa(caixaAtiva))}</p>
        <p><strong>Data:</strong> ${textoSeguro(dataFmt)}</p>

        <p><strong>Valor Inicial:</strong>
          <span style="color:${valorInicial < 0 ? corNeg : corPos}">${formatarMoeda(valorInicial)}</span>
        </p>

        <p><strong>Entrada:</strong>
          <span style="color:${corPos}">${formatarMoeda(totalEntrada)}</span>
        </p>

        <p><strong>Saída:</strong>
          <span style="color:${corNeg}">-${formatarMoeda(totalSaida)}</span>
        </p>

        <p><strong>Valor Total:</strong>
          <span style="color:${valorTotal < 0 ? corNeg : corPos}">${formatarMoeda(valorTotal)}</span>
        </p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff;">
        <thead>
          <tr style="background:#f2f2f7">
            <th style="text-align:left;  padding:8px 6px;">Cliente</th>
            <th style="text-align:right; padding:8px 6px;">Entrada</th>
            <th style="text-align:right; padding:8px 6px;">Saída</th>
            <th style="text-align:right; padding:8px 6px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${linhas || `<tr><td colspan="4" style="text-align:center; padding:12px;">Sem entradas.</td></tr>`}
        </tbody>
        <tfoot>
          <tr style="background:#f2f2f7; font-weight:700">
            <td style="text-align:left;  padding:8px 6px;">Total</td>
            <td style="text-align:right; padding:8px 6px; color:${corPos}">${formatarMoeda(totalEntrada)}</td>
            <td style="text-align:right; padding:8px 6px; color:${corNeg}">-${formatarMoeda(totalSaida)}</td>
            <td style="text-align:right; padding:8px 6px; ${(totalSub) < 0 ? `color:${corNeg}` : `color:${corPos}` }">${formatarMoeda(totalSub)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  abrirModal(html);
};

/* ===== RELATÓRIO TOTAL ===== */
window.visualizarRelatorioTotal = function(){
  const caixas = (dadosApp.caixas || []).filter(Boolean);

  if (!caixas.length){
    window.toast?.error?.("crie ao menos um caixa antes de visualizar o relatório total.");
    return;
  }

  let somaInicial = 0;
  let somaEntrada = 0;
  let somaSaida = 0;
  let somaTotal = 0;

  const linhas = caixas.map(nomeCaixa => {
    const resumo = calcularResumoDoCaixa(nomeCaixa);

    somaInicial += resumo.valorInicial;
    somaEntrada += resumo.entrada;
    somaSaida += resumo.saida;
    somaTotal += resumo.valorTotal;

    return `<tr>
      <td style="padding:8px 6px; border-bottom:1px solid #eee; text-transform:lowercase;">${textoSeguro(formatarNomeCaixa(nomeCaixa))}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;">${resumo.data ? textoSeguro(formatarDataTela(resumo.data)) : "-"}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; color:${resumo.valorInicial < 0 ? corNeg : corPos};">${formatarMoeda(resumo.valorInicial)}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; color:${corPos};">${formatarMoeda(resumo.entrada)}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; color:${corNeg};">-${formatarMoeda(resumo.saida)}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; font-weight:700; color:${resumo.valorTotal < 0 ? corNeg : corPos};">${formatarMoeda(resumo.valorTotal)}</td>
    </tr>`;
  }).join("");

  const html = `
    <button onclick="fecharRelatorio()"
      style="position:fixed; top:10px; right:14px; z-index:9999;
             background:transparent; border:none; padding:0;
             font-size:28px; line-height:1; color:${roxo}; cursor:pointer;">
      ×
    </button>

    <div style="font-family: Arial; font-size:14px; padding:16px;">
      <h3 style="color:${roxo}; text-align:center; margin:0 0 12px;">Relatório Total dos Caixas</h3>

      <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff;">
        <thead>
          <tr style="background:#f2f2f7">
            <th style="text-align:left; padding:8px 6px;">Caixa</th>
            <th style="text-align:right; padding:8px 6px;">Data</th>
            <th style="text-align:right; padding:8px 6px;">Inicial</th>
            <th style="text-align:right; padding:8px 6px;">Entrada</th>
            <th style="text-align:right; padding:8px 6px;">Saída</th>
            <th style="text-align:right; padding:8px 6px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
        <tfoot>
          <tr style="background:#f2f2f7; font-weight:700">
            <td colspan="2" style="text-align:left; padding:8px 6px;">Total Geral</td>
            <td style="text-align:right; padding:8px 6px; color:${somaInicial < 0 ? corNeg : corPos};">${formatarMoeda(somaInicial)}</td>
            <td style="text-align:right; padding:8px 6px; color:${corPos};">${formatarMoeda(somaEntrada)}</td>
            <td style="text-align:right; padding:8px 6px; color:${corNeg};">-${formatarMoeda(somaSaida)}</td>
            <td style="text-align:right; padding:8px 6px; color:${somaTotal < 0 ? corNeg : corPos};">${formatarMoeda(somaTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  abrirModal(html);
};

/* ===== HISTÓRICO ===== */
window.visualizarHistorico = function(index){
  const it = listaLancamentos[index];
  if (!it) return;

  const key = normalizarPonto(it.ponto);
  const itens = historicoRaw.filter(e => normalizarPonto(e.ponto) === key);

  const linhas = itens.map(e => {
    let entrada = Number(e.dinheiro) || 0;
    let saida   = Number(e.saida) || 0;

    if (entrada < 0) {
      saida += Math.abs(entrada);
      entrada = 0;
    }

    const sub = entrada - saida;

    return `<tr>
      <td style="text-align:left; padding:8px 6px; border-bottom:1px solid #eee;">${textoSeguro(formatarDataHora(e.ts))}</td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;">
        ${entrada ? `<span style="color:${corPos}">${formatarMoeda(entrada)}</span>` : "-"}
      </td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee;">
        ${saida ? `<span style="color:${corNeg}">-${formatarMoeda(saida)}</span>` : "-"}
      </td>
      <td style="text-align:right; padding:8px 6px; border-bottom:1px solid #eee; font-weight:700; ${sub < 0 ? `color:${corNeg}` : `color:${corPos}` }">
        ${formatarMoeda(sub)}
      </td>
    </tr>`;
  }).join("");

  const html = `
    <button onclick="fecharRelatorio()"
      style="position:fixed; top:10px; right:14px; z-index:9999;
             background:transparent; border:none; padding:0;
             font-size:28px; line-height:1; color:${roxo}; cursor:pointer;">
      ×
    </button>

    <div style="font-family: Arial; font-size:14px; padding:16px;">
      <h3 style="color:${roxo}; text-align:center; margin:0 0 10px;">Histórico — ${textoSeguro(it.ponto)}</h3>
      <p><strong>Caixa:</strong> ${textoSeguro(formatarNomeCaixa(caixaAtiva))}</p>

      <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff;">
        <thead>
          <tr style="background:#f2f2f7">
            <th style="text-align:left;  padding:8px 6px;">Data</th>
            <th style="text-align:right; padding:8px 6px;">Entrada</th>
            <th style="text-align:right; padding:8px 6px;">Saída</th>
            <th style="text-align:right; padding:8px 6px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${linhas || `<tr><td colspan="4" style="text-align:center; padding:12px;">Sem entradas.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  abrirModal(html);
};

/* ===== LIMPAR ===== */
window.limparLancamentos = function(){
  if (!caixaAtiva){
    window.toast?.error?.("não há caixa para limpar.");
    return;
  }

  if (!confirm(`Deseja realmente limpar todos os lançamentos e valores do caixa "${formatarNomeCaixa(caixaAtiva)}"?`)) return;

  listaLancamentos.length = 0;
  historicoRaw = [];

  const dados = getDadosCaixaAtual();
  dados.historicoRaw = [];
  dados.data = getHojeIso();
  dados.valorInicial = "";

  const d  = document.getElementById("data");
  const vi = document.getElementById("valorInicial");
  if (d) d.value = dados.data;
  if (vi) vi.value = "";

  const box = document.getElementById("container-nova-entrada");
  if (box) box.innerHTML = "";

  salvarNoStorage();
  atualizarLista();
  window.toast?.success?.("Caixa limpo.");

};
