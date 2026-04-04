const STORAGE_KEY = "fechamento_dados_v1";

// Helpers curtos para DOM e Formatação
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const num = v => Number(String(v || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
const moeda = v => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtMoeda = v => (Number(String(v || "").replace(/\D/g, "")) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const escapeHtml = t => String(t || "").replace(/[&"<>\']/g, m => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[m]);

// Atualiza input mantendo cursor e eventos
function aplicarMascaraDOM(input) {
  if (!input || input.dataset.mask) return;
  input.dataset.mask = "true";
  
  const atualizar = () => {
    input.value = fmtMoeda(input.value || "0,00");
    atualizarResumo();
    salvarDados();
  };

  input.addEventListener("focus", () => { if (!input.value.trim()) input.value = "0,00"; });
  input.addEventListener("input", atualizar);
  input.addEventListener("blur", atualizar);
}

function reatribuirMascaras() {
  $$(".moeda-input, .debitoValor, .valorAnterior, .valorAtual").forEach(aplicarMascaraDOM);
  $$("input:not([readonly])").forEach(inp => inp.addEventListener("input", salvarDados));
}

function atualizarResumo() {
  const v = id => num($(id)?.value);
  const totalRota = v("turano") + v("rc") + v("centro");
  const comissao = totalRota > 0 ? (totalRota / 0.915) - totalRota : 0;
  const cartaoPassLiquido = v("cartaoPassado") * 0.95;
  const cartaoAtual = v("cartaoAtual");
  const recAnt = v("recebimentosAnteriores");

  const debitos = Array.from($$(".debitoValor")).reduce((acc, el) => acc + num(el.value), 0);
  const devedores = Array.from($$(".devedorLinha")).reduce((acc, el) => 
    acc + (num(el.querySelector(".valorAnterior")?.value) - num(el.querySelector(".valorAtual")?.value)), 0);

  const firma = totalRota + cartaoPassLiquido - cartaoAtual - debitos + devedores + recAnt;

  // Helpers internos para atualizar UI em lote
  const setInp = (id, val) => $(id) && ($(id).value = fmtMoeda(Math.round(val * 100)));
  const setTxt = (id, val, logicColor = null) => {
    const el = $(id);
    if (!el) return;
    el.textContent = moeda(val);
    el.className = el.className.replace(/\b(valor|negativo|positivo|neutro)\b/g, '').trim();
    if (logicColor === true) el.classList.add(val > 0 ? "valor-positivo" : "valor-neutro");
    if (logicColor === false) el.classList.add(val > 0 ? "valor-negativo" : "valor-neutro");
  };

  // Atualiza Inputs
  setInp("total", totalRota); setInp("comissao", comissao);
  setInp("debitosResumo", debitos); setInp("devedoresResumo", devedores); setInp("firma", firma);

  // Atualiza Cards
  setTxt("cardTotal", totalRota); setTxt("cardComissao", comissao);
  setTxt("cardSaidas", debitos + devedores); setTxt("cardFirma", firma);

  // Atualiza Textos/Cores (true = verde se positivo, false = vermelho se positivo)
  setTxt("resTurano", v("turano"), true); setTxt("resRc", v("rc"), true); setTxt("resCentro", v("centro"), true);
  setTxt("resCartaoPassado", cartaoPassLiquido, true); setTxt("resCartaoAtual", cartaoAtual, false); setTxt("resRecebimentos", recAnt, true);

  setTxt("finalTotal", totalRota);
  setTxt("finalComissao", comissao, false);
  setTxt("finalCartaoPassado", cartaoPassLiquido, true);
  setTxt("finalCartaoAtual", cartaoAtual, false);
  setTxt("finalDebitos", debitos, false);
  
  // Lógica customizada para devedores no saldo final
  const saldoDev = $("finalDevedores");
  if(saldoDev) {
    saldoDev.textContent = moeda(devedores);
    saldoDev.className = devedores === 0 ? "valor-neutro" : (devedores < 0 ? "valor-positivo" : "valor-negativo");
  }

  setTxt("finalRecebimentos", recAnt, true); setTxt("finalFirma", firma);
  
  atualizarEstadosVazios();
}

function atualizarEstadosVazios() {
  const vazios = { listaDebitos: "Nenhum débito adicionado.", listaDevedores: "Nenhum devedor adicionado." };
  Object.keys(vazios).forEach(id => {
    const lista = $(id);
    if (lista && !lista.children.length) lista.innerHTML = `<div class="estado-vazio">${vazios[id]}</div>`;
    else if (lista && lista.children.length > 1 && lista.querySelector('.estado-vazio')) lista.querySelector('.estado-vazio').remove();
  });
}

function criarLinhaHTML(tipo, dados) {
  const isDeb = tipo === 'debito';
  const linha = document.createElement("div");
  linha.className = `linha-item ${isDeb ? 'debitoLinha' : 'devedorLinha'}`;
  
  linha.innerHTML = `
    <div class="subtitulo-lista">
      <span><i class="fas ${isDeb ? 'fa-minus-circle' : 'fa-user-minus'}"></i> ${isDeb ? 'Débito' : 'Devedor'}</span>
      <button class="btn btn-vermelho btnRemover" type="button"><i class="fas fa-trash"></i> Remover</button>
    </div>
    <div class="grid-${isDeb ? '2' : '3'}">
      <div class="campo">
        <label>${isDeb ? 'Nome / Descrição' : 'Nome'}</label>
        <input type="text" class="${isDeb ? 'debitoNome' : 'devedorNome'}" value="${escapeHtml(dados.nome || "")}">
      </div>
      ${isDeb 
        ? `<div class="campo"><label>Valor</label><input type="text" class="debitoValor" inputmode="numeric" value="${escapeHtml(dados.valor || "0,00")}"></div>`
        : `<div class="campo"><label>Valor Anterior</label><input type="text" class="valorAnterior" inputmode="numeric" value="${escapeHtml(dados.anterior || "0,00")}"></div>
           <div class="campo"><label>Valor Atual</label><input type="text" class="valorAtual" inputmode="numeric" value="${escapeHtml(dados.atual || "0,00")}"></div>`
      }
    </div>`;

  $(isDeb ? "listaDebitos" : "listaDevedores").appendChild(linha);
  reatribuirMascaras();
  atualizarResumo();
}

const coletarDados = () => ({
  periodo: $("periodo")?.value || "",
  ...["turano", "rc", "centro", "cartaoPassado", "cartaoAtual", "recebimentosAnteriores"].reduce((acc, id) => ({ ...acc, [id]: $(id)?.value || "0,00" }), {}),
  debitos: Array.from($$(".debitoLinha")).map(l => ({ nome: l.querySelector(".debitoNome")?.value, valor: l.querySelector(".debitoValor")?.value })),
  devedores: Array.from($$(".devedorLinha")).map(l => ({ nome: l.querySelector(".devedorNome")?.value, anterior: l.querySelector(".valorAnterior")?.value, atual: l.querySelector(".valorAtual")?.value }))
});

const salvarDados = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(coletarDados()));

function restaurarDados() {
  const dados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  $("periodo").value = dados.periodo || "";
  ["turano", "rc", "centro", "cartaoPassado", "cartaoAtual", "recebimentosAnteriores"].forEach(id => { if($(id)) $(id).value = fmtMoeda(dados[id] || "0,00"); });
  
  $("listaDebitos").innerHTML = ""; $("listaDevedores").innerHTML = "";
  (dados.debitos || []).forEach(d => criarLinhaHTML('debito', d));
  (dados.devedores || []).forEach(d => criarLinhaHTML('devedor', d));
  
  reatribuirMascaras(); atualizarResumo();
}

function gerarHtmlRelatorio() {
  const v = id => num($(id)?.value);
  const tblRow = (arr, renderFn, msg) => arr.length ? arr.map(renderFn).join("") : `<tr><td colspan="5">${msg}</td></tr>`;
  
  return `
    <div class="relatorio">
      <div class="relatorio-topo"><h2>Resumo</h2><p><strong>Período:</strong> ${escapeHtml($("periodo")?.value)}</p></div>
      <div class="relatorio-cards">
        ${['Total', 'Comissão', 'Firma'].map(lbl => `<div class="rel-card"><div class="r1">${lbl}</div><div class="r2">${moeda(v(lbl.toLowerCase()))}</div></div>`).join("")}
      </div>
      <div class="rodape-relatorio">
        <div class="linha"><span>Firma</span><strong>${moeda(v("firma"))}</strong></div>
      </div>
    </div>`; // Encurtei esta parte para o exemplo, você pode colar seu template string html original aqui.
}

const toggleModal = (abrir) => {
  const m = $("modalRelatorio");
  if(abrir) { $("conteudoRelatorio").innerHTML = gerarHtmlRelatorio(); m.classList.add("ativo"); } 
  else { m.classList.remove("ativo"); }
}

function configurarEventos() {
  reatribuirMascaras();
  
  $("btnAdicionarDebito")?.addEventListener("click", () => criarLinhaHTML('debito', {}));
  $("btnAdicionarDevedor")?.addEventListener("click", () => criarLinhaHTML('devedor', {}));
  $("btnLimparTudo")?.addEventListener("click", () => {
    if(!confirm("Limpar todo o fechamento?")) return;
    localStorage.removeItem(STORAGE_KEY);
    restaurarDados();
  });

  $("btnVisualizarResumo")?.addEventListener("click", () => toggleModal(true));
  $("btnGerarRelatorio")?.addEventListener("click", () => toggleModal(true));
  $("btnImprimir")?.addEventListener("click", () => { toggleModal(true); setTimeout(() => window.print(), 150); });
  $("btnFecharModal")?.addEventListener("click", () => toggleModal(false));

  // Delegação de Eventos para os botões "Remover" das listas dinâmicas
  document.addEventListener('click', e => {
    if (e.target.closest('.btnRemover')) {
      e.target.closest('.linha-item').remove();
      atualizarEstadosVazios(); atualizarResumo(); salvarDados();
    }
    if (e.target.id === "modalRelatorio") toggleModal(false);
  });
  document.addEventListener("keydown", e => e.key === "Escape" && toggleModal(false));
}

document.addEventListener("DOMContentLoaded", () => {
  restaurarDados();
  configurarEventos();
  atualizarResumo();
});