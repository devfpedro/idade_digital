export const ROTULO_PAPEL = {
  administrador_chefe: "Administrador Chefe",
  administrador: "Administrador",
  organizador: "Organizador",
  usuario: "Usuário",
};

export const GERENCIAVEIS = {
  administrador_chefe: ["administrador", "organizador", "usuario"],
  administrador: ["organizador", "usuario"],
  organizador: ["usuario"],
};

export const PAPEIS_GESTAO = Object.keys(GERENCIAVEIS);

export const PAPEIS_EQUIPE = ["administrador_chefe", "administrador"];

export const PAPEIS_CONTEUDO = ["administrador_chefe", "administrador"];
