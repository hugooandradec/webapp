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

  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      adicionarMaquina(lista);
      salvarRetencao();
    });
  }

  if (btnRel) {
    btnRel.addEventListener("click", () => {
      abrirRelatorio(inputData, inputPonto, relConteudo, modal);
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      limparTudo(lista);
    });
  }

  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", () => {
      modal.classList.remove("aberta");
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("aberta");
    });
  }

  // força ponto em maiúsculo ao digitar
  if (inputPonto) {
    inputPonto.addEventListener("input", () => {
      inputPonto.value = inputPonto.value.toUpperCase();
      salvarRetencao();
    });
  }

  carregarRetencao(lista);
});

// ====== helpers ======

function formatarReais(valor) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

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

    <div class="linha2x" style="margin-top:4px;">
      <input type="number" class="ret-entrada" placeholder="ENTRADA" inputmode="numeric">
      <input type="number" class="ret-saida" placeholder="SAÍDA" inputmode="numeric">
    </div>

    <div style="margin-top:6px;font-weight:700;font-size:0.9rem;">
      <span class="ret-resumo">
        <span class="verde">E: R$ 0,00</span> |
        <span class="vermelho">S: R$ 0,00</span> |
        Ret: 0.00%
      </span>
    </div>
  `;

  lista.appendChild(card);

  const selo = card.querySelector(".ret-selo");
  const jogo = card.querySelector(".ret-jogo");
  const entrada = card.querySelector(".ret-entrada");
  const saida = card.querySelector(".ret-saida");
  const resumo = card.querySelector(".ret-resumo");
  const btnRemover = card.querySelector(".btn-remover");

  const atualizar = () => {
    const E = Number(entrada.value) || 0;
    const S = Number(saida.value) || 0;

    const ret = E > 0 ? ((E - S) / E) * 100 : 0;

    const valorE = E / 100;
    const valorS = S / 100;

    resumo.innerHTML = `
      <span class="verde">E: R$ ${formatarReais(valorE)}</span> |
      <span class="vermelho">S: R$ ${formatarReais(valorS)}</span> |
      Ret: ${ret.toFixed(2)}%
    `;

    salvarRetencao();
  };

  // listeners
  [entrada, saida].forEach((inp) => {
    inp.addEventListener("input", atualizar);
  });

  [selo, jogo].forEach((inp) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.toUpperCase();
      salvarRetencao();
    });
  });

  btnRemover.addEventListener("click", () => {
    card.remove();
    salvarRetencao();
  });

  // restaurar dados se vier do storage
  if (dados) {
    selo.value = (dados.selo || "").toUpperCase();
    jogo.value = (dados.jogo || "").toUpperCase();
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
  const ponto = (inputPonto.value || "-").toUpperCase();

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
      const selo = (c.querySelector(".ret-selo").value || "-").toUpperCase();
      const jogo = (c.querySelector(".ret-jogo").value || "-").toUpperCase();
      const entrada = Number(c.querySelector(".ret-entrada").value || 0);
      const saida = Number(c.querySelector(".ret-saida").value || 0);
      const ret = entrada > 0 ? (((entrada - saida) / entrada) * 100).toFixed(2) : "0.00";

      const valorE = entrada / 100;
      const valorS = saida / 100;

      html += `
        <div class="bloco-ret">
          <strong>MÁQUINA ${i + 1}</strong><br>
          ${selo} — ${jogo}<br>
          <span class="verde">E: R$ ${formatarReais(valorE)}</span> |
          <span class="vermelho">S: R$ ${formatarReais(valorS)}</span> |
          Ret: ${ret}%
        </div>
      `;
    });
  }

  relConteudo.innerHTML = html;
  modal.classList.add("aberta");
}

// ===============================
//  STORAGE
// ===============================

function salvarRetencao() {
  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");

  const data = inputData ? inputData.value : "";
  if (inputPonto) inputPonto.value = inputPonto.value.toUpperCase();
  const ponto = inputPonto ? inputPonto.value : "";

  const maquinas = [];

  document.querySelectorAll(".card").forEach(card => {
    maquinas.push({
      selo: card.querySelector(".ret-selo").value.toUpperCase(),
      jogo: card.querySelector(".ret-jogo").value.toUpperCase(),
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

  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");

  if (inputData) inputData.value = dados.data || "";
  if (inputPonto) inputPonto.value = (dados.ponto || "").toUpperCase();

  if (dados.maquinas && Array.isArray(dados.maquinas)) {
    dados.maquinas.forEach(m => adicionarMaquina(lista, m));
  }
}

function limparTudo(lista) {
  if (!confirm("Excluir todas as máquinas?")) return;

  lista.innerHTML = "";
  localStorage.removeItem(RET_STORAGE);
  retContador = 0;
}
