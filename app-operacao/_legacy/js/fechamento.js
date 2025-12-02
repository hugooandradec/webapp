// ./js/fechamento.js
// Layout no estilo do app antigo: seletores lado-a-lado e resumo textual.
// Por ora usamos dados mock; depois plugamos Clientes/Máquinas reais do backend.

import { inicializarPagina } from "../../common/js/navegacao.js";

// ===== util =====
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const fmtBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function hojeBR(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  const iso = d.toISOString().slice(0,10); // AAAA-MM-DD
  const [y,m,dd] = iso.split("-");
  return `${dd}/${m}/${y}`;
}

// ===== mock (até termos clientes/equipamentos reais) =====
const MOCK_CLIENTES = [
  { id:"c1", nome:"Adriano Grota", rota:"pipo", end:"Grota", bairro:"Grota", negativo:0, pendentes:8, lancados:0 },
  { id:"c2", nome:"Alan Ciclovia", rota:"pipo", end:"ciclovia maruim", bairro:"maruim", negativo:0, pendentes:5, lancados:0 },
];
const MOCK_EQUIP = (cliId) => [
  { id:"m1", selo:"IC152",  jogo:"Seven", pendente:true },
  { id:"m2", selo:"IA058",  jogo:"HL",    pendente:true },
  { id:"m3", selo:"IA059",  jogo:"HL",    pendente:false },
].filter(e => e.pendente === true || cliId); // apenas pra ter algo

// ===== estado =====
let clienteSel = null;
let equipSel   = null;

// ===== init =====
document.addEventListener("DOMContentLoaded", () => {
  // título + botão voltar + status online (navegacao.js cuida do cabeçalho)
  try { inicializarPagina("Fechamento", { back:true, showStatus:true }); } catch {}

  // contadores iniciais
  atualizarContadores();

  // binds dos botões
  $("#btnCliPend") .addEventListener("click", () => abrirPickerClientes(true));
  $("#btnCliLanc") .addEventListener("click", () => abrirPickerClientes(false));
  $("#btnEqPend")  .addEventListener("click", () => abrirPickerEquip(true));
  $("#btnEqLanc")  .addEventListener("click", () => abrirPickerEquip(false));
  $("#btnSalvar")  .addEventListener("click", salvar);

  // modal picker
  $("#closePicker").addEventListener("click", fecharPicker);

  // launch (stub)
  $("#closeLaunch").addEventListener("click", fecharLaunch);
  $("#btnLaunchOk").addEventListener("click", ()=>{ fecharLaunch(); alert("Lançamento concluído (demo)."); });

  // resumo inicia com a data de hoje
  $("#r-data").textContent = hojeBR();
});

// ===== contadores (mock) =====
function atualizarContadores(){
  const pend = MOCK_CLIENTES.reduce((s,c)=>s+(c.pendentes||0),0);
  const lanc = MOCK_CLIENTES.reduce((s,c)=>s+(c.lancados||0),0);
  $("#cliPendCount").textContent = `(${pend})`;
  $("#cliLancCount").textContent = `(${lanc})`;

  // enquanto não houver cliente, equipamentos ficam “desabilitados”
  toggleEquipButtons(!clienteSel);
}
function toggleEquipButtons(disabled){
  [$("#btnEqPend"), $("#btnEqLanc")].forEach(el=>{
    if (!el) return;
    el.classList.toggle("disabled", !!disabled);
    el.classList.toggle("primary", !disabled && el.id==="btnEqPend");
  });
}

// ===== picker de clientes =====
function abrirPickerClientes(pendentes){
  const overlay = $("#pickerOverlay");
  const list = $("#pickerList");
  const title = pendentes ? "Clientes — Não lançados" : "Clientes — Já lançados";
  $("#pickerTitle").textContent = title;
  list.innerHTML = "";

  // filtra (mock) — por enquanto só mostra todos
  const arr = MOCK_CLIENTES; // depois: filtra por pendentes/lancados
  arr.forEach(c=>{
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<b>${c.nome}</b><br><small>Rota: ${c.rota} • End.: ${c.end} • Bairro: ${c.bairro}</small>`;
    el.addEventListener("click", ()=>{
      clienteSel = c;
      preencherResumoCliente();
      equipSel = null; // reset equipamento
      toggleEquipButtons(false);
      fecharPicker();
      // depois que escolhe cliente, já pode abrir o picker de equipamento se quiser:
      // abrirPickerEquip(true);
    });
    list.appendChild(el);
  });

  overlay.classList.add("aberto");
}
function fecharPicker(){ $("#pickerOverlay").classList.remove("aberto"); }

function preencherResumoCliente(){
  if (!clienteSel) return;
  $("#r-rota").textContent     = clienteSel.rota || "—";
  $("#r-cliente").textContent  = clienteSel.nome || "—";
  $("#r-end").textContent      = clienteSel.end || "—";
  $("#r-bairro").textContent   = clienteSel.bairro || "—";
  $("#r-data").textContent     = hojeBR();
  $("#r-negativo").textContent = (clienteSel.negativo!=null)
    ? fmtBRL(clienteSel.negativo).replace("R$ ","")
    : "0,00";
}

// ===== picker de equipamentos =====
function abrirPickerEquip(pendentes){
  if (!clienteSel){ alert("Escolha um cliente primeiro."); return; }
  const overlay = $("#pickerOverlay");
  const list = $("#pickerList");
  const title = pendentes ? "Equipamentos — Não lançados" : "Equipamentos — Lançados";
  $("#pickerTitle").textContent = title;
  list.innerHTML = "";

  const arr = MOCK_EQUIP(clienteSel.id).filter(e => pendentes ? e.pendente : !e.pendente);
  if (!arr.length){
    const empty = document.createElement("div");
    empty.className = "item";
    empty.textContent = "Nenhum equipamento nesta lista.";
    list.appendChild(empty);
  } else {
    arr.forEach(m=>{
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `<b>${m.selo}</b> — ${m.jogo}`;
      el.addEventListener("click", ()=>{
        equipSel = m;
        fecharPicker();
        abrirLaunch(); // abre a janelinha “Iniciar lançamento”
      });
      list.appendChild(el);
    });
  }

  overlay.classList.add("aberto");
}

// ===== “Iniciar lançamento” (stub) =====
function abrirLaunch(){
  if (!clienteSel || !equipSel) return;
  $("#launchTitulo").textContent = `${equipSel.selo} (${equipSel.jogo}) — ${clienteSel.nome}`;
  $("#launchOverlay").style.display = "flex";
}
function fecharLaunch(){ $("#launchOverlay").style.display = "none"; }

// ===== salvar (apenas demonstração local) =====
function salvar(){
  if (!clienteSel){ alert("Selecione um cliente."); return; }
  const payload = {
    ts: Date.now(),
    cliente: clienteSel,
    equipamento: equipSel,
  };
  const k = "fechamento_demo_salvos";
  const arr = JSON.parse(localStorage.getItem(k)||"[]");
  arr.push(payload);
  localStorage.setItem(k, JSON.stringify(arr));
  alert("Fechamento salvo (demo). Em produção enviaremos ao backend.");
}
