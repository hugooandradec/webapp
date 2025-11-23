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

    // Diferença = Atual - Anterior (mas se quiser exatamente "Anterior - Atual", é só inverter)
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
}  };
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
