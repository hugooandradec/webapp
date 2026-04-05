import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "fechamento_react_v1";

function salvarLocalmente(payload) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function lerLocalmente() {
  try {
    if (typeof window === "undefined") return null;
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

const DEBITO_VAZIO = { ponto: "", valor: "" };
const VALE_VAZIO = {
  ponto: "",
  valorAnterior: "",
  pago: "",
  semana: "",
  valorAtual: "",
};

function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarMoedaDigitada(valor) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return "";
  const numero = Number(digitos) / 100;

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numeroDeMoeda(texto) {
  if (!texto) return 0;

  const numero = Number(String(texto).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function moedaBR(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarMoedaSemSimbolo(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function classeValor(valor) {
  if (valor > 0) return "positivo";
  if (valor < 0) return "negativo";
  return "";
}

function valorComSinal(valor) {
  if (valor < 0) return `-${moedaBR(Math.abs(valor))}`;
  return moedaBR(valor);
}

function calcularComissaoVisual(valorLiquidoRota) {
  if (!valorLiquidoRota) return 0;
  return (valorLiquidoRota / 0.915) * 0.085;
}

function formatarDataBR(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return "-";
  return `${dia}/${mes}/${ano}`;
}

function periodoTexto(inicio, fim) {
  if (!inicio && !fim) return "-";
  if (inicio && fim) return `${formatarDataBR(inicio)} - ${formatarDataBR(fim)}`;
  return formatarDataBR(inicio || fim);
}

function criarEstadoInicial() {
  return {
    dados: {
      periodoInicio: "",
      periodoFim: "",
      turano: "",
      rc: "",
      centro: "",
      cartaoPassado: "",
      cartaoAtual: "",
    },
    debitos: [],
    devedores: [],
  };
}

export default function Fechamento() {
  const estadoInicial = criarEstadoInicial();
  const [dados, setDados] = useState(estadoInicial.dados);
  const [debitos, setDebitos] = useState(estadoInicial.debitos);
  const [devedores, setDevedores] = useState(estadoInicial.devedores);
  const [modalAberto, setModalAberto] = useState(false);

  const refsDebitos = useRef([]);
  const refsDevedores = useRef([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const salvo = lerLocalmente();
    if (salvo) {
      setDados({ ...estadoInicial.dados, ...(salvo.dados || {}) });
      setDebitos(Array.isArray(salvo.debitos) ? salvo.debitos : []);
      setDevedores(Array.isArray(salvo.devedores) ? salvo.devedores : []);
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    salvarLocalmente({ dados, debitos, devedores });
  }, [carregado, dados, debitos, devedores]);

  function atualizarCampo(campo, valor, monetario = false) {
    setDados((prev) => {
      const proximo = {
        ...prev,
        [campo]: monetario ? formatarMoedaDigitada(valor) : valor,
      };
      salvarLocalmente({ dados: proximo, debitos, devedores });
      return proximo;
    });
  }

  function atualizarDebito(index, campo, valor, monetario = false) {
    setDebitos((prev) => {
      const proximo = prev.map((item, i) =>
        i === index
          ? { ...item, [campo]: monetario ? formatarMoedaDigitada(valor) : valor }
          : item
      );
      salvarLocalmente({ dados, debitos: proximo, devedores });
      return proximo;
    });
  }

  function adicionarDebito() {
    setDebitos((prev) => {
      const proximo = [...prev, { ...DEBITO_VAZIO }];
      salvarLocalmente({ dados, debitos: proximo, devedores });
      setTimeout(() => refsDebitos.current[proximo.length - 1]?.focus(), 0);
      return proximo;
    });
  }

  function removerDebito(index) {
    setDebitos((prev) => {
      const proximo = prev.filter((_, i) => i !== index);
      salvarLocalmente({ dados, debitos: proximo, devedores });
      return proximo;
    });
  }

  function calcularValorAtual(item) {
    const anterior = numeroDeMoeda(item.valorAnterior);
    const pago = numeroDeMoeda(item.pago);
    const semana = numeroDeMoeda(item.semana);
    const atual = anterior - pago + semana;
    return atual > 0 ? formatarMoedaSemSimbolo(atual) : "0,00";
  }

  function atualizarDevedor(index, campo, valor, monetario = false) {
    setDevedores((prev) => {
      const proximo = prev.map((item, i) => {
        if (i !== index) return item;

        const atualizado = {
          ...item,
          [campo]: monetario ? formatarMoedaDigitada(valor) : valor,
        };

        return {
          ...atualizado,
          valorAtual: calcularValorAtual(atualizado),
        };
      });
      salvarLocalmente({ dados, debitos, devedores: proximo });
      return proximo;
    });
  }

  function adicionarDevedor() {
    setDevedores((prev) => {
      const proximo = [...prev, { ...VALE_VAZIO }];
      salvarLocalmente({ dados, debitos, devedores: proximo });
      setTimeout(() => refsDevedores.current[proximo.length - 1]?.focus(), 0);
      return proximo;
    });
  }

  function removerDevedor(index) {
    setDevedores((prev) => {
      const proximo = prev.filter((_, i) => i !== index);
      salvarLocalmente({ dados, debitos, devedores: proximo });
      return proximo;
    });
  }

  function limparTudo() {
    setDados(estadoInicial.dados);
    setDebitos([]);
    setDevedores([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  const totalRota = useMemo(
    () => numeroDeMoeda(dados.turano) + numeroDeMoeda(dados.rc) + numeroDeMoeda(dados.centro),
    [dados.turano, dados.rc, dados.centro]
  );

  const comissao = useMemo(() => calcularComissaoVisual(totalRota), [totalRota]);
  const cartaoPassadoLiquido = useMemo(
    () => numeroDeMoeda(dados.cartaoPassado) * 0.95,
    [dados.cartaoPassado]
  );
  const cartaoAtual = useMemo(() => numeroDeMoeda(dados.cartaoAtual), [dados.cartaoAtual]);

  const totalDebitos = useMemo(
    () => debitos.reduce((acc, item) => acc + numeroDeMoeda(item.valor), 0),
    [debitos]
  );

  const resumoDevedores = useMemo(() => {
    return devedores.reduce(
      (acc, item) => {
        const anterior = numeroDeMoeda(item.valorAnterior);
        const atual = numeroDeMoeda(item.valorAtual);
        const saldoSemana = anterior - atual;

        if (saldoSemana > 0) {
          acc.devAntReceb += saldoSemana;
        } else if (saldoSemana < 0) {
          acc.devedores += Math.abs(saldoSemana);
        }

        acc.lista.push({
          ...item,
          saldoSemana,
        });

        return acc;
      },
      { devAntReceb: 0, devedores: 0, lista: [] }
    );
  }, [devedores]);

  const totalDevedores = resumoDevedores.devedores;
  const devAntReceb = resumoDevedores.devAntReceb;
  const debitosMaisDevedores = totalDebitos + totalDevedores;

  const firma = useMemo(() => {
    return totalRota - debitosMaisDevedores - cartaoAtual + cartaoPassadoLiquido + devAntReceb;
  }, [totalRota, debitosMaisDevedores, cartaoAtual, cartaoPassadoLiquido, devAntReceb]);

  const debitosParaResumo = debitos.filter(
    (item) => item.ponto.trim() || numeroDeMoeda(item.valor) !== 0
  );

  const devedoresParaResumo = resumoDevedores.lista.filter(
    (item) =>
      item.ponto.trim() ||
      numeroDeMoeda(item.valorAnterior) ||
      numeroDeMoeda(item.valorAtual) ||
      item.saldoSemana
  );

  const totalRotasResumo = totalRota;
  const cartaoAnteriorResumo = cartaoPassadoLiquido;
  const cartaoAtualResumo = -cartaoAtual;
  const debitosResumo = -totalDebitos;
  const valesResumo = -totalDevedores;
  const valesPagosResumo = devAntReceb;
  const firmaResumo = firma;

  return (
    <main className="pagina-fechamento">
      <section className="bloco bloco-principal">
        <h2 className="titulo-bloco">Dados Principais</h2>

        <div className="grid-4">
          <div className="campo campo-periodo">
            <label>Período</label>
            <div className="periodo-grid">
              <input
                type="date"
                value={dados.periodoInicio}
                onChange={(e) => atualizarCampo("periodoInicio", e.target.value)}
              />
              <input
                type="date"
                value={dados.periodoFim}
                onChange={(e) => atualizarCampo("periodoFim", e.target.value)}
              />
            </div>
          </div>

          <div className="campo">
            <label>Turano</label>
            <input
              type="text"
              value={dados.turano}
              onChange={(e) => atualizarCampo("turano", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>RC</label>
            <input
              type="text"
              value={dados.rc}
              onChange={(e) => atualizarCampo("rc", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Centro</label>
            <input
              type="text"
              value={dados.centro}
              onChange={(e) => atualizarCampo("centro", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Cartão Anterior</label>
            <input
              type="text"
              value={dados.cartaoPassado}
              onChange={(e) => atualizarCampo("cartaoPassado", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Cartão Atual</label>
            <input
              type="text"
              value={dados.cartaoAtual}
              onChange={(e) => atualizarCampo("cartaoAtual", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>
        </div>

        <div className="acoes-topo">
          <button className="btn btn-roxo" type="button" onClick={() => setModalAberto(true)}>
            Resumo
          </button>
          <button className="btn btn-claro" type="button" onClick={limparTudo}>
            Limpar Tudo
          </button>
        </div>

        <div className="resumo-cards">
          <div className="card-resumo">
            <div className="rotulo">Total Rota</div>
            <div className={`valor ${classeValor(totalRota)}`}>{valorComSinal(totalRota)}</div>
          </div>

          <div className="card-resumo">
            <div className="rotulo">Comissão</div>
            <div className={`valor ${classeValor(comissao)}`}>{valorComSinal(comissao)}</div>
          </div>

          <div className="card-resumo">
            <div className="rotulo">Firma (Saldo Final)</div>
            <div className={`valor ${classeValor(firma)}`}>{valorComSinal(firma)}</div>
          </div>
        </div>

        <div className="mini-resumo">
          <div className="mini-card">
            <h3>Rotas</h3>
            <div className="linha">
              <span>Turano</span>
              <strong className={classeValor(numeroDeMoeda(dados.turano))}>
                {valorComSinal(numeroDeMoeda(dados.turano))}
              </strong>
            </div>
            <div className="linha">
              <span>RC</span>
              <strong className={classeValor(numeroDeMoeda(dados.rc))}>
                {valorComSinal(numeroDeMoeda(dados.rc))}
              </strong>
            </div>
            <div className="linha">
              <span>Centro</span>
              <strong className={classeValor(numeroDeMoeda(dados.centro))}>
                {valorComSinal(numeroDeMoeda(dados.centro))}
              </strong>
            </div>
          </div>

          <div className="mini-card">
            <h3>Complementos</h3>

            <div className="linha">
              <span>Cartão Anterior</span>
              <strong className={classeValor(cartaoPassadoLiquido)}>
                {valorComSinal(cartaoPassadoLiquido)}
              </strong>
            </div>

            <div className="linha">
              <span>Cartão Atual</span>
              <strong className={classeValor(-cartaoAtual)}>
                {valorComSinal(-cartaoAtual)}
              </strong>
            </div>

            <div className="linha">
              <span>Vales Pagos</span>
              <strong className={classeValor(devAntReceb)}>
                {valorComSinal(devAntReceb)}
              </strong>
            </div>

            <div className="linha">
              <span>Débitos + Vales</span>
              <strong className={classeValor(-debitosMaisDevedores)}>
                {valorComSinal(-debitosMaisDevedores)}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="bloco">
        <h2 className="titulo-bloco">Débitos</h2>

        {debitos.length === 0 ? <div className="estado-vazio">Nenhum débito cadastrado.</div> : null}

        <div className="debitos-grid">
          {debitos.map((item, index) => (
            <div className="linha-item" key={`debito-${index}`}>
              <div className="subtitulo-lista">
                <button
                  className="btn btn-vermelho"
                  type="button"
                  onClick={() => removerDebito(index)}
                  title="Remover débito"
                >
                  🗑
                </button>
              </div>

              <div className="grid-2">
                <div className="campo">
                  <label>Ponto / Descrição</label>
                  <input
                    ref={(el) => (refsDebitos.current[index] = el)}
                    type="text"
                    value={item.ponto}
                    onChange={(e) => atualizarDebito(index, "ponto", e.target.value)}
                    placeholder="Digite aqui..."
                  />
                </div>

                <div className="campo">
                  <label>Valor</label>
                  <input
                    type="text"
                    value={item.valor}
                    onChange={(e) => atualizarDebito(index, "valor", e.target.value, true)}
                    inputMode="numeric"
                    placeholder="Digite aqui..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="acoes-lista">
          <button
            className="btn btn-roxo"
            type="button"
            onClick={adicionarDebito}
            title="Adicionar débito"
          >
            +
          </button>
        </div>
      </section>

      <section className="bloco">
        <h2 className="titulo-bloco">Vales</h2>

        {devedores.length === 0 ? <div className="estado-vazio">Nenhum vale cadastrado.</div> : null}

        {devedores.map((item, index) => {
          const saldoSemana = numeroDeMoeda(item.valorAnterior) - numeroDeMoeda(item.valorAtual);
          return (
            <div className="linha-item linha-item-vale" key={`devedor-${index}`}>
              <div className="subtitulo-lista">
                <button
                  className="btn btn-vermelho"
                  type="button"
                  onClick={() => removerDevedor(index)}
                  title="Remover vale"
                >
                  🗑
                </button>
              </div>

              <div className="grid-vales">
                <div className="campo">
                  <label>Ponto</label>
                  <input
                    ref={(el) => (refsDevedores.current[index] = el)}
                    type="text"
                    value={item.ponto}
                    onChange={(e) => atualizarDevedor(index, "ponto", e.target.value)}
                    placeholder="Digite aqui..."
                  />
                </div>

                <div className="campo">
                  <label>Vale Anterior</label>
                  <input
                    type="text"
                    value={item.valorAnterior}
                    onChange={(e) => atualizarDevedor(index, "valorAnterior", e.target.value, true)}
                    inputMode="numeric"
                    placeholder="Digite aqui..."
                  />
                </div>

                <div className="campo">
                  <label>Vale Pago</label>
                  <input
                    type="text"
                    value={item.pago}
                    onChange={(e) => atualizarDevedor(index, "pago", e.target.value, true)}
                    inputMode="numeric"
                    placeholder="Digite aqui..."
                  />
                </div>

                <div className="campo">
                  <label>Vale da Semana</label>
                  <input
                    type="text"
                    value={item.semana}
                    onChange={(e) => atualizarDevedor(index, "semana", e.target.value, true)}
                    inputMode="numeric"
                    placeholder="Digite aqui..."
                  />
                </div>

                <div className="campo">
                  <label>Valor Atual</label>
                  <input type="text" value={item.valorAtual || "0,00"} readOnly />
                </div>
              </div>

              <div className="campo campo-saldo-semana">
                <label>Saldo da Semana</label>
                <input
                  type="text"
                  value={valorComSinal(saldoSemana)}
                  readOnly
                  className={classeValor(saldoSemana)}
                />
              </div>
            </div>
          );
        })}

        <div className="acoes-lista">
          <button
            className="btn btn-roxo"
            type="button"
            onClick={adicionarDevedor}
            title="Adicionar vale"
          >
            +
          </button>
        </div>
      </section>

      <div className={`modal modal-resumo-full ${modalAberto ? "ativo" : ""}`} onClick={() => setModalAberto(false)}>
        <div className="modal-conteudo modal-conteudo-resumo-full" onClick={(e) => e.stopPropagation()}>
          <div className="fechar-modal fechar-modal-resumo-full">
            <button className="btn-fechar" type="button" onClick={() => setModalAberto(false)}>
              ×
            </button>
          </div>

          <div className="relatorio relatorio-resumo-full">
            <div className="relatorio-topo">
              <h2>Resumo</h2>
              <p>
                <strong>Período:</strong> {periodoTexto(dados.periodoInicio, dados.periodoFim)}
              </p>
            </div>

            <div className="relatorio-cards relatorio-cards-resumo">
              <div className="rel-card">
                <div className="r1">Rotas</div>
                <div className={`r2 ${classeValor(totalRotasResumo)}`}>
                  {valorComSinal(totalRotasResumo)}
                </div>
              </div>

              <div className="rel-card">
                <div className="r1">Firma</div>
                <div className={`r2 ${classeValor(firmaResumo)}`}>
                  {valorComSinal(firmaResumo)}
                </div>
              </div>
            </div>

            <div className="secao-relatorio secao-resumo-geral">
              <h3>Resumo</h3>

              <div className="resumo-geral-lista">
                <div className="resumo-geral-linha">
                  <span>Rotas</span>
                  <strong className={classeValor(totalRotasResumo)}>
                    {valorComSinal(totalRotasResumo)}
                  </strong>
                </div>

                <div className="resumo-geral-linha">
                  <span>Cartão Anterior - 5%</span>
                  <strong className={classeValor(cartaoAnteriorResumo)}>
                    {valorComSinal(cartaoAnteriorResumo)}
                  </strong>
                </div>

                <div className="resumo-geral-linha">
                  <span>Cartão Atual</span>
                  <strong className={classeValor(cartaoAtualResumo)}>
                    {valorComSinal(cartaoAtualResumo)}
                  </strong>
                </div>

                <div className="resumo-geral-linha">
                  <span>Débitos</span>
                  <strong className={classeValor(debitosResumo)}>
                    {valorComSinal(debitosResumo)}
                  </strong>
                </div>

                <div className="resumo-geral-linha">
                  <span>Vales</span>
                  <strong className={classeValor(valesResumo)}>
                    {valorComSinal(valesResumo)}
                  </strong>
                </div>

                <div className="resumo-geral-linha">
                  <span>Vales Pagos</span>
                  <strong className={classeValor(valesPagosResumo)}>
                    {valorComSinal(valesPagosResumo)}
                  </strong>
                </div>

                <div className="resumo-geral-linha total">
                  <span>Firma (Saldo Final)</span>
                  <strong className={classeValor(firmaResumo)}>
                    {valorComSinal(firmaResumo)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="secao-relatorio">
              <h3>Total Rotas</h3>

              <div className="tabela-wrap tabela-desktop">
                <table className="tabela-relatorio">
                  <thead>
                    <tr>
                      <th>Turano</th>
                      <th>RC</th>
                      <th>Centro</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={classeValor(numeroDeMoeda(dados.turano))}>
                        {valorComSinal(numeroDeMoeda(dados.turano))}
                      </td>
                      <td className={classeValor(numeroDeMoeda(dados.rc))}>
                        {valorComSinal(numeroDeMoeda(dados.rc))}
                      </td>
                      <td className={classeValor(numeroDeMoeda(dados.centro))}>
                        {valorComSinal(numeroDeMoeda(dados.centro))}
                      </td>
                      <td className={classeValor(totalRota)}>{valorComSinal(totalRota)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="lista-mobile">
                <div className="card-mobile card-mobile-compacto">
                  <div className="linha-mobile">
                    <span>Turano</span>
                    <strong className={classeValor(numeroDeMoeda(dados.turano))}>
                      {valorComSinal(numeroDeMoeda(dados.turano))}
                    </strong>
                  </div>

                  <div className="linha-mobile">
                    <span>RC</span>
                    <strong className={classeValor(numeroDeMoeda(dados.rc))}>
                      {valorComSinal(numeroDeMoeda(dados.rc))}
                    </strong>
                  </div>

                  <div className="linha-mobile">
                    <span>Centro</span>
                    <strong className={classeValor(numeroDeMoeda(dados.centro))}>
                      {valorComSinal(numeroDeMoeda(dados.centro))}
                    </strong>
                  </div>

                  <div className="linha-mobile linha-mobile-total">
                    <span>Total</span>
                    <strong className={classeValor(totalRota)}>{valorComSinal(totalRota)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="secao-relatorio">
              <h3>Débitos</h3>

              <div className="tabela-wrap tabela-desktop">
                <table className="tabela-relatorio">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debitosParaResumo.length === 0 ? (
                      <tr>
                        <td>1</td>
                        <td>-</td>
                        <td>{moedaBR(0)}</td>
                      </tr>
                    ) : (
                      debitosParaResumo.map((item, index) => (
                        <tr key={`debito-resumo-${index}`}>
                          <td>{index + 1}</td>
                          <td>{item.ponto || "-"}</td>
                          <td className={classeValor(-numeroDeMoeda(item.valor))}>
                            {valorComSinal(-numeroDeMoeda(item.valor))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="lista-mobile">
                {debitosParaResumo.length === 0 ? (
                  <div className="card-mobile card-mobile-linha-unica">
                    <div className="linha-mobile-inline">
                      <span>-</span>
                      <strong>{moedaBR(0)}</strong>
                    </div>
                  </div>
                ) : (
                  debitosParaResumo.map((item, index) => (
                    <div className="card-mobile card-mobile-linha-unica" key={`debito-resumo-mobile-${index}`}>
                      <div className="linha-mobile-inline">
                        <span>{item.ponto || "-"}</span>
                        <strong className={classeValor(-numeroDeMoeda(item.valor))}>
                          {valorComSinal(-numeroDeMoeda(item.valor))}
                        </strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="secao-relatorio">
              <h3>Vales</h3>

              <div className="tabela-wrap tabela-desktop">
                <table className="tabela-relatorio">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ponto</th>
                      <th>Anterior</th>
                      <th>Atual</th>
                      <th>Saldo da Semana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devedoresParaResumo.length === 0 ? (
                      <tr>
                        <td>1</td>
                        <td>-</td>
                        <td>{moedaBR(0)}</td>
                        <td>{moedaBR(0)}</td>
                        <td>{moedaBR(0)}</td>
                      </tr>
                    ) : (
                      devedoresParaResumo.map((item, index) => (
                        <tr key={`devedor-resumo-${index}`}>
                          <td>{index + 1}</td>
                          <td>{item.ponto || "-"}</td>
                          <td>{valorComSinal(numeroDeMoeda(item.valorAnterior))}</td>
                          <td>{valorComSinal(numeroDeMoeda(item.valorAtual))}</td>
                          <td className={classeValor(item.saldoSemana)}>
                            {valorComSinal(item.saldoSemana)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="lista-mobile">
                {devedoresParaResumo.length === 0 ? (
                  <div className="card-mobile card-mobile-vale">
                    <div className="titulo-mobile titulo-mobile-vale">-</div>

                    <div className="grid-mobile-vale">
                      <div className="info-mobile-vale">
                        <span>Anterior</span>
                        <strong>{moedaBR(0)}</strong>
                      </div>

                      <div className="info-mobile-vale">
                        <span>Atual</span>
                        <strong>{moedaBR(0)}</strong>
                      </div>

                      <div className="info-mobile-vale info-mobile-vale-full">
                        <span>Saldo da Semana</span>
                        <strong>{moedaBR(0)}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  devedoresParaResumo.map((item, index) => (
                    <div className="card-mobile card-mobile-vale" key={`devedor-resumo-mobile-${index}`}>
                      <div className="titulo-mobile titulo-mobile-vale">{item.ponto || "-"}</div>

                      <div className="grid-mobile-vale">
                        <div className="info-mobile-vale">
                          <span>Anterior</span>
                          <strong>{valorComSinal(numeroDeMoeda(item.valorAnterior))}</strong>
                        </div>

                        <div className="info-mobile-vale">
                          <span>Atual</span>
                          <strong>{valorComSinal(numeroDeMoeda(item.valorAtual))}</strong>
                        </div>

                        <div className="info-mobile-vale info-mobile-vale-full">
                          <span>Saldo da Semana</span>
                          <strong className={classeValor(item.saldoSemana)}>
                            {valorComSinal(item.saldoSemana)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}