// preFecho.js
// Script do Pré-Fecho com persistência em localStorage

const STORAGE_KEY = "preFecho_dados_v1";
let contadorMaquinas = 0;

document.addEventListener("DOMContentLoaded", () => {
  const inputData = document.getElementById("data");
  const inputCliente = document.getElementById("cliente");
  const btnAdicionar = document.getElementById("btnAdicionar");
  const btnRelatorio = document.getElementById("btnRelatorio");
  const btnLimpar = document.getElementById("btnLimpar");
  const listaMaquinas = document.getElementById("listaMaquinas");
  const totalGeralEl = document.getElementById("totalGeral");
  const modal = document.getElementById("modalRelatorio");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relatorioConteudo = document.getElementById("relatorioConteudo");

  carregarDoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl);

  if (!inputData.value) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    inputData.value = `${yyyy}-${mm}-${dd}`;
  }

  inputData.addEventListener("change", () =>
    salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl)
  );
  inputCliente.addEventListener("input", () =>
    salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl)
  );

  btnAdicionar.addEventListener("click", () => {
    adicionarMaquina(listaMaquinas, totalGeralEl, inputData, inputCliente);
    salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl);
  });

  if (!listaMaquinas.children.length) {
    adicionarMaquina(listaMaquinas, totalGeralEl, inputData, inputCliente);
  }

  btnRelatorio.addEventListener("click", () => {
    abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal);
  });

  btnLimpar.addEventListener("click", () => {
    if (!confirm("Deseja limpar todos os dados do Pré-Fecho?")) return;
    inputCliente.value = "";
    listaMaquinas.innerHTML = "";
    contadorMaquinas = 0;
    adicionarMaquina(listaMaquinas, totalGeralEl, inputData, inputCliente);
    atualizarTotalGeral(listaMaquinas, totalGeralEl);
    salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl);
  });

  btnFecharModal.addEventListener("click", () => {
    modal.classList.remove("aberta");
  });

  modal.addEventListener("click", (e) => {
    if (e.target.id === "modalRelatorio") {
      modal.classList.remove("aberta");
    }
  });

  atualizarTotalGeral(listaMaquinas, totalGeralEl);
});

// ============= Funções principais =============

function criarCardMaquina(numero, listaMaquinas, totalGeralEl, inputData, inputCliente) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-header">
      <span class="card-titulo">Máquina ${numero}</span>
      <span class="card-dica">preencha os relógios e veja o resultado</span>
      <button class="btn-remover" title="Remover máquina">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>

    <div class="linha-campo">
      <label>Selo:</label>
      <input type="text" class="inp-selo" placeholder="código da máquina">
    </div>

    <div class="linha-campo">
      <label>Jogo:</label>
      <input type="text" class="inp-jogo" placeholder="tipo de jogo">
    </div>

    <div class="grid-io">
      <div class="col-io">
        <h4>Entrada</h4>
        <div class="linha-rel">
          <span>Anterior</span>
          <input type="tel" class="inp-entrada-anterior" inputmode="numeric">
        </div>
        <div class="linha-rel">
          <span>Atual</span>
          <input type="tel" class="inp-entrada-atual" inputmode="numeric">
        </div>
        <div class="dif">
          Diferença: <span class="dif-entrada">R$ 0,00</span>
        </div>
      </div>
      <div class="divisor-vertical"></div>
      <div class="col-io">
        <h4>Saída</h4>
        <div class="linha-rel">
          <span>Anterior</span>
          <input type="tel" class="inp-saida-anterior" inputmode="numeric">
        </div>
        <div class="linha-rel">
          <span>Atual</span>
          <input type="tel" class="inp-saida-atual" inputmode="numeric">
        </div>
        <div class="dif">
          Diferença: <span class="dif-saida">R$ 0,00</span>
        </div>
      </div>
    </div>

    <div class="resultado">
      Resultado: <span class="resultado-maquina">R$ 0,00</span>
    </div>
  `;

  const inpSelo = card.querySelector(".inp-selo");
  const inpJogo = card.querySelector(".inp-jogo");
  const inpEntAnt = card.querySelector(".inp-entrada-anterior");
  const inpEntAtu = card.querySelector(".inp-entrada-atual");
  const inpSaiAnt = card.querySelector(".inp-saida-anterior");
  const inpSaiAtu = card.querySelector(".inp-saida-atual");
  const difEntradaEl = card.querySelector(".dif-entrada");
  const difSaidaEl = card.querySelector(".dif-saida");
  const resultadoEl = card.querySelector(".resultado-maquina");
  const btnRemover = card.querySelector(".btn-remover");

  [inpSelo, inpJogo].forEach((inp) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.toUpperCase();
      salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl);
    });
  });

  [inpEntAnt, inpEntAtu, inpSaiAnt, inpSaiAtu].forEach((inp) => {
    inp.addEventListener("input", () => {
      atualizarMaquina(
        inpEntAnt,
        inpEntAtu,
        inpSaiAnt,
        inpSaiAtu,
        difEntradaEl,
        difSaidaEl,
        resultadoEl
      );
      atualizarTotalGeral(listaMaquinas, totalGeralEl);
      salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl);
    });
  });

  btnRemover.addEventListener("click", () => {
    if (!confirm("Remover esta máquina?")) return;
    card.remove();
    renumerarMaquinas(listaMaquinas);
    atualizarTotalGeral(listaMaquinas, totalGeralEl);
    salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl);
  });

  return card;
}

function adicionarMaquina(listaMaquinas, totalGeralEl, inputData, inputCliente) {
  contadorMaquinas++;
  const card = criarCardMaquina(
    contadorMaquinas,
    listaMaquinas,
    totalGeralEl,
    inputData,
    inputCliente
  );
  listaMaquinas.appendChild(card);
}

function renumerarMaquinas(listaMaquinas) {
  const cards = listaMaquinas.querySelectorAll(".card");
  contadorMaquinas = 0;
  cards.forEach((card) => {
    contadorMaquinas++;
    const titulo = card.querySelector(".card-titulo");
    if (titulo) titulo.textContent = `Máquina ${contadorMaquinas}`;
  });
}

// ============= Cálculos =============

function parseRelogio(valor) {
  if (!valor) return 0;
  const limpo = valor.toString().replace(/\D/g, "");
  if (!limpo) return 0;
  return Number(limpo);
}

function diferencaEmReais(anterior, atual) {
  if (!anterior && !atual) return 0;
  const diff = parseRelogio(atual) - parseRelogio(anterior);
  return diff / 100;
}

function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function atualizarMaquina(
  inpEntAnt,
  inpEntAtu,
  inpSaiAnt,
  inpSaiAtu,
  difEntradaEl,
  difSaidaEl,
  resultadoEl
) {
  const difEntrada = diferencaEmReais(inpEntAnt.value, inpEntAtu.value);
  const difSaida = diferencaEmReais(inpSaiAnt.value, inpSaiAtu.value);
  const resultado = difEntrada - difSaida;

  difEntradaEl.textContent = formatarMoeda(difEntrada);
  difSaidaEl.textContent = formatarMoeda(difSaida);
  resultadoEl.textContent = formatarMoeda(resultado);

  difEntradaEl.className = "dif-entrada " + classeValorMonetario(difEntrada);
  difSaidaEl.className = "dif-saida " + classeValorMonetario(-difSaida);
  resultadoEl.className = "resultado-maquina " + classeValorMonetario(resultado);
}

function atualizarTotalGeral(listaMaquinas, totalGeralEl) {
  let total = 0;
  const resultados = listaMaquinas.querySelectorAll(".resultado-maquina");
  resultados.forEach((el) => {
    const texto = el.textContent || "";
    const valor = parseFloat(
      texto
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d\-.]/g, "")
    );
    if (!isNaN(valor)) total += valor;
  });

  totalGeralEl.textContent = "TOTAL: " + formatarMoeda(total);
  totalGeralEl.className = "total " + classeValorMonetario(total);
}

// ============= Storage =============

function salvarNoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl) {
  const cards = listaMaquinas.querySelectorAll(".card");
  const maquinas = [];

  cards.forEach((card) => {
    maquinas.push({
      selo: card.querySelector(".inp-selo")?.value || "",
      jogo: card.querySelector(".inp-jogo")?.value || "",
      entAnt: card.querySelector(".inp-entrada-anterior")?.value || "",
      entAtu: card.querySelector(".inp-entrada-atual")?.value || "",
      saiAnt: card.querySelector(".inp-saida-anterior")?.value || "",
      saiAtu: card.querySelector(".inp-saida-atual")?.value || "",
    });
  });

  const dados = {
    data: inputData.value,
    cliente: inputCliente.value,
    maquinas,
    totalTexto: totalGeralEl.textContent || "",
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function carregarDoStorage(inputData, inputCliente, listaMaquinas, totalGeralEl) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const dados = JSON.parse(raw);
    inputData.value = dados.data || "";
    inputCliente.value = dados.cliente || "";
    listaMaquinas.innerHTML = "";
    contadorMaquinas = 0;

    if (Array.isArray(dados.maquinas) && dados.maquinas.length) {
      dados.maquinas.forEach((maq) => {
        contadorMaquinas++;
        const card = criarCardMaquina(
          contadorMaquinas,
          listaMaquinas,
          totalGeralEl,
          inputData,
          inputCliente
        );
        listaMaquinas.appendChild(card);

        card.querySelector(".inp-selo").value = maq.selo || "";
        card.querySelector(".inp-jogo").value = maq.jogo || "";
        card.querySelector(".inp-entrada-anterior").value = maq.entAnt || "";
        card.querySelector(".inp-entrada-atual").value = maq.entAtu || "";
        card.querySelector(".inp-saida-anterior").value = maq.saiAnt || "";
        card.querySelector(".inp-saida-atual").value = maq.saiAtu || "";

        const difEntradaEl = card.querySelector(".dif-entrada");
        const difSaidaEl = card.querySelector(".dif-saida");
        const resultadoEl = card.querySelector(".resultado-maquina");

        atualizarMaquina(
          card.querySelector(".inp-entrada-anterior"),
          card.querySelector(".inp-entrada-atual"),
          card.querySelector(".inp-saida-anterior"),
          card.querySelector(".inp-saida-atual"),
          difEntradaEl,
          difSaidaEl,
          resultadoEl
        );
      });
    }

    if (dados.totalTexto) {
      totalGeralEl.textContent = dados.totalTexto;
      const valorMatch = dados.totalTexto.match(/([-\\d\\.,]+)/);
      if (valorMatch) {
        const valor = parseFloat(
          valorMatch[1].replace(/\./g, "").replace(",", ".")
        );
        totalGeralEl.className = "total " + classeValorMonetario(valor);
      }
    } else {
      atualizarTotalGeral(listaMaquinas, totalGeralEl);
    }
  } catch (e) {
    console.error("Erro ao carregar dados do Pré-Fecho:", e);
  }
}

// ============= Relatório (MODAL 2×2) =============

function abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal) {
  const data = inputData?.value || "";
  const cliente = (inputCliente?.value || "").trim().toUpperCase();

  // texto do total já calculado no rodapé
  const totalTexto = (totalGeralEl?.textContent || "").replace(/^TOTAL:\s*/i, "");
  const clsTotal = classeValorMonetario(totalTexto);

  let html = "";

  // Cabeçalho: data, cliente e TOTAL ao lado (com cor)
  html += `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">
      <div>
        <div><strong>DATA:</strong> ${escapeHtml(data || "-")}</div>
        <div><strong>CLIENTE:</strong> ${escapeHtml(cliente || "-")}</div>
      </div>
      <div style="font-weight:800;font-size:0.9rem;text-align:right;">
        TOTAL: <span class="${clsTotal}">${escapeHtml(totalTexto || "R$ 0,00")}</span>
      </div>
    </div>
    <hr style="margin:4px 0 6px;">
  `;

  const cards = document.querySelectorAll(".card");
  if (!cards.length) {
    html += `<div style="margin-top:4px;">Nenhuma máquina lançada.</div>`;
  } else {
    // primeiro montamos o bloco de cada máquina
    const blocos = [];

    cards.forEach((card, idx) => {
      const seloRaw = (card.querySelector(".inp-selo")?.value || "").trim();
      const jogoRaw = (card.querySelector(".inp-jogo")?.value || "").trim();

      const selo = seloRaw.toUpperCase();
      const jogo = jogoRaw.toUpperCase();

      const difEntradaTxt = card.querySelector(".dif-entrada")?.textContent || "R$ 0,00";
      const difSaidaTxt   = card.querySelector(".dif-saida")?.textContent   || "R$ 0,00";
      const resultadoTxt  = card.querySelector(".resultado-maquina")?.textContent || "R$ 0,00";

      const clsEnt = classeValorMonetario(difEntradaTxt);
      const clsSai = classeValorMonetario(difSaidaTxt);
      const clsRes = classeValorMonetario(resultadoTxt);

      const bloco = `
        <div style="flex:1; padding:2px 8px;">
          <div><strong>MÁQUINA ${idx + 1}</strong></div>
          <div>SELO: ${escapeHtml(selo || "-")}</div>
          <div>JOGO: ${escapeHtml(jogo || "-")}</div>
          <div>Dif. ENTRADA: <span class="${clsEnt}">${escapeHtml(difEntradaTxt)}</span></div>
          <div>Dif. SAÍDA: <span class="${clsSai}">${escapeHtml(difSaidaTxt)}</span></div>
          <div>RESULTADO: <span class="${clsRes}">${escapeHtml(resultadoTxt)}</span></div>
        </div>
      `;
      blocos.push(bloco);
    });

    // agora organizamos 2 máquinas por linha, com linha vertical no meio
    html += `<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">`;
    for (let i = 0; i < blocos.length; i += 2) {
      const bloco1 = blocos[i];
      const bloco2 = blocos[i + 1] || "";

      if (bloco2) {
        html += `
          <div style="display:flex;gap:8px;border-bottom:1px dashed #e0e0e0;padding:4px 0;">
            ${bloco1}
            <div style="width:1px;background:#e0e0e0;"></div>
            ${bloco2}
          </div>
        `;
      } else {
        // apenas 1 máquina na última linha
        html += `
          <div style="display:flex;gap:8px;border-bottom:1px dashed #e0e0e0;padding:4px 0;">
            ${bloco1}
          </div>
        `;
      }
    }
    html += `</div>`;
  }

  relatorioConteudo.innerHTML = html;
  modal.classList.add("aberta");
}

// ============= Helpers visuais =============

function classeValorMonetario(valor) {
  if (typeof valor === "string") {
    const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d\-.]/g, "");
    const num = parseFloat(limpo);
    if (!isNaN(num)) valor = num;
  }
  const v = Number(valor) || 0;
  const LIMIAR = 0.005;
  if (v > LIMIAR) return "positivo";
  if (v < -LIMIAR) return "negativo";
  return "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
