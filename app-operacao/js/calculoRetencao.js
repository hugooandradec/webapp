// ===== LOCAL STORAGE =====
const STORAGE_KEY = "retencao_maquinas";

let maquinas = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// ===== SALVAR =====
function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(maquinas));
}

// ===== ADICIONAR MÁQUINA =====
function adicionarMaquina() {
  const selo = document.getElementById("selo").value.trim().toUpperCase();
  const jogo = document.getElementById("jogo").value.trim();
  const entrada = Number(document.getElementById("entrada").value);
  const saida = Number(document.getElementById("saida").value);

  if (!selo || !jogo || isNaN(entrada) || isNaN(saida)) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  const retencao = entrada > 0 ? ((entrada - saida) / entrada) * 100 : 0;

  maquinas.push({
    selo,
    jogo,
    entrada,
    saida,
    retencao: retencao.toFixed(1)
  });

  salvar();
  renderLista();

  document.getElementById("selo").value = "";
  document.getElementById("jogo").value = "";
  document.getElementById("entrada").value = "";
  document.getElementById("saida").value = "";
}

// ===== EXIBIR LISTA =====
function renderLista() {
  const box = document.getElementById("listaMaquinas");
  box.innerHTML = "";

  maquinas.forEach(m => {
    const div = document.createElement("div");
    div.className = "item-maquina";
    div.innerHTML = `
      <strong>${m.selo} — ${m.jogo}</strong><br>
      E: ${m.entrada} | S: ${m.saida} | Ret: ${m.retencao}%
    `;
    box.appendChild(div);
  });
}

renderLista();

// ===== MODAL RELATÓRIO =====
function abrirRelatorio() {
  const data = document.getElementById("data").value;
  const ponto = document.getElementById("ponto").value.trim();

  let dataFmt = "-";
  if (data) {
    const [y, m, d] = data.split("-");
    const dt = new Date(+y, +m - 1, +d);
    const dia = dt.toLocaleDateString("pt-BR", { weekday: "long" });
    dataFmt = `${d}/${m}/${y} (${dia})`;
  }

  let html = `
    <h3 style="color:#6a1b9a; text-align:center; margin-bottom:10px;">Relatório de Retenção</h3>
    <p><strong>Data:</strong> ${dataFmt}</p>
    <p><strong>Ponto:</strong> ${ponto || "-"}</p>
    <hr><br>
  `;

  maquinas.forEach(m => {
    html += `
      <div class="linha-relatorio">
        <strong>${m.selo} — ${m.jogo}</strong><br>
        E: ${m.entrada} | S: ${m.saida} | Ret: ${m.retencao}%
      </div>
    `;
  });

  document.getElementById("relatorio").innerHTML = html;
  document.getElementById("modal").classList.add("aberto");
}

// ===== FECHAR RELATÓRIO =====
function fecharRelatorio() {
  document.getElementById("modal").classList.remove("aberto");
}

// ===== LIMPAR TUDO =====
function limparTudo() {
  if (!confirm("Deseja realmente apagar tudo?")) return;
  maquinas = [];
  salvar();
  renderLista();
}
