// ================================
// CÁLCULO DE RETENÇÃO — CARD ESTILO PRÉ-FECHO
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

  // Ponto sempre em maiúsculo
  if (inputPonto) {
    inputPonto.addEventListener("input", () => {
      inputPonto.value = inputPonto.value.toUpperCase();
      salvarRetencao();
    });
  }

  if (inputData) {
    inputData.addEventListener("change", salvarRetencao);
    inputData.addEventListener("input", salvarRetencao);
  }

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
//   ADICIONAR MÁQUINA (CARD IGUAL AO PRÉ-FECHO)
// ===============================

function adicionarMaquina(lista, dados = null) {
  retContador++;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${retContador}</span>
      <div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
        <small>digite E / S para ver a retenção</small>
        <button class="btn-remover" title="Remover máquina"
                style="border:none;background:transparent;color:#999;cursor:pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="linha">
      <label style="min-width:50px;">Selo:</label>
      <input type="text" class="ret-selo" placeholder="código da máquina">
    </div>

    <div class="linha">
      <label style="min-width:50px;">Jogo:</label>
      <input type="text" class="ret-jogo" placeholder="tipo de jogo">
    </div>

    <div class="grid">
      <div class="col">
        <h4>Entrada</h4>
        <input type="tel" inputmode="numeric" pattern="[0-9]*"
               class="ret-entrada" placeholder="valor de entrada">
      </div>

      <div class="divv"></div>

      <div class="col">
        <h4>Saída</h4>
        <input type="tel" inputmode="numeric" pattern="[0-9]*"
               class="ret-saida" placeholder="valor de saída">
      </div>
    </div>

    <div class="resultado-resumo">
      <span class="ret-resumo">
        <span class="verde">E: R$ 0,00</span> |
        <span class="vermelho">S: R$ 0,00</span> |
        Ret: 0.000%
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
    // só dígitos
    [entrada, saida].forEach((inp) => {
      if (!inp) return;
      const limpo = (inp.value || "").replace(/\D/g, "");
      if (inp.value !== limpo) inp.value = limpo;
    });

    const E = Number(entrada.value) || 0;
    const S = Number(saida.value) || 0;

    // dois últimos dígitos = centavos
    const valorE = E / 100;
    const valorS = S / 100;

    const ret = E > 0 ? ((E - S) / E) * 100 : 0;

    resumo.innerHTML = `
      <span class="verde">E: R$ ${formatarReais(valorE)}</span> |
      <span class="vermelho">S: R$ ${formatarReais(valorS)}</span> |
      Ret: ${ret.toFixed(3)}%
    `;

    salvarRetencao();
  };

  // listeners números
  [entrada, saida].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("input", atualizar);
    inp.addEventListener("change", atualizar);
  });

  // selo/jogo sempre em maiúsculo
  [selo, jogo].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("input", () => {
      inp.value = inp.value.toUpperCase();
      salvarRetencao();
    });
  });

  // remover card
  if (btnRemover) {
    btnRemover.addEventListener("click", () => {
      card.remove();
      salvarRetencao();
    });
  }

  // restaurar dados se vier do storage
  if (dados) {
    if (selo) selo.value = (dados.selo || "").toUpperCase();
    if (jogo) jogo.value = (dados.jogo || "").toUpperCase();
    if (entrada) entrada.value = dados.entrada || "";
    if (saida) saida.value = dados.saida || "";
    atualizar();
  }
}

// ===============================
//  RELATÓRIO
// ===============================

function abrirRelatorio(inputData, inputPonto, relConteudo, modal) {
  const data = inputData?.value || "-";
  const ponto = (inputPonto?.value || "-").toUpperCase();

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
      const selo = (c.querySelector(".ret-selo")?.value || "-").toUpperCase();
      const jogo = (c.querySelector(".ret-jogo")?.value || "-").toUpperCase();
      const entrada = Number(c.querySelector(".ret-entrada")?.value || 0);
      const saida = Number(c.querySelector(".ret-saida")?.value || 0);

      const valorE = entrada / 100;
      const valorS = saida / 100;
      const ret = entrada > 0 ? ((entrada - saida) / entrada) * 100 : 0;

      html += `
        <div class="bloco-ret">
          <strong>MÁQUINA ${i + 1}</strong><br>
          ${selo} — ${jogo}<br>
          <span class="verde">E: R$ ${formatarReais(valorE)}</span> |
          <span class="vermelho">S: R$ ${formatarReais(valorS)}</span> |
          Ret: ${ret.toFixed(3)}%
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
      selo: (card.querySelector(".ret-selo")?.value || "").toUpperCase(),
      jogo: (card.querySelector(".ret-jogo")?.value || "").toUpperCase(),
      entrada: card.querySelector(".ret-entrada")?.value || "",
      saida: card.querySelector(".ret-saida")?.value || ""
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

  if (Array.isArray(dados.maquinas)) {
    dados.maquinas.forEach(m => adicionarMaquina(lista, m));
  }
}

function limparTudo(lista) {
  if (!confirm("Excluir todas as máquinas e limpar dados?")) return;

  lista.innerHTML = "";
  localStorage.removeItem(RET_STORAGE);
  retContador = 0;

  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");
  if (inputData) inputData.value = "";
  if (inputPonto) inputPonto.value = "";
}
