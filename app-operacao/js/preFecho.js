// preFecho.js
// Script do Pré-Fecho

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

  // Data atual
  if (inputData) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    inputData.value = `${dia}/${mes}/${ano}`;
  }

  // Botão adicionar máquina
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", () => {
      adicionarMaquina(listaMaquinas, totalGeralEl);
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
});

// Cria um card de máquina
function adicionarMaquina(listaMaquinas, totalGeralEl) {
  contadorMaquinas++;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${contadorMaquinas}</span>
      <small>preencha os relógios e veja o resultado</small>
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
          Diferença: <span class="dif-entrada">0,00</span>
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
          Diferença: <span class="dif-saida">0,00</span>
        </div>
      </div>
    </div>

    <div style="margin-top:8px;font-weight:700;">
      Resultado: <span class="resultado-maquina positivo">R$ 0,00</span>
    </div>
  `;

  listaMaquinas.appendChild(card);

  // Inputs da máquina
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

    // Diferença = Atual - Anterior
    const difEntrada = entAt - entAnt;
    const difSaida = saiAt - saiAnt;

    // Resultado geral da máquina (Saída - Entrada)
    const resultado = difSaida - difEntrada;

    spanDifEntrada.textContent = formatarNumero(difEntrada);
    spanDifSaida.textContent = formatarNumero(difSaida);

    spanResultado.textContent = formatarMoeda(resultado);
    spanResultado.classList.toggle("positivo", resultado >= 0);
    spanResultado.classList.toggle("negativo", resultado < 0);

    atualizarTotalGeral(totalGeralEl);
  };

  [entradaAnterior, entradaAtual, saidaAnterior, saidaAtual].forEach((inp) => {
    inp.addEventListener("input", atualizarCalculos);
  });
}

// Atualiza TOTAL geral
function atualizarTotalGeral(totalGeralEl) {
  let total = 0;

  document.querySelectorAll(".resultado-maquina").forEach((span) => {
    const texto = span.textContent
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

    const valor = parseFloat(texto);
    if (!isNaN(valor)) {
      total += valor;
    }
  });

  totalGeralEl.textContent = `TOTAL: ${formatarMoeda(total)}`;
  totalGeralEl.classList.toggle("positivo", total >= 0);
  totalGeralEl.classList.toggle("negativo", total < 0);
}

// Abre relatório no modal
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
      const difEntrada = card.querySelector(".dif-entrada")?.textContent || "0,00";
      const difSaida = card.querySelector(".dif-saida")?.textContent || "0,00";
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

// Helpers numéricos
function parseNumero(valor) {
  if (!valor) return 0;
  const limpo = valor.toString().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function formatarNumero(n) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarMoeda(n) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
