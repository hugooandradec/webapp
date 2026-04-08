const STORAGE_KEY = "usuarioLogado";
const MODULES = {
  LANCAMENTO: "lancamento",
  FECHAMENTO: "fechamento",
  PRE_FECHO: "pre-fecho",
  RETENCAO: "retencao",
  CALCULO_SALAS: "calculo-salas",
};

const USER_PERMISSIONS = {
  vt: [
    MODULES.LANCAMENTO,
    MODULES.FECHAMENTO,
    MODULES.PRE_FECHO,
    MODULES.RETENCAO,
    MODULES.CALCULO_SALAS,
  ],
  pipo: [
    MODULES.PRE_FECHO,
    MODULES.RETENCAO,
    MODULES.CALCULO_SALAS,
  ],
};

function normalizarUsuario(usuario) {
  return String(usuario || "").trim().toLowerCase();
}

function lerUsuariosMock() {
  const usuariosPadrao = [
    {
      login: "vt",
      senha: "178590",
      nomeExibicao: "vt",
    },
    {
      login: "pipo",
      senha: "7853",
      nomeExibicao: "pipo",
    },
  ];

  try {
    const bruto = localStorage.getItem("usuariosSistema");
    if (!bruto) return usuariosPadrao;

    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista) || lista.length === 0) return usuariosPadrao;

    return lista;
  } catch {
    return usuariosPadrao;
  }
}

export function getCurrentUser() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

export function getAllowedModules(usuario = getCurrentUser()) {
  const loginUsuario = normalizarUsuario(usuario?.login);
  return USER_PERMISSIONS[loginUsuario] || [];
}

export function canAccessModule(modulo, usuario = getCurrentUser()) {
  return getAllowedModules(usuario).includes(modulo);
}

export function login(usuario, senha) {
  const loginDigitado = normalizarUsuario(usuario);
  const senhaDigitada = String(senha || "");

  if (!loginDigitado || !senhaDigitada) {
    throw new Error("Informe usuario e senha.");
  }

  const usuarios = lerUsuariosMock();

  const encontrado = usuarios.find(
    (item) =>
      normalizarUsuario(item.login) === loginDigitado &&
      String(item.senha) === senhaDigitada
  );

  if (!encontrado) {
    throw new Error("Usuario ou senha invalidos.");
  }

  const usuarioLogado = {
    login: normalizarUsuario(encontrado.login),
    nomeExibicao: encontrado.nomeExibicao || encontrado.login,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioLogado));
  return usuarioLogado;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

export function salvarUsuariosSistema(lista) {
  if (!Array.isArray(lista)) return;
  localStorage.setItem("usuariosSistema", JSON.stringify(lista));
}
