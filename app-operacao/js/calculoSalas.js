// ================================
// CÁLCULO DE SALAS (BINGOS)
// Resultado = Bruto - Despesas - Cartão - Taxa Parcelamento
// Salva em localStorage para funcionar offline
// ================================

const SALAS_STORAGE = "calculo_salas_v1";
let contadorSalas = 0;

document.addEventListener("DOMContentLoaded", () => {
  const btnAdd = document.getElementById("btnAddSala");
  const btnRel = document.getElementById("btnRelatorioSala");
  const btnLimpar = document.getElementById("btnLimparSala");
  const lista = document.getElementById("listaSalas");
  const totalEl = document.getElementById("totalGeralSalas");

  const modal = document.getElementById("modalSalas");
  const btnFecharModal = document.getElementById("btnFecharModalSalas");
  const relConteudo = document.getElementById("relConteudoSalas");

  const inputData = document.getElementById("data-salas");
  const inputPonto = document.getElementById("ponto-salas");

  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      adicionarSala(lista, totalEl);
      salvarSalas();
    });
  }

  if (btnRel) {
    btnRel.addEventListener("click", () => {
      abrirRelatorioSalas(inputData, inputPonto, totalEl, relConteudo, modal);
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      limparTudoSalas(lista, totalEl);
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

  carregarSalas(lista, totalEl);
});


// =======================
//   ADICIONAR SALA
// =======================

function adicionarSala(lista, totalEl, dados = null) {
  contadorSalas++;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Sala ${contadorSalas}</span>
      <button class="btn-remover" style="background:none;border:none;color:#777;">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>

    <div class="linha">
      <label>Nome:</label>
      <input type="text" class="sala-nome" placeholder="NOME DA SALA">
    </div>

    <div class="linha2x">
      <input type="number" class="sala-bruto" placeholder="BRUTO" step="0.01" inputmode="decimal">
      <input type="number" class="sala-despesas" placeholder="DESPESAS" step="0.01" inputmode="decimal">
      <input type="number" class="sala-cartao" placeholder="CARTÃO" step="0.01" inputmode="decimal">
    </div>

    <div class="linha">
      <label>Taxa de parcelamento cartão:</label>
      <input type="number" class="sala-taxa" placeholder="TAXA PARCELAMENTO" step="0.01" inputmode="decimal">
    </div>

    <div class="resultado-sala">
      Resultado: <span class="texto-resultado">R$ 0,00 (Neutro)</span><br>
      <span class="texto-pipo">Pipo: R$ 0,00</span> |
      <span class="texto-pass">Pass: R$ 0,00</span>
    </div>
  `;

  lista.appendChild(card);

  const nome = card.querySelector(".sala-nome");
  const bruto = card.querySelector(".sala-bruto");
  const despesas = card.querySelector(".sala-despesas");
  const cartao = card.querySelector(".sala-cartao");
  const taxa = card.querySelector(".sala-taxa");
  const resultadoSpan = card.querySelector(".texto-resultado");
  const spanPipo = card.querySelector(".texto-pipo");
  const spanPass = card.querySelector(".texto-pass");
  const btnRem = card.querySelector(".btn-remover");

  const atualizar = () => {
    const b = parseFloat((bruto.value || "").replace(",", ".")) || 0;
    const d = parseFloat((despesas.value || "").replace(",", ".")) || 0;
    const c = parseFloat((cartao.value || "").replace(",", ".")) || 0;
    const t = parseFloat((taxa.value || "").replace(",", ".")) || 0;

    const resultado = b - d - c - t;

    // Resultado principal
    let texto = `R$ ${resultado.toFixed(2)}`;
    let label = "";
    let classe = "";

    if (resultado > 0) {
      label = "Lucro";
      classe = "positivo";
    } else if (resultado < 0) {
      label = "Prejuízo";
      classe = "negativo";
    } else {
      label = "Neutro";
      classe = "";
    }

    resultadoSpan.textContent = `${texto} (${label})`;
    resultadoSpan.classList.remove("positivo", "negativo");
    if (classe) resultadoSpan.classList.add(classe);

    // Pipo (2/3) e Pass (1/3) do resultado final
    const pipoVal = resultado * (2 / 3);
    const passVal = resultado * (1 / 3);

    spanPipo.textContent = `Pipo: R$ ${pipoVal.toFixed(2)}`;
    spanPass.textContent = `Pass: R$ ${passVal.toFixed(2)}`;

    salvarSalas();
    atualizarTotalSalas(totalEl);
  };

  [nome, bruto, despesas, cartao, taxa].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("input", () => {
      if (inp === nome) {
        inp.value = inp.value.toUpperCase();
      }
      atualizar();
    });
  });

  btnRem.addEventListener("click", () => {
    card.remove();
    salvarSalas();
    atualizarTotalSalas(totalEl);
  });

  // Popular com dados (carregar do storage)
  if (dados) {
    nome.value = (dados.nome || "").toUpperCase();
    bruto.value = dados.bruto || "";
    despesas.value = dados.despesas || "";
    cartao.value = dados.cartao || "";
    taxa.value = dados.taxa || "";
    atualizar();
  } else {
    atualizar();
  }
}


// =======================
//   TOTAL GERAL
// =======================

function atualizarTotalSalas(totalEl) {
  let total = 0;

  document.querySelectorAll(".card").forEach((card) => {
    const bruto = parseFloat(
      (card.querySelector(".sala-bruto").value || "").replace(",", ".")
    ) || 0;
    const despesas = parseFloat(
      (card.querySelector(".sala-despesas").value || "").replace(",", ".")
    ) || 0;
    const cartao = parseFloat(
      (card.querySelector(".sala-cartao").value || "").replace(",", ".")
    ) || 0;
    const taxa = parseFloat(
      (card.querySelector(".sala-taxa").value || "").replace(",", ".")
    ) || 0;

    total += bruto - despesas - cartao - taxa;
  });

  const txt = `TOTAL GERAL: R$ ${total.toFixed(2)}`;
  totalEl.textContent = txt;
  totalEl.classList.remove("positivo", "negativo");
  if (total > 0) totalEl.classList.add("positivo");
  else if (total < 0) totalEl.classList.add("negativo");
}


// =======================
//   RELATÓRIO (MODAL)
// =======================

function abrirRelatorioSalas(inputData, inputPonto, totalEl, relConteudo, modal) {
  const data = inputData.value || "-";
  const ponto = inputPonto.value || "-";

  let html = `
    <div><strong>DATA:</strong> ${data}</div>
    <div><strong>PONTO:</strong> ${ponto}</div>
    <hr>
  `;

  const cards = document.querySelectorAll(".card");

  if (!cards.length) {
    html += `<p>Nenhuma sala lançada.</p>`;
  } else {
    cards.forEach((card, i) => {
      const nome = card.querySelector(".sala-nome").value || `Sala ${i + 1}`;
      const bruto = parseFloat(
        (card.querySelector(".sala-bruto").value || "").replace(",", ".")
      ) || 0;
      const despesas = parseFloat(
        (card.querySelector(".sala-despesas").value || "").replace(",", ".")
      ) || 0;
      const cartao = parseFloat(
        (card.querySelector(".sala-cartao").value || "").replace(",", ".")
      ) || 0;
      const taxa = parseFloat(
        (card.querySelector(".sala-taxa").value || "").replace(",", ".")
      ) || 0;

      const resultado = bruto - despesas - cartao - taxa;
      const label =
        resultado > 0 ? "Lucro" : resultado < 0 ? "Prejuízo" : "Neutro";

      const pipoVal = resultado * (2 / 3);
      const passVal = resultado * (1 / 3);

      html += `
        <div class="bloco-sala">
          <strong>${nome.toUpperCase()}</strong><br>
          Bruto: R$ ${bruto.toFixed(2)} |
          Desp: R$ ${despesas.toFixed(2)} |
          Cartão: R$ ${cartao.toFixed(2)} |
          Taxa Parc.: R$ ${taxa.toFixed(2)}<br>
          Resultado: R$ ${resultado.toFixed(2)} (${label})<br>
          Pipo: R$ ${pipoVal.toFixed(2)} | Pass: R$ ${passVal.toFixed(2)}
        </div>
      `;
    });
  }

  html += `
    <hr>
    <div style="font-weight:900;text-align:right;">
      ${totalEl.textContent}
    </div>
  `;

  relConteudo.innerHTML = html;
  modal.classList.add("aberta");
}


// =======================
//   STORAGE
// =======================

function salvarSalas() {
  const data = document.getElementById("data-salas").value;
  const ponto = document
    .getElementById("ponto-salas")
    .value.toUpperCase();

  const salas = [];

  document.querySelectorAll(".card").forEach((card) => {
    salas.push({
      nome: card.querySelector(".sala-nome").value.toUpperCase(),
      bruto: card.querySelector(".sala-bruto").value,
      despesas: card.querySelector(".sala-despesas").value,
      cartao: card.querySelector(".sala-cartao").value,
      taxa: card.querySelector(".sala-taxa").value
    });
  });

  localStorage.setItem(SALAS_STORAGE, JSON.stringify({ data, ponto, salas }));
}

function carregarSalas(lista, totalEl) {
  const raw = localStorage.getItem(SALAS_STORAGE);
  if (!raw) return;

  const dados = JSON.parse(raw);

  document.getElementById("data-salas").value = dados.data || "";
  document.getElementById("ponto-salas").value = (dados.ponto || "").toUpperCase();

  if (dados.salas && Array.isArray(dados.salas)) {
    dados.salas.forEach((s) => adicionarSala(lista, totalEl, s));
  } else {
    atualizarTotalSalas(totalEl);
  }
}

function limparTudoSalas(lista, totalEl) {
  if (!confirm("Excluir todas as salas?")) return;

  lista.innerHTML = "";
  localStorage.removeItem(SALAS_STORAGE);
  contadorSalas = 0;
  atualizarTotalSalas(totalEl);
}