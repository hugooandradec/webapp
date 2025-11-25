// ================================
// CÁLCULO DE RETENÇÃO — LAYOUT PRÉ-FECHO (COMPACTO)
// ================================

const RET_STORAGE = "retencao_dados_v1";
let retContador = 0;

document.addEventListener("DOMContentLoaded", () => {
  const btnAdd = document.getElementById("btnAdicionar");
  const btnRel = document.getElementById("btnRelatorio");
  const btnLimpar = document.getElementById("btnLimpar");
  const lista = document.getElementById("listaMaquinas");
  const totalEl = document.getElementById("totalGeral");

  const modal = document.getElementById("modalRet");
  const btnFecharModa = document.getElementById("btnFecharModal");
  const relConteudo = document.getElementById("relConteudo");

  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");

  if (btnAdd) btnAdd.addEventListener("click", () => {
    adicionarMaquina(lista, totalEl);
    salvarRetencao();
  });

  if (btnRel) btnRel.addEventListener("click", () => {
    abrirRelatorio(inputData, inputPonto, totalEl, relConteudo, modal);
  });

  if (btnLimpar) btnLimpar.addEventListener("click", () => {
    limparTudo(lista, totalEl);
  });

  if (btnFecharModa) btnFecharModa.addEventListener("click", () => {
    modal.classList.remove("aberta");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("aberta");
  });

  carregarRetencao(lista, totalEl);
});


// ===============================
//   ADICIONAR MÁQUINA  
// ===============================

function adicionarMaquina(lista, totalEl, dados = null) {
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

    <div class="linha">
      <label>Selo:</label>
      <input type="text" class="ret-selo" placeholder="selo">
    </div>

    <div class="linha">
      <label>Jogo:</label>
      <input type="text" class="ret-jogo" placeholder="jogo">
    </div>

    <div class="linha2">
      <input type="number" class="ret-entrada" placeholder="Entrada" inputmode="numeric">
      <input type="number" class="ret-saida" placeholder="Saída" inputmode="numeric">
    </div>

    <div style="margin-top:8px;font-weight:700;">
      <span class="ret-resumo">E: 0 | S: 0 | Ret: 0%</span>
    </div>
  `;

  lista.appendChild(card);

  const btnRem = card.querySelector(".btn-remover");
  const selo = card.querySelector(".ret-selo");
  const jogo = card.querySelector(".ret-jogo");
  const entrada = card.querySelector(".ret-entrada");
  const saida = card.querySelector(".ret-saida");
  const resumo = card.querySelector(".ret-resumo");

  const atualizar = () => {
    const E = Number(entrada.value);
    const S = Number(saida.value);
    const ret = E > 0 ? ((E - S) / E) * 100 : 0;

    resumo.innerHTML = `E: ${E} | S: ${S} | Ret: ${ret.toFixed(1)}%`;
    salvarRetencao();
    atualizarTotalGeral(totalEl);
  };

  entrada.addEventListener("input", atualizar);
  saida.addEventListener("input", atualizar);
  selo.addEventListener("input", salvarRetencao);
  jogo.addEventListener("input", salvarRetencao);

  btnRem.addEventListener("click", () => {
    card.remove();
    salvarRetencao();
    atualizarTotalGeral(totalEl);
  });

  if (dados) {
    selo.value = dados.selo || "";
    jogo.value = dados.jogo || "";
    entrada.value = dados.entrada || "";
    saida.value = dados.saida || "";
    atualizar();
  }
}


// ===============================
//  TOTAL GERAL
// ===============================

function atualizarTotalGeral(totalEl) {
  let total = 0;

  document.querySelectorAll(".ret-resumo").forEach(span => {
    const txt = span.textContent;
    const m = txt.match(/E:\s*([0-9.]+)\s*\|\s*S:\s*([0-9.]+)/);
    if (!m) return;

    const E = Number(m[1]);
    const S = Number(m[2]);

    total += (E - S);
  });

  totalEl.innerHTML = `TOTAL: R$ ${total.toFixed(2)}`;
  totalEl.classList.remove("positivo", "negativo");
  if (total > 0) totalEl.classList.add("positivo");
  else if (total < 0) totalEl.classList.add("negativo");
}


// ===============================
//  RELATÓRIO (MODAL)
// ===============================

function abrirRelatorio(inputData, inputPonto, totalEl, relConteudo, modal) {
  const data = inputData.value || "-";
  const ponto = inputPonto.value || "-";

  let html = `
    <div><strong>DATA:</strong> ${data}</div>
    <div><strong>PONTO:</strong> ${ponto}</div>
    <hr>
  `;

  const cards = document.querySelectorAll(".card");

  if (!cards.length) {
    html += `<p>Nenhuma máquina lançada.</p>`;
  } else {
    cards.forEach((c, i) => {
      const selo = c.querySelector(".ret-selo").value || "-";
      const jogo = c.querySelector(".ret-jogo").value || "-";
      const entrada = c.querySelector(".ret-entrada").value || "0";
      const saida = c.querySelector(".ret-saida").value || "0";
      const ret = entrada > 0 ? (((entrada - saida) / entrada) * 100).toFixed(1) : "0";

      html += `
        <div class="bloco-ret">
          <strong>MÁQUINA ${i + 1}</strong><br>
          ${selo} — ${jogo}<br>
          E: ${entrada} | S: ${saida} | Ret: ${ret}%
        </div>
      `;
    });
  }

  html += `
    <hr>
    <div style="font-weight:900;text-align:right;">
      ${totalEl.innerHTML}
    </div>
  `;

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

function carregarRetencao(lista, totalEl) {
  const raw = localStorage.getItem(RET_STORAGE);
  if (!raw) return;

  const dados = JSON.parse(raw);

  document.getElementById("data").value = dados.data || "";
  document.getElementById("ponto").value = dados.ponto || "";

  if (dados.maquinas) {
    dados.maquinas.forEach(m =>
      adicionarMaquina(lista, totalEl, m)
    );
  }

  atualizarTotalGeral(totalEl);
}

function limparTudo(lista, totalEl) {
  if (!confirm("Excluir tudo?")) return;

  lista.innerHTML = "";
  localStorage.removeItem(RET_STORAGE);
  retContador = 0;

  atualizarTotalGeral(totalEl);
}
