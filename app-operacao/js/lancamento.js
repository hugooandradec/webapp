let entradas = [];

const corPos = "#16a34a";
const corNeg = "#dc2626";

function formatarMoeda(v){
  return (Number(v)||0).toLocaleString("pt-BR",{
    style:"currency",
    currency:"BRL"
  });
}

function novaEntrada(){
  const box = document.createElement("div");
  box.className = "card";

  box.innerHTML = `
    <label>ponto</label>
    <input type="text" class="ponto">

    <label>entrada</label>
    <input type="number" class="entrada" placeholder="r$">

    <label>saída</label>
    <input type="number" class="saida" placeholder="r$">

    <button class="btn roxo">salvar</button>
  `;

  box.querySelector("button").onclick = () => {
    const ponto = box.querySelector(".ponto").value.toLowerCase();
    const entrada = Number(box.querySelector(".entrada").value)||0;
    const saida = Number(box.querySelector(".saida").value)||0;

    entradas.push({ ponto, entrada, saida });
    box.remove();
    atualizarResumo();
  };

  document.getElementById("entradas").appendChild(box);
}

function atualizarResumo(){
  const valorInicial = Number(document.getElementById("valorInicial").value)||0;

  const totalEntrada = entradas.reduce((s,e)=>s+e.entrada,0);
  const totalSaida = entradas.reduce((s,e)=>s+e.saida,0);
  const total = valorInicial + totalEntrada - totalSaida;

  document.getElementById("resumo").innerHTML = `
    <p>valor inicial: <span class="verde">${formatarMoeda(valorInicial)}</span></p>
    <p>total entrada: <span class="verde">${formatarMoeda(totalEntrada)}</span></p>
    <p>total saída: <span class="vermelho">-${formatarMoeda(totalSaida)}</span></p>
    <p>valor total: <span style="color:${total<0?corNeg:corPos}">${formatarMoeda(total)}</span></p>
  `;
}

function abrirModal(){
  let html = "";
  let totalEntrada = 0;
  let totalSaida = 0;

  entradas.forEach(e=>{
    totalEntrada += e.entrada;
    totalSaida += e.saida;

    html += `
      ponto: ${e.ponto}<br>
      entrada: ${formatarMoeda(e.entrada)}<br>
      saída: ${formatarMoeda(e.saida)}<br>
      -----------------------------<br>
    `;
  });

  const valorInicial = Number(document.getElementById("valorInicial").value)||0;
  const total = valorInicial + totalEntrada - totalSaida;

  html += `
    <br>
    valor inicial: ${formatarMoeda(valorInicial)}<br>
    total entrada: ${formatarMoeda(totalEntrada)}<br>
    total saída: ${formatarMoeda(totalSaida)}<br>
    valor total: ${formatarMoeda(total)}
  `;

  document.getElementById("conteudoModal").innerHTML = html;
  document.getElementById("modal").classList.add("aberto");
}

function fecharModal(){
  document.getElementById("modal").classList.remove("aberto");
}

function limparTudo(){
  if(!confirm("limpar tudo?")) return;
  entradas = [];
  document.getElementById("entradas").innerHTML = "";
  document.getElementById("resumo").innerHTML = "";
  document.getElementById("valorInicial").value = "";
}
