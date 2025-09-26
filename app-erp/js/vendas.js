import { inicializarPagina, getURLBackend, isOnline } from "../../common/js/navegacao.js";
import pullAndMergeIncremental, { __erpSyncInternals as SY } from "./sync.js";
import { isAdmin } from "../../common/js/auth.js";

const K=SY.KEYS;
let vendedores=[], produtos=[], entradas=[], vendas=[];
let editId=null; let salvando=false;

document.addEventListener("DOMContentLoaded", async () => {
  await inicializarPagina("ERP – Vendas", "erp");
  carregarLocal(); await tentarSync(); carregarLocal();
  preencherSelects(); preencherDatasPadrao(); atualizarDisponivel(); hookMoeda(); hookStatus(); calcTotal();
  document.getElementById("v-vendedor").addEventListener("change", exibirTelefone);
  document.getElementById("v-produto").addEventListener("change", ()=>{ atualizarDisponivel(); sugerirRepasse(); });
  document.getElementById("v-quantidade").addEventListener("input", calcTotal);
  document.getElementById("v-preco").addEventListener("input", calcTotal);
  document.getElementById("v-data").addEventListener("change", atualizarVencimentoPadrao);
  document.getElementById("btn-salvar").addEventListener("click", salvar);
  document.getElementById("btn-limpar").addEventListener("click", limparForm);
  renderRecentes();

  window.addEventListener("storage",(e)=>{ if([K.vendedores,K.produtos,K.entradas,K.vendas,"__erp_last_sync_broadcast"].includes(e.key)){ carregarLocal(); preencherSelects(); atualizarDisponivel(); renderRecentes(); }});
  setInterval(tentarSync,60000);
});

function carregarLocal(){
  try{ vendedores=JSON.parse(localStorage.getItem(K.vendedores))||[] }catch{ vendedores=[] }
  try{ produtos=JSON.parse(localStorage.getItem(K.produtos))||[] }catch{ produtos=[] }
  try{ entradas=JSON.parse(localStorage.getItem(K.entradas))||[] }catch{ entradas=[] }
  try{ vendas=JSON.parse(localStorage.getItem(K.vendas))||[] }catch{ vendas=[] }
  vendedores=vendedores.filter(v=>v.ativo!==false);
  produtos=produtos.filter(p=>p.ativo!==false);
  entradas=entradas.filter(e=>e.ativo!==false && e.tipo==="ENTRADA");
  vendas=vendas.filter(s=>s.ativo!==false);
}
function salvarLocal(){ localStorage.setItem(K.vendas, JSON.stringify(vendas)); }
async function tentarSync(){ try{ await pullAndMergeIncremental(); }catch{} }

const upper=s=>(s||"").toUpperCase();
function fmtDataCurta(iso){ if(!iso) return ""; const d=new Date(iso+"T00:00:00"); const dd=String(d.getDate()).padStart(2,"0"), mm=String(d.getMonth()+1).padStart(2,"0"), yy=String(d.getFullYear()).slice(-2); return `${dd}/${mm}/${yy}`; }
function fmtMoeda(v){ return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function limparMoeda(txt){ if(typeof txt!=="string") return Number(txt)||0; const n=txt.replace(/[^\d,,-.]/g,"").replace(/\./g,"").replace(",","."); const val=Number(n); return isNaN(val)?0:val; }

function preencherSelects(){
  const sv=document.getElementById("v-vendedor");
  const sp=document.getElementById("v-produto");
  sv.innerHTML = `<option value="">-- selecione --</option>`;
  sp.innerHTML = `<option value="">-- selecione --</option>`;
  vendedores.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"))
    .forEach(v=>sv.insertAdjacentHTML("beforeend",`<option value="${v._id}">${upper(v.nome)}</option>`));
  produtos.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"))
    .forEach(p=>sp.insertAdjacentHTML("beforeend",`<option value="${p._id}">${upper(p.nome)} (${p.sku||""})</option>`));
}

function exibirTelefone(){
  const id=document.getElementById("v-vendedor").value;
  const v=vendedores.find(x=>x._id===id);
  document.getElementById("v-telefone").textContent=v?.telefone||"";
}

function estoqueDisponivel(produtoId){
  let ent=0; for(const e of entradas) if(e.produtoId===produtoId) ent += (e.quantidade||0);
  let sai=0; for(const s of vendas)   if(s.produtoId===produtoId) sai += (s.quantidade||0);
  return ent - sai;
}
function atualizarDisponivel(){
  const produtoId=document.getElementById("v-produto").value;
  document.getElementById("v-disponivel").textContent = produtoId ? estoqueDisponivel(produtoId) : 0;
}

function sugerirRepasse(){
  const produtoId=document.getElementById("v-produto").value;
  const p=produtos.find(x=>x._id===produtoId);
  if(!p) return;
  const el=document.getElementById("v-preco");
  if(el && (limparMoeda(el.value)===0)){
    const rep=Number(p.precoRepasse||0);
    if(rep>0){ el.value = fmtMoeda(rep); }
  }
  calcTotal();
}

function preencherDatasPadrao(){
  const hoje=new Date().toISOString().slice(0,10);
  document.getElementById("v-data").value=hoje;
  atualizarVencimentoPadrao();
}
function atualizarVencimentoPadrao(){
  const dataStr=document.getElementById("v-data").value || new Date().toISOString().slice(0,10);
  const d=new Date(dataStr+"T00:00:00"); d.setDate(d.getDate()+7);
  document.getElementById("v-vencimento").value=d.toISOString().slice(0,10);
}
function hookMoeda(){
  const el=document.getElementById("v-preco");
  const h=()=>{ const n=limparMoeda(el.value); el.value=fmtMoeda(n); calcTotal(); };
  el.addEventListener("input",h); el.addEventListener("blur",h);
}
function hookStatus(){
  const sel=document.getElementById("v-status");
  const bloco=document.getElementById("bloco-forma");
  const apply=()=>{ bloco.style.display = sel.value==="PAGO" ? "grid":"none"; };
  sel.addEventListener("change",apply); apply();
}
function calcTotal(){
  const q=Number(document.getElementById("v-quantidade").value||0);
  const u=limparMoeda(document.getElementById("v-preco").value||"0");
  document.getElementById("v-total").value = fmtMoeda(q*u);
}

function coletarForm(){
  const vendedorId=document.getElementById("v-vendedor").value;
  const vendedor=vendedores.find(x=>x._id===vendedorId);
  const produtoId=document.getElementById("v-produto").value;
  const produto=produtos.find(x=>x._id===produtoId);
  const precoUnit=limparMoeda(document.getElementById("v-preco").value||"0");
  const quantidade=Number(document.getElementById("v-quantidade").value||0);
  const status=document.getElementById("v-status").value;

  return {
    vendedorId,
    vendedorNome: upper(vendedor?.nome||""),
    telefone: vendedor?.telefone||"",
    produtoId,
    sku: upper(produto?.sku||""),
    nomeProduto: upper(produto?.nome||""),
    quantidade,
    precoUnit,
    total: quantidade*precoUnit,
    dataVenda: document.getElementById("v-data").value,
    vencimento: document.getElementById("v-vencimento").value,
    status,
    dataPagamento: status==="PAGO" ? (document.getElementById("v-data").value||null) : null,
    formaPagamento: status==="PAGO" ? (document.getElementById("v-forma").value||"") : "",
    obs: (document.getElementById("v-obs").value||"").trim(),
    tipo:"SAIDA",
    ativo:true
  };
}

async function salvar(){
  if(salvando) return;
  const f=coletarForm();
  if(!f.vendedorId){ alert("Selecione o vendedor."); return; }
  if(!f.produtoId){ alert("Selecione o produto."); return; }
  if(f.quantidade<=0){ alert("Quantidade deve ser > 0."); return; }
  const disp=estoqueDisponivel(f.produtoId);
  if(f.quantidade>disp){ alert(`Estoque insuficiente. Disp.: ${disp}`); return; }

  salvando=true;
  const now=new Date().toISOString();
  const isEditing=!!editId;
  const isLocalEdit=isEditing && String(editId).startsWith("local_");
  const tempId=isEditing?null:"local_"+Math.random().toString(36).slice(2);

  if(isEditing){
    if(!isAdmin()){ alert("Somente o administrador pode editar vendas."); salvando=false; return; }
    const i=vendas.findIndex(s=>s._id===editId);
    if(i>=0) vendas[i]={...vendas[i], ...f, updatedAt:now};
  }else{
    vendas.push({_id:tempId, ...f, createdAt:now, updatedAt:now});
  }
  salvarLocal(); limparForm(); renderRecentes(); atualizarDisponivel();

  if(await isOnline()){
    try{
      const doPOST = !isEditing || isLocalEdit;
      const method = doPOST ? "POST" : "PUT";
      const url = `${getURLBackend()}/api/erp/vendas${doPOST?"":`/${editId}`}`;
      const resp=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});
      if(resp.ok){
        const doc=await resp.json();
        const idToReplace = doPOST ? (isEditing?editId:tempId) : editId;
        const j=vendas.findIndex(s=>s._id===idToReplace);
        if(j>=0){ vendas[j]=doc; salvarLocal(); renderRecentes(); atualizarDisponivel(); }
      }
    }catch{}
  }
  editId=null; salvando=false;
}

function editar(id){
  if(!isAdmin()){ alert("Somente o administrador pode editar vendas."); return; }
  const s=vendas.find(x=>x._id===id); if(!s) return; editId=id;
  document.getElementById("v-vendedor").value=s.vendedorId||""; exibirTelefone();
  document.getElementById("v-produto").value=s.produtoId||""; atualizarDisponivel();
  document.getElementById("v-quantidade").value=s.quantidade??"";
  document.getElementById("v-preco").value=fmtMoeda(s.precoUnit??0); calcTotal();
  document.getElementById("v-data").value=s.dataVenda||"";
  document.getElementById("v-vencimento").value=s.vencimento||"";
  document.getElementById("v-status").value=s.status||"PENDENTE";
  document.getElementById("v-forma").value=s.formaPagamento||"";
  document.getElementById("v-obs").value=s.obs||"";
  hookStatus();
  window.scrollTo({top:0,behavior:"smooth"});
}

async function remover(id){
  if(!isAdmin()){ alert("Somente o administrador pode remover vendas."); return; }
  if(!confirm("Remover esta venda?")) return;
  const i=vendas.findIndex(s=>s._id===id);
  if(i>=0){ vendas[i]={...vendas[i], ativo:false, updatedAt:new Date().toISOString()}; salvarLocal(); renderRecentes(); atualizarDisponivel(); }
  if(!String(id).startsWith("local_") && await isOnline()){
    try{ await fetch(`${getURLBackend()}/api/erp/vendas/${id}`,{method:"DELETE"}); }catch{}
  }
}

function limparForm(){
  ["v-vendedor","v-produto","v-quantidade","v-preco","v-total","v-data","v-vencimento","v-status","v-forma","v-obs"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  preencherDatasPadrao(); exibirTelefone(); atualizarDisponivel(); hookMoeda(); hookStatus(); calcTotal();
}

function renderRecentes(){
  const tbody=document.getElementById("lista-recentes"); tbody.innerHTML="";
  const admin=isAdmin();
  const ult3=[...vendas].filter(s=>s.ativo!==false).sort((a,b)=>(b.dataVenda||"").localeCompare(a.dataVenda||"")).slice(0,3);
  for(const s of ult3){
    const badge = (s.status||"PENDENTE").toUpperCase()==="PAGO" ? `<span class="badge b-pago">PAGO</span>` : `<span class="badge b-pend">PEND.</span>`;
    const acoes = admin
      ? `<button title="Editar" onclick="editar('${s._id}')"><i class="fa-solid fa-pen-to-square"></i></button>
         <button title="Remover" onclick="remover('${s._id}')"><i class="fa-solid fa-trash"></i></button>`
      : "";
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td class="col-data">${fmtDataCurta(s.dataVenda)}</td>
      <td class="col-vend" title="${s.vendedorNome||""}">${s.vendedorNome||""}</td>
      <td class="col-total" style="text-align:right">${fmtMoeda(s.total)}</td>
      <td class="col-venc">${fmtDataCurta(s.vencimento)}</td>
      <td class="col-status">${badge}</td>
      <td class="col-acao" style="text-align:right">${acoes}</td>`;
    tbody.appendChild(tr);
  }
}

window.editar=editar; window.remover=remover;
