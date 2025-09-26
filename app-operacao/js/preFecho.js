// preFecho.js — App Operação (Pré Fecho)
// v2025-09-24

import { inicializarPagina } from "../../common/js/navegacao.js";

/* ===========================
   Inicialização da página
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Pré Fecho", { mostrarVoltar: true });

  // Carregar estado salvo
  carregarDoStorage();

  // Listeners principais
  document.getElementById("btnAdicionar")?.addEventListener("click", () => {
    adicionarMaquina();
    salvarNoStorage();
    atualizarTotais();
  });

  document.getElementById("btnRelatorio")?.addEventListener("click", () => {
    abrirRelatorio();
  });

  const ponto = document.getElementById("ponto");
  if (ponto) {
    ponto.addEventListener("input", () => {
      // nome do ponto como digitado (para pré-fecho manter padrão visual), mas pode aplicar .toLowerCase() se preferir
      salvarNoStorage();
    });
  }

  const fechar = () => fecharModal();
  document.getElementById("btnFecharModal")?.addEventListener("click", fechar);
  document.getElementById("btnFecharModal2")?.addEventListener("click", fechar);
  document.getElementById("modalRelatorio")?.addEventListener("click", (e) => {
    if (e.target?.id === "modalRelatorio") fechar();
  });
});

/* ===========================
   Utilidades de moeda/parse
=========================== */
function formatarMoedaBR(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}
function parseNumeroCru(v) {
  // aceita só números; se vier vazio, vira 0
  if (v === null || v === undefined) return 0;
  const limp = String(v).replace(/[^\d-]/g, "");
  return limp ? parseInt(limp, 10) : 0;
}

/* ===========================
   Estado e Storage
=========================== */
const STORAGE_KEY = "prefecho_estado_v2";

function estadoVazio() {
  return {
    ponto: "",
    maquinas: [] // { id, selo, entAnt, entAtual, saiAnt, saiAtual }
  };
}

function obterEstado() {
  const elPonto = document.getElementById("ponto");
  const ponto = elPonto ? elPonto.value.trim() : "";

  const maquinas = [];
  document.querySelectorAll(".card-maquina").forEach((card) => {
    const id = card.dataset.id;
    const selo = card.querySelector(".inp-selo")?.value.trim().toUpperCase() || "";
    const entAnt = parseNumeroCru(card.querySelector(".inp-ent-ant")?.value);
    const entAtual = parseNumeroCru(card.querySelector(".inp-ent-atual")?.value);
    const saiAnt = parseNumeroCru(card.querySelector(".inp-sai-ant")?.value);
    const saiAtual = parseNumeroCru(card.querySelector(".inp-sai-atual")?.value);
    maquinas.push({ id, selo, entAnt, entAtual, saiAnt, saiAtual });
  });

  return { ponto, maquinas };
}

function salvarNoStorage() {
  const dados = obterEstado();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function carregarDoStorage() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  const dados = salvo ? JSON.parse(salvo) : estadoVazio();

  // ponto
  const elPonto = document.getElementById("ponto");
  if (elPonto) elPonto.value = dados.ponto || "";

  // máquinas
  limparLista();
  (dados.maquinas || []).forEach((m) => montarCardMaquina(m));
  atualizarTotais();
}

/* ===========================
   Dom - Máquinas
=========================== */
let contadorId = Date.now();

function limparLista() {
  const lista = document.getElementById("listaMaquinas");
  if (lista) lista.innerHTML = "";
}

function adicionarMaquina() {
  const nova = {
    id: `m_${contadorId++}`,
    selo: "",
    entAnt: 0, entAtual: 0,
    saiAnt: 0, saiAtual: 0
  };
  montarCardMaquina(nova);
}

function montarCardMaquina(m) {
  const lista = document.getElementById("listaMaquinas");
  if (!lista) return;

  const card = document.createElement("div");
  card.className = "card-maquina";
  card.dataset.id = m.id;

  card.innerHTML = `
    <div class="linha-topo">
      <div class="selo-wrap">
        <span class="rotulo-inline">Selo:</span>
        <input type="text" class="input-linha inp-selo" placeholder="EX: ABC123" />
      </div>
      <button class="btn-menor btn-remover" title="Remover máquina">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>

    <div class="grade">
      <div class="col">
        <h4>Relógios Anteriores</h4>
        <div class="linha-input">
          <label>Entrada</label>
          <input class="input-linha inp-ent-ant" inputmode="numeric" placeholder="0"/>
        </div>
        <div class="linha-input">
          <label>Saída</label>
          <input class="input-linha inp-sai-ant" inputmode="numeric" placeholder="0"/>
        </div>
      </div>

      <div class="col">
        <h4>Relógios Atuais</h4>
        <div class="linha-input">
          <label>Entrada</label>
          <input class="input-linha inp-ent-atual" inputmode="numeric" placeholder="0"/>
        </div>
        <div class="linha-input">
          <label>Saída</label>
          <input class="input-linha inp-sai-atual" inputmode="numeric" placeholder="0"/>
        </div>
      </div>

      <div class="col">
        <h4>Resultado</h4>
        <div class="resultado">
          <span>Valor (R$)</span>
          <span class="res-valor">R$ 0,00</span>
        </div>
      </div>
    </div>
  `;

  // Preencher com valores existentes
  card.querySelector(".inp-selo").value = m.selo || "";
  card.querySelector(".inp-ent-ant").value = m.entAnt ? String(m.entAnt) : "";
  card.querySelector(".inp-ent-atual").value = m.entAtual ? String(m.entAtual) : "";
  card.querySelector(".inp-sai-ant").value = m.saiAnt ? String(m.saiAnt) : "";
  card.querySelector(".inp-sai-atual").value = m.saiAtual ? String(m.saiAtual) : "";

  // Listeners
  const onChange = () => {
    atualizarResultadoCard(card);
    salvarNoStorage();
    atualizarTotais();
  };

  card.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", onChange);
    inp.addEventListener("blur", onChange);
  });

  card.querySelector(".btn-remover").addEventListener("click", () => {
    card.remove();
    salvarNoStorage();
    atualizarTotais();
  });

  lista.appendChild(card);
  atualizarResultadoCard(card);
}

function calcularResultadoMaquina({ entAnt, entAtual, saiAnt, saiAtual }) {
  // Diferenças de relógio (crus)
  const diffEntrada = parseNumeroCru(entAtual) - parseNumeroCru(entAnt);
  const diffSaida   = parseNumeroCru(saiAtual) - parseNumeroCru(saiAnt);

  // Política acordada: dois últimos dígitos = centavos
  // Valor líquido = (Saídas - Entradas) / 100
  const valor = (diffSaida - diffEntrada) / 100;

  // Só começa a considerar quando houver valores "atuais" informados
  const temAtuais = parseNumeroCru(entAtual) > 0 || parseNumeroCru(saiAtual) > 0;
  return temAtuais ? valor : 0;
}

function atualizarResultadoCard(card) {
  const selo = card.querySelector(".inp-selo")?.value.trim().toUpperCase() || "";

  const entAnt = parseNumeroCru(card.querySelector(".inp-ent-ant")?.value);
  const entAtual = parseNumeroCru(card.querySelector(".inp-ent-atual")?.value);
  const saiAnt = parseNumeroCru(card.querySelector(".inp-sai-ant")?.value);
  const saiAtual = parseNumeroCru(card.querySelector(".inp-sai-atual")?.value);

  const valor = calcularResultadoMaquina({ entAnt, entAtual, saiAnt, saiAtual });
  const el = card.querySelector(".res-valor");
  if (!el) return;

  el.textContent = formatarMoedaBR(valor);
  el.classList.toggle("valor-pos", valor >= 0.005);
  el.classList.toggle("valor-neg", valor <= -0.005);

  // normaliza selo já em maiúsculo
  const inpSelo = card.querySelector(".inp-selo");
  if (inpSelo && selo !== inpSelo.value) inpSelo.value = selo;
}

function atualizarTotais() {
  let total = 0;
  document.querySelectorAll(".card-maquina").forEach((card) => {
    const entAnt = parseNumeroCru(card.querySelector(".inp-ent-ant")?.value);
    const entAtual = parseNumeroCru(card.querySelector(".inp-ent-atual")?.value);
    const saiAnt = parseNumeroCru(card.querySelector(".inp-sai-ant")?.value);
    const saiAtual = parseNumeroCru(card.querySelector(".inp-sai-atual")?.value);
    total += calcularResultadoMaquina({ entAnt, entAtual, saiAnt, saiAtual });
  });

  const elTotal = document.getElementById("totalValor");
  if (elTotal) {
    elTotal.textContent = formatarMoedaBR(total);
    elTotal.classList.toggle("valor-pos", total >= 0.005);
    elTotal.classList.toggle("valor-neg", total <= -0.005);
  }
}

/* ===========================
   Relatório (Modal)
=========================== */
function abrirRelatorio() {
  const { ponto, maquinas } = obterEstado();
  const conteudo = document.getElementById("relatorioConteudo");
  if (!conteudo) return;

  // Monta linhas apenas para máquinas que tenham algum valor preenchido
  const linhas = maquinas
    .filter((m) => {
      const temSelo = (m.selo || "").trim().length > 0;
      const temValor =
        m.entAnt || m.entAtual || m.saiAnt || m.saiAtual;
      return temSelo || temValor;
    })
    .map((m) => {
      const valor = calcularResultadoMaquina(m);
      const cls = valor >= 0.005 ? "valor-pos" : (valor <= -0.005 ? "valor-neg" : "");
      return `
        <div class="rel-linha">
          <div class="rel-topo">
            <strong>Selo: ${escapeHtml(m.selo || "-")}</strong>
            <strong class="${cls}">${formatarMoedaBR(valor)}</strong>
          </div>
          <table class="rel-tabela">
            <thead>
              <tr>
                <th></th>
                <th>Entrada</th>
                <th>Saída</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Anterior</td>
                <td>${numVisu(m.entAnt)}</td>
                <td>${numVisu(m.saiAnt)}</td>
              </tr>
              <tr>
                <td>Atual</td>
                <td>${numVisu(m.entAtual)}</td>
                <td>${numVisu(m.saiAtual)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  // Total final
  const total = maquinas.reduce((acc, m) => acc + calcularResultadoMaquina(m), 0);
  const clsTotal = total >= 0.005 ? "valor-pos" : (total <= -0.005 ? "valor-neg" : "");

  conteudo.innerHTML = `
    <div style="margin-bottom:8px">
      <strong>Nome do Ponto:</strong> ${escapeHtml(ponto || "-")}
    </div>
    ${linhas || `<div class="rel-linha">Nenhuma máquina preenchida.</div>`}
    <div class="rel-linha" style="font-size:16px;font-weight:800;display:flex;justify-content:space-between;align-items:center">
      <span>TOTAL</span>
      <span class="${clsTotal}">${formatarMoedaBR(total)}</span>
    </div>
  `;

  abrirModal();
}

function numVisu(n) {
  const v = parseNumeroCru(n);
  return v === 0 ? "-" : String(v);
}

function abrirModal() {
  document.getElementById("modalRelatorio")?.classList.add("aberta");
}
function fecharModal() {
  document.getElementById("modalRelatorio")?.classList.remove("aberta");
}

/* ===========================
   Helpers
=========================== */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
