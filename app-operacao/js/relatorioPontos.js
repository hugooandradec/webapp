// js/relatorioPontos.js
import { inicializarPagina } from "../../common/js/navegacao.js";

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Relatório de Pontos", "operacao");

  carregarPontosNosSelects();

  document.getElementById("btnProcessarPrint").onclick = processarPrint;
  document.getElementById("btnAprovar").onclick = aprovarFechamento;
  document.getElementById("btnDescartar").onclick = descartarExtracao;

  document.getElementById("btnGerarSemanal").onclick = gerarRelatorioSemanal;
  document.getElementById("btnGerarConsolidado").onclick = gerarRelatorioConsolidado;
  document.getElementById("btnDesfazer").onclick = desfazerUltimo;

  document.getElementById("fecharModal").onclick = fecharModal;
});

/* ===== STORAGE ===== */
const KEY = "relatorioPontos_registros";

function getRegistros() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function salvarRegistros(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

/* ===== 1. PROCESSAR PRINT ===== */
let extracaoAtual = null;

async function processarPrint() {
  const file = document.getElementById("inputPrint").files[0];
  if (!file) {
    alert("Escolha um print primeiro.");
    return;
  }

  // OCR externo (trecho futuro)
  const texto = await extrairTextoOCR(file);

  extracaoAtual = extrairRelatorioDoOcr(texto);

  mostrarExtracaoNaTela(extracaoAtual);
}

/* ===== OCR (placeholder) ===== */
async function extrairTextoOCR(file) {
  // Aqui depois você me manda 1 print e 1 texto OCR para calibrarmos.
  return "TEXTO_DE_EXEMPLO";
}

/* ===== 2. EXTRAIR DADOS DO TEXTO ===== */
function extrairRelatorioDoOcr(texto) {
  // 💜 Aqui será configurado quando você me mandar o OCR real.
  return {
    pontoChave: "exemplo",
    pontoExibicao: "Exemplo",
    periodo: { inicio: "2025-11-24", fim: "2025-11-30" },
    dataFechamento: "2025-11-30",
    maquinas: [
      { selo: "IE188", entrada: 1000, saida: 500, sobra: 500 }
    ],
    totais: { entrada: 1000, saida: 500, sobra: 500 }
  };
}

/* ===== 3. MOSTRAR PRÉ-VISUALIZAÇÃO ===== */
function mostrarExtracaoNaTela(data) {
  document.getElementById("previewExtracao").style.display = "block";
  document.getElementById("dadosExtraidos").innerHTML = `
    <strong>Ponto:</strong> ${data.pontoExibicao}<br>
    <strong>Período:</strong> ${data.periodo.inicio} até ${data.periodo.fim}<br><br>
    <strong>Máquinas:</strong><br>
    ${data.maquinas.map(m => `
      <div>
        <b>${m.selo}</b> – Entrada: R$ ${m.entrada.toFixed(2)} |
        Saída: R$ ${m.saida.toFixed(2)} |
        Sobra: R$ ${m.sobra.toFixed(2)}
      </div>
    `).join("")}
  `;
}

/* ===== 4. APROVAR FECHAMENTO ===== */
function aprovarFechamento() {
  if (!extracaoAtual) return;

  const registros = getRegistros();
  registros.push({
    ...extracaoAtual,
    id: Date.now(),
    aprovado: true,
    criadoEm: new Date().toISOString()
  });

  salvarRegistros(registros);

  alert("Fechamento salvo com sucesso!");

  extracaoAtual = null;
  document.getElementById("previewExtracao").style.display = "none";

  carregarPontosNosSelects();
}

/* DESCARTAR */
function descartarExtracao() {
  extracaoAtual = null;
  document.getElementById("previewExtracao").style.display = "none";
}

/* ===== 5. CARREGAR SELECTS ===== */
function carregarPontosNosSelects() {
  const registros = getRegistros();
  const pontos = [...new Set(registros.map(r => r.pontoChave))];

  const selects = ["selectPontoSemanal", "selectPontoConsolidado"];
  selects.forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = `<option value="">Selecione</option>`;
    pontos.forEach(p => {
      const item = registros.find(r => r.pontoChave === p);
      select.innerHTML += `<option value="${p}">${item.pontoExibicao}</option>`;
    });
  });

  carregarSemanas();
}

function carregarSemanas() {
  const ponto = document.getElementById("selectPontoSemanal").value;
  const selectSemana = document.getElementById("selectSemana");

  if (!ponto) {
    selectSemana.innerHTML = "<option value=''>Selecione</option>";
    return;
  }

  const registros = getRegistros().filter(r => r.pontoChave === ponto);

  selectSemana.innerHTML = "";
  registros.forEach(r => {
    const periodo = `${r.periodo.inicio} até ${r.periodo.fim}`;
    selectSemana.innerHTML += `<option value="${r.id}">${periodo}</option>`;
  });
}

/* ===== 6. RELATÓRIO SEMANAL ===== */
function gerarRelatorioSemanal() {
  const id = Number(document.getElementById("selectSemana").value);
  const registro = getRegistros().find(r => r.id === id);
  if (!registro) return;

  const html = montarHtmlRelatorio(registro, "Relatório Semanal");

  abrirModal(html);
}

/* ===== 7. RELATÓRIO CONSOLIDADO ===== */
function gerarRelatorioConsolidado() {
  const ponto = document.getElementById("selectPontoConsolidado").value;
  const qtd = Number(document.getElementById("selectQtdSemanas").value);

  const registros = getRegistros()
    .filter(r => r.pontoChave === ponto)
    .sort((a, b) => new Date(b.periodo.fim) - new Date(a.periodo.fim))
    .slice(0, qtd);

  if (registros.length === 0) return;

  const relatorio = consolidarRegistros(registros);

  const html = montarHtmlRelatorio(relatorio, `Consolidado (${qtd} semanas)`);

  abrirModal(html);
}

/* CONSOLIDADO: SOMA TUDO */
function consolidarRegistros(lista) {
  let totalEntrada = 0;
  let totalSaida = 0;
  let totalSobra = 0;

  const maquinas = {};

  lista.forEach(r => {
    totalEntrada += r.totais.entrada;
    totalSaida += r.totais.saida;
    totalSobra += r.totais.sobra;

    r.maquinas.forEach(m => {
      if (!maquinas[m.selo]) {
        maquinas[m.selo] = { selo: m.selo, entrada: 0, saida: 0, sobra: 0 };
      }
      maquinas[m.selo].entrada += m.entrada;
      maquinas[m.selo].saida += m.saida;
      maquinas[m.selo].sobra += m.sobra;
    });
  });

  return {
    pontoExibicao: lista[0].pontoExibicao,
    maquinas: Object.values(maquinas),
    totais: { entrada: totalEntrada, saida: totalSaida, sobra: totalSobra }
  };
}

/* ===== 8. HTML DO MODAL ===== */
function montarHtmlRelatorio(r, titulo) {
  return `
    <h2>${r.pontoExibicao} — ${titulo}</h2>

    <h3>Totais do Ponto</h3>
    Entrada: R$ ${r.totais.entrada.toFixed(2)}<br>
    Saída: R$ ${r.totais.saida.toFixed(2)}<br>
    Sobra: <b>R$ ${r.totais.sobra.toFixed(2)}</b><br><br>

    <h3>Máquinas</h3>
    ${r.maquinas.map(m => `
      <div style="margin-bottom:8px;">
        <b>${m.selo}</b> —
        Entrada: R$ ${m.entrada.toFixed(2)} |
        Saída: R$ ${m.saida.toFixed(2)} |
        Sobra: R$ ${m.sobra.toFixed(2)}
      </div>
    `).join("")}
  `;
}

/* ===== 9. DESFAZER ===== */
function desfazerUltimo() {
  const ponto = document.getElementById("selectPontoConsolidado").value;
  if (!ponto) return;

  let registros = getRegistros().filter(r => r.pontoChave === ponto);
  if (registros.length === 0) return;

  registros.sort((a, b) => new Date(b.periodo.fim) - new Date(a.periodo.fim));

  const ultimo = registros[0];

  const todos = getRegistros().filter(r => r.id !== ultimo.id);
  salvarRegistros(todos);

  alert("Último fechamento removido.");
  carregarPontosNosSelects();
}

/* ===== 10. MODAL ===== */
function abrirModal(html) {
  document.getElementById("modalConteudo").innerHTML = html;
  document.getElementById("modalRelatorio").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modalRelatorio").style.display = "none";
}
