function num(v){
  if(!v) return 0
  return Number(String(v).replace(/\./g,'').replace(',','.')) || 0
}

function moeda(v){
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}

function valorCampo(id){
  return num(document.getElementById(id).value)
}

function atualizarResumo(){

  const turano = valorCampo("turano")
  const rc = valorCampo("rc")
  const centro = valorCampo("centro")

  const totalRota = turano + rc + centro

  const comissao = totalRota / 0.915 - totalRota

  const cartaoPassado = valorCampo("cartaoPassado")
  const cartaoPassadoLiquido = cartaoPassado * 0.95

  const cartaoAtual = valorCampo("cartaoAtual")

  const devAntReceb = valorCampo("recebimentosAnteriores")

  const debitos = somarDebitos()

  const devedores = somarDevedores()

  const firma =
    totalRota
    + cartaoPassadoLiquido
    - cartaoAtual
    - debitos
    + devedores
    + devAntReceb

  atualizarCampo("total",totalRota)
  atualizarCampo("comissao",comissao)

  atualizarCampo("debitosResumo",debitos)
  atualizarCampo("devedoresResumo",devedores)

  atualizarCampo("firma",firma)

  atualizarCard("cardTotal",totalRota)
  atualizarCard("cardComissao",comissao)
  atualizarCard("cardFirma",firma)

}

function atualizarCampo(id,valor){
  const campo = document.getElementById(id)
  if(!campo) return

  campo.value = valor.toLocaleString("pt-BR",{minimumFractionDigits:2})
}

function atualizarCard(id,valor){
  const el = document.getElementById(id)
  if(!el) return

  el.textContent = moeda(valor)
}

function somarDebitos(){

  let total = 0

  document.querySelectorAll(".debitoValor").forEach(input=>{
    total += num(input.value)
  })

  return total
}

function somarDevedores(){

  let total = 0

  document.querySelectorAll(".devedorLinha").forEach(linha=>{

    const anterior = num(linha.querySelector(".valorAnterior")?.value)
    const atual = num(linha.querySelector(".valorAtual")?.value)

    const saldo = anterior - atual

    total += saldo

  })

  return total
}

document.querySelectorAll("input").forEach(input=>{
  input.addEventListener("input",atualizarResumo)
})

setInterval(atualizarResumo,500)