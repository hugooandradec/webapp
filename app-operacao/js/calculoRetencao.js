// ================================
// CÁLCULO DE RETENÇÃO — LAYOUT PRÉ-FECHO (COMPACTO)
// ================================

const RET_STORAGE = "retencao_dados_v2";
let retContador = 0;

document.addEventListener("DOMContentLoaded", () => {
  const btnAdd = document.getElementById("btnAdicionar");
  const btnRel = document.getElementById("btnRelatorio");
  const btnLimpar = document.getElementById("btnLimpar");
  const lista = document.getElementById("listaMaquinas");

  const modal = document.getElementById("modalRet");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relConteudo = document.getElementById("relConteudo");

  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");

  btnAdd.addEventListener("click", () => {
    adicionarMaquina(lista);
    salvarRetencao();
  });

  btnRel.addEventListener("click", () => {
    abrirRelatorio(inputData, inputPonto, relConteudo, modal);
  });

  btnLimpar.addEventListener("click", () => {
    limparTudo(lista);
  });

  btnFecharModal.addEventListener("click", () => {
    modal.classList.remove("aberta");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("aberta");
  });

  carregarRetencao(lista);
});


// ===============================
//   ADICIONAR MÁQUINA  
// ===============================

function adicionarMaquina(lista, dados = null) {
  retContador++;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${retContador}</span>
      <button class="btn-remover" style="background:none;border:none;color:#777;">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>

    <div class="linha2x">
      <div class="linha">
        <label>Selo:</label>
        <input type="text" class="ret-selo">
      </div>

      <div class="linha">
        <label>Jogo:</label>
        <input type="text" class="ret-jogo">
      </div>
    </div>

    <div class="linha2x" style="margin-top:8px;">
      <input type="number" class="ret-entrada" placeholder="Entrada" inputmode="numeric">
      <input type="number" class="ret-saida" placeholder="Saída" inputmode="numeric">
    </div>

    <div style="margin-top:8px;font-weight:700;">
      <span class="ret-resumo">
        <span class="verde">E: 0</span> | 
        <span class="vermelho">S: 0</span> | 
        Ret: 0%
      </span>
    </div>
  `;

  lista.appendChild(card);

  const selo = card.querySelector(".ret-selo");
  const jogo = card.querySelector(".ret-jogo");
  const entrada = card.querySelector(".ret-entrada");
  const saida = card.querySelector(".ret-saida");
  const resumo = card.querySelector(".ret-resumo");

  const atualizar = () => {
    const E = Number(entrada.value);
    const S = Number(saida.value);
    const ret = E > 0 ? ((E - S) / E) * 100 : 0;

    resumo.innerHTML = `
      <span class="verde">E: ${E}</span> |
      <span class="vermelho">S: ${S}</span> |
      Ret: ${ret.toFixed(1)}%
    `;

    salvarRetencao();
  };

  entrada.addEventListener("input", atualizar);
  saida.addEventListener("input", atualizar);
  selo.addEventListener("input", salvarRetencao);
  jogo.addEventListener("input", salvarRetencao);

  card.querySelector(".btn-remover").addEventListener("click", () => {
    card.remove();
    salvarRetencao();
  });

  // Restaurar dados
  if (dados) {
    selo.value = dados.selo || "";
    jogo.value = dados.jogo || "";
    entrada.value = dados.entrada || "";
    saida.value = dados.saida || "";
    atualizar();
  }
}


// ===============================
//  RELATÓRIO
// ===============================

function abrirRelatorio(inputData, inputPonto, relConteudo, modal) {
  const data = inputData.value || "-";
  const ponto = inputPonto.value || "-";

  let html = `
    <div><strong>DATA:</strong> ${data}</div>
    <div><strong>PONTO:</strong> ${ponto}</div>
    <hr>
  `;

  const cards = document.querySelectorAll(".card");

  cards.forEach((c, i) => {
    const selo = c.querySelector(".ret-selo").value || "-";
    const jogo = c.querySelector(".ret-jogo").value || "-";
    const entrada = Number(c.querySelector(".ret-entrada").value || 0);
    const saida = Number(c.querySelector(".ret-saida").value || 0);
    const ret = entrada > 0 ? (((entrada - saida) / entrada) * 100).toFixed(1) : "0";

    html += `
      <div class="bloco-ret">
        <strong>MÁQUINA ${i + 1}</strong><br>
        ${selo} — ${jogo}<br>
        <span class="verde">E: ${entrada}</span> |
        <span class="vermelho">S: ${saida}</span> |
        Ret: ${ret}%
      </div>
    `;
  });

  relConteudo.innerHTML = html;
  modal.classList.add("aberta");
}


// ===============================
//  STORAGE
// ===============================

function salvarRetencao() {
  const data = document.getElementById("data").value;
  const ponto = document.getElementById("ponto").value;

  const maquinas = [];

  document.querySelectorAll(".card").forEach(card => {
    maquinas.push({
      selo: card.querySelector(".ret-selo").value,
      jogo: card.querySelector(".ret-jogo").value,
      entrada: card.querySelector(".ret-entrada").value,
      saida: card.querySelector(".ret-saida").value
    });
  });

  localStorage.setItem(RET_STORAGE, JSON.stringify({ data, ponto, maquinas }));
}

function carregarRetencao(lista) {
  const raw = localStorage.getItem(RET_STORAGE);
  if (!raw) return;

  const dados = JSON.parse(raw);

  document.getElementById("data").value = dados.data || "";
  document.getElementById("ponto").value = dados.ponto || "";

  if (dados.maquinas) {
    dados.maquinas.forEach(m => adicionarMaquina(lista, m));
  }
}

function limparTudo(lista) {
  if (!confirm("Excluir tudo?")) return;

  lista.innerHTML = "";
  localStorage.removeItem(RET_STORAGE);
  retContador = 0;
}
