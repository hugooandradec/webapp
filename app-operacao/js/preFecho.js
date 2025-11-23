// preFecho.js
// Script do Pré-Fecho com persistência em localStorage

const STORAGE_KEY = "preFecho_dados_v1";
let contadorMaquinas = 0;

document.addEventListener("DOMContentLoaded", () => {
  const inputData = document.getElementById("data");
  const inputCliente = document.getElementById("cliente");
  const btnAdicionar = document.getElementById("btnAdicionar");
  const btnRelatorio = document.getElementById("btnRelatorio");
  const listaMaquinas = document.getElementById("listaMaquinas");
  const totalGeralEl = document.getElementById("totalGeral");
  const modal = document.getElementById("modalRelatorio");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relatorioConteudo = document.getElementById("relatorioConteudo");

  // Data atual (se não tiver nada salvo ainda)
  if (inputData && !inputData.value) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    inputData.value = `${dia}/${mes}/${ano}`;
  }

  // Eventos para salvar quando mudar data / cliente
  if (inputData) {
    inputData.addEventListener("input", salvarNoStorage);
    inputData.addEventListener("change", salvarNoStorage);
  }
  if (inputCliente) {
    inputCliente.addEventListener("input", salvarNoStorage);
    inputCliente.addEventListener("change", salvarNoStorage);
  }

  // Botão adicionar máquina
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", () => {
      adicionarMaquina(listaMaquinas, totalGeralEl);
      salvarNoStorage();
    });
  }

  // Botão relatório
  if (btnRelatorio) {
    btnRelatorio.addEventListener("click", () => {
      abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal);
    });
  }

  // Fechar modal
  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", () => {
      modal.classList.remove("aberta");
    });
  }

  // Fechar modal clicando no fundo
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("aberta");
      }
    });
  }

  // Carregar dados salvos (se existirem)
  carregarDoStorage(listaMaquinas, totalGeralEl);
});

/* ===========================
   Criação de Máquina
=========================== */

// Cria um card de máquina
// se "dadosMaquina" for passado, preenche com os valores salvos
function adicionarMaquina(listaMaquinas, totalGeralEl, dadosMaquina = null) {
  contadorMaquinas++;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${contadorMaquinas}</span>
      <div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
        <small>preencha os relógios e veja o resultado</small>
        <button type="button" class="btn-remover" title="Remover máquina"
                style="border:none;background:transparent;color:#999;cursor:pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="linha">
      <label style="min-width:50px;" for="selo-${contadorMaquinas}">Selo:</label>
      <input id="selo-${contadorMaquinas}" type="text" class="inp-selo" placeholder="código da máquina">
    </div>

    <div class="linha">
      <label style="min-width:50px;" for="jogo-${contadorMaquinas}">Jogo:</label>
      <input id="jogo-${contadorMaquinas}" type="text" class="inp-jogo" placeholder="tipo de jogo">
    </div>

    <div class="grid">
      <div class="col">
        <h4>Entrada</h4>
        <div class="linha2">
          <input type="text" class="entrada-anterior" placeholder="Anterior">
          <input type="text" class="entrada-atual" placeholder="Atual">
        </div>
        <div class="dif">
          Diferença: <span class="dif-entrada">R$ 0,00</span>
        </div>
      </div>

      <div class="divv"></div>

      <div class="col">
        <h4>Saída</h4>
        <div class="linha2">
          <input type="text" class="saida-anterior" placeholder="Anterior">
          <input type="text" class="saida-atual" placeholder="Atual">
        </div>
        <div class="dif">
          Diferença: <span class="dif-saida">R$ 0,00</span>
        </div>
      </div>
    </div>

    <div style="margin-top:8px;font-weight:700;">
      Resultado: <span class="resultado-maquina">R$ 0,00</span>
    </div>
  `;

  listaMaquinas.appendChild(card);

  // Botão remover máquina
  const btnRemover = card.querySelector(".btn-remover");
  if (btnRemover) {
    btnRemover.addEventListener("click", () => {
      card.remove();
      atualizarTotalGeral(totalGeralEl);
      salvarNoStorage();
    });
  }

  // Inputs da máquina
  const seloInput = card.querySelector(".inp-selo");
  const jogoInput = card.querySelector(".inp-jogo");
  const entradaAnterior = card.querySelector(".entrada-anterior");
  const entradaAtual = card.querySelector(".entrada-atual");
  const saidaAnterior = card.querySelector(".saida-anterior");
  const saidaAtual = card.querySelector(".saida-atual");
  const spanDifEntrada = card.querySelector(".dif-entrada");
  const spanDifSaida = card.querySelector(".dif-saida");
  const spanResultado = card.querySelector(".resultado-maquina");

  const atualizarCalculos = () => {
    const entAnt = parseNumero(entradaAnterior.value);
    const entAt = parseNumero(entradaAtual.value);
    const saiAnt = parseNumero(saidaAnterior.value);
    const saiAt = parseNumero(saidaAtual.value);

    // Diferenças brutas de relógio
    const difEntradaBruta = entAt - entAnt;   // relógio
    const difSaidaBruta   = saiAt - saiAnt;   // relógio

    // CONVERSÃO PARA REAIS (dois últimos dígitos = centavos)
    // Entrada sempre POSITIVA
    const entradaReais = Math.abs(difEntradaBruta) / 100;

    // Saída sempre NEGATIVA
    const saidaReais = -Math.abs(difSaidaBruta) / 100;

    // Resultado final da máquina
    const resultado = entradaReais + saidaReais;

    // Diferenças exibidas em reais
    spanDifEntrada.textContent = formatarMoeda(entradaReais);
    spanDifSaida.textContent = formatarMoeda(saidaReais);

    // Resultado em reais com cor
    spanResultado.textContent = formatarMoeda(resultado);
    aplicarCorValor(spanResultado, resultado);

    atualizarTotalGeral(totalGeralEl);
    salvarNoStorage();
  };

  // Eventos para recalcular e salvar
  [entradaAnterior, entradaAtual, saidaAnterior, saidaAtual].forEach((inp) => {
    inp.addEventListener("input", atualizarCalculos);
    inp.addEventListener("change", atualizarCalculos);
  });

  [seloInput, jogoInput].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("input", salvarNoStorage);
    inp.addEventListener("change", salvarNoStorage);
  });

  // Se veio do storage, preenche com os valores salvos
  if (dadosMaquina) {
    if (seloInput) seloInput.value = dadosMaquina.selo || "";
    if (jogoInput) jogoInput.value = dadosMaquina.jogo || "";
    if (entradaAnterior) entradaAnterior.value = dadosMaquina.entradaAnterior || "";
    if (entradaAtual) entradaAtual.value = dadosMaquina.entradaAtual || "";
    if (saidaAnterior) saidaAnterior.value = dadosMaquina.saidaAnterior || "";
    if (saidaAtual) saidaAtual.value = dadosMaquina.saidaAtual || "";

    // Força cálculo inicial com esses valores
    atualizarCalculos();
  }
}

/* ===========================
   TOTAL GERAL
=========================== */

function atualizarTotalGeral(totalGeralEl) {
  let total = 0;

  document.querySelectorAll(".resultado-maquina").forEach((span) => {
    // Remove tudo que não for dígito, vírgula ou sinal de menos
    let texto = span.textContent
      .replace(/[^\d,-]/g, "") // sobra algo tipo "-632,55" ou "110,00"
      .replace(",", ".");      // vírgula → ponto

    if (!texto || texto === "-") return;

    const valor = parseFloat(texto);
    if (!isNaN(valor)) {
      total += valor;
    }
  });

  totalGeralEl.textContent = `TOTAL: ${formatarMoeda(total)}`;
  aplicarCorValor(totalGeralEl, total);
}

/* ===========================
   RELATÓRIO (MODAL)
=========================== */

function abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal) {
  const data = inputData?.value || "";
  const cliente = inputCliente?.value || "";

  let texto = "";
  texto += `Data: ${data}\n`;
  texto += `Cliente: ${cliente}\n`;
  texto += "----------------------------------------\n\n";

  const cards = document.querySelectorAll(".card");
  if (!cards.length) {
    texto += "Nenhuma máquina lançada.\n";
  } else {
    cards.forEach((card, idx) => {
      const selo = (card.querySelector(".inp-selo")?.value || "").trim();
      const jogo = (card.querySelector(".inp-jogo")?.value || "").trim();
      const difEntrada = card.querySelector(".dif-entrada")?.textContent || "R$ 0,00";
      const difSaida = card.querySelector(".dif-saida")?.textContent || "R$ 0,00";
      const resultado = card.querySelector(".resultado-maquina")?.textContent || "R$ 0,00";

      texto += `Máquina ${idx + 1}\n`;
      texto += `  Selo: ${selo}\n`;
      texto += `  Jogo: ${jogo}\n`;
      texto += `  Dif. Entrada: ${difEntrada}\n`;
      texto += `  Dif. Saída:  ${difSaida}\n`;
      texto += `  Resultado:   ${resultado}\n`;
      texto += "\n";
    });
  }

  texto += "----------------------------------------\n";
  texto += totalGeralEl.textContent;

  relatorioConteudo.textContent = texto;
  modal.classList.add("aberta");
}

/* ===========================
   Persistência em localStorage
=========================== */

function obterEstado() {
  const data = document.getElementById("data")?.value || "";
  const cliente = document.getElementById("cliente")?.value || "";

  const maquinas = [];
  document.querySelectorAll(".card").forEach((card) => {
    maquinas.push({
      selo: card.querySelector(".inp-selo")?.value || "",
      jogo: card.querySelector(".inp-jogo")?.value || "",
      entradaAnterior: card.querySelector(".entrada-anterior")?.value || "",
      entradaAtual: card.querySelector(".entrada-atual")?.value || "",
      saidaAnterior: card.querySelector(".saida-anterior")?.value || "",
      saidaAtual: card.querySelector(".saida-atual")?.value || "",
    });
  });

  return { data, cliente, maquinas };
}

function salvarNoStorage() {
  try {
    const dados = obterEstado();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {
    console.error("Erro ao salvar pré-fecho no storage:", e);
  }
}

function carregarDoStorage(listaMaquinas, totalGeralEl) {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return;

    const dados = JSON.parse(bruto);
    if (!dados || typeof dados !== "object") return;

    // Data e cliente
    const inputData = document.getElementById("data");
    const inputCliente = document.getElementById("cliente");

    if (inputData && dados.data) inputData.value = dados.data;
    if (inputCliente && dados.cliente) inputCliente.value = dados.cliente;

    // Máquinas
    listaMaquinas.innerHTML = "";
    contadorMaquinas = 0;

    if (Array.isArray(dados.maquinas)) {
      dados.maquinas.forEach((m) => {
        adicionarMaquina(listaMaquinas, totalGeralEl, m);
      });
    }

    atualizarTotalGeral(totalGeralEl);
  } catch (e) {
    console.error("Erro ao carregar pré-fecho do storage:", e);
  }
}

/* ===========================
   Helpers
=========================== */

function parseNumero(valor) {
  if (!valor) return 0;
  const limpo = valor
    .toString()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", "."); // se digitar com vírgula, ainda funciona
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function formatarMoeda(n) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Aplica cor: verde (>0), vermelho (<0), preto (≈0)
function aplicarCorValor(el, valor) {
  const LIMIAR = 0.005; // evita ruído tipo 0.0000001
  el.classList.remove("positivo", "negativo");

  if (valor > LIMIAR) {
    el.classList.add("positivo");
  } else if (valor < -LIMIAR) {
    el.classList.add("negativo");
  }
  // se estiver entre -0.005 e 0.005 fica sem classe → preto
}
