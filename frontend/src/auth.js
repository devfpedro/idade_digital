export function sessaoValida() {
  const sessaoSalva = localStorage.getItem("sessao");
  if (!sessaoSalva) return false;

  const sessao = JSON.parse(sessaoSalva);
  const dezMinutos = 10 * 60 * 1000;
  const tempoPassado = Date.now() - sessao.loginEm;

  if (tempoPassado > dezMinutos) {
    localStorage.removeItem("sessao");
    return false;
  }

  return true;
}