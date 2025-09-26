import { inicializarPagina, getURLBackend, isOnline } from "../../common/js/navegacao.js";
import pullAndMergeIncremental, { __erpSyncInternals as SY } from "./sync.js";
import { isAdmin } from "../../common/js/auth.js";

const K=SY.KEYS;
let vendedores=[], produtos=[], vendas=[];

document.addEventListener("DOMContentLoaded", async () => {
  await inicializarPagina("ERP – Registro de Vendas", "erp", { backHref: "./vendas.html" });
  carregarLocal(); await tentarSync(); carregarLocal();
  preencherTabela();
  document.getElementById("busca").addEventListener("input", preencherTabela);
  window.addEventListener("storage",(e)=>{ if([K.vendedores,K.produtos,K.vendas,"__erp_last_sync_broadcast"].includes(e.key)){ carregarLocal(); preencherTabela(); }});
});

function carregarLocal(){
  try{ vendedores=JSON.parse(localStorage.getItem(K.vendedores))||[] }catch{ vendedores=[] }
  try{ produtos=JSON.parse(localStorage.getItem(K.produtos))||[] }catch{ produtos=[] }
  try{ vendas=JSON.parse(localStorage.getItem(K.vendas))||[] }catch{ vendas=[] }
  vendedores=vendedores.filter(x=>x.ativo!==false);
  produtos=produtos.filter(x=>x.ativo!==false);
  vendas=vendas.filter(x=>x.ativo!==false);
}
async function tentarSync(){ try{ await pullAndMergeIncremental(); }catch{} }

function fmt(s){ return (s||"").toUpperCase(); }
function fmtMoeda(v){ return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function dataCurta(iso){ if(!iso) return ""; const d=new Date(iso+"T00:00:00"); const dd=String(d.getDate()).padStart(2,"0"),mm=String(d.getMonth()+1).padStart(2,"0"),yy=String(d.getFullYear()).slice(-2); return `${dd}/${mm}/${yy}`; }

function preencherTabela(){
  const q=(document.getElementById("busca").value||"").trim().toUpperCase();
  const tbody=document.getElementById("lista"); tbody.innerHTML="";
  const arr=[...vendas].sort((a,b)=>(b.dataVenda||"").localeCompare(a.dataVenda||""))
    .filter(v=>{
      const txt=`${fmt(v.vendedorNome)} ${fmt(v.nomeProduto)} ${fmt(v.sku)} ${fmt(v.status)} ${fmt(v.formaPagamento)} ${fmt(v.obs)}`;
      return !q || txt.includes(q);
    });

  const admin = isAdmin();
  for(const s of arr){
    const badge = (s.status||"PENDENTE").toUpperCase()==="PAGO"
      ? `<span class="badge b-pago" style="background:#dcfce7;color:#065f46;padding:2px 6px;border-radius:999px;font-weight:700;">PAGO</span>`
      : `<span class="badge b-pend" style="background:#fee2e2;color:#7f1d1d;padding:2px 6px;border-radius:999px;font-weight:700;">PEND.</span>`;

    const acoes = admin
      ? `<button title="Editar" onclick="window.location.href='./vendas.html#edit=${s._id}'"><i class="fa-solid fa-pen-to-square"></i></button>
         <button title="Remover" onclick="remover('${s._id}')"><i class="fa-solid fa-trash"></i></button>`
      : "";

    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${dataCurta(s.dataVenda)}</td>
      <td>${fmt(s.vendedorNome)}</td>
      <td>${fmt(s.nomeProduto)} (${s.sku||""})</td>
      <td>${s.quantidade||0}</td>
      <td>${fmtMoeda(s.precoUnit||0)}</td>
      <td>${fmtMoeda(s.total||0)}</td>
      <td>${dataCurta(s.vencimento)}</td>
      <td>${badge}</td>
      <td class="acoes-linha" style="text-align:right">${acoes}</td>`;
    tbody.appendChild(tr);
  }
}

async function remover(id){
  if(!isAdmin()){ alert("Somente o administrador pode remover vendas."); return; }
  if(!confirm("Remover esta venda?")) return;
  const arr = JSON.parse(localStorage.getItem(K.vendas))||[];
  const i=arr.findIndex(x=>x._id===id);
  if(i>=0){ arr[i]={...arr[i], ativo:false, updatedAt:new Date().toISOString()}; localStorage.setItem(K.vendas, JSON.stringify(arr)); preencherTabela(); }
  if(!String(id).startsWith("local_") && await isOnline()){
    try{ await fetch(`${getURLBackend()}/api/erp/vendas/${id}`,{method:"DELETE"}); }catch{}
  }
}

window.remover=remover;
