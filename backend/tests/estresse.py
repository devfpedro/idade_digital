import argparse
import json
import secrets
import statistics
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
BASE = "http://127.0.0.1:5000"
RESULTADOS = []


def chamar(metodo, caminho, corpo=None, token=None, bruto=None, timeout=60):
    cabecalhos = {}
    dados = None
    if bruto is not None:
        dados, cabecalhos["Content-Type"] = bruto, "application/json"
    elif corpo is not None:
        dados, cabecalhos["Content-Type"] = (
            json.dumps(corpo).encode(),
            "application/json",
        )
    if token:
        cabecalhos["Authorization"] = f"Bearer {token}"
    pedido = urllib.request.Request(
        BASE + caminho, data=dados, method=metodo, headers=cabecalhos
    )
    inicio = time.perf_counter()
    try:
        with urllib.request.urlopen(pedido, timeout=timeout) as r:
            corpo_resp, status = r.read(), r.status
    except urllib.error.HTTPError as e:
        corpo_resp, status = e.read(), e.code
    except Exception as e:  # noqa: BLE001 - queremos contar qualquer falha de rede
        return 0, str(e), time.perf_counter() - inicio
    try:
        corpo_resp = json.loads(corpo_resp)
    except Exception:  # noqa: BLE001
        pass
    return status, corpo_resp, time.perf_counter() - inicio


def contas():
    for nome in ("users_mock.json", "users_mock.json.example"):
        arquivo = RAIZ / "backend" / "db" / nome
        if arquivo.exists():
            return {
                u["email"]: u
                for u in json.loads(arquivo.read_text(encoding="utf-8"))["users"]
            }
    sys.exit("users_mock.json não encontrado")


def entrar(email):
    status, dados, _ = chamar(
        "POST", "/auth/login", {"email": email, "senha": contas()[email]["senha"]}
    )
    if status != 200:
        sys.exit(f"Login de {email} falhou ({status}). O projeto está rodando?")
    return dados["token"]


def percentil(valores, p):
    ordenados = sorted(valores)
    return (
        ordenados[min(len(ordenados) - 1, int(len(ordenados) * p))] if ordenados else 0
    )


def executar(nome, tarefas, trabalhadores, esperado=lambda s: s == 200):
    inicio = time.perf_counter()
    with ThreadPoolExecutor(max_workers=trabalhadores) as pool:
        retornos = list(pool.map(lambda f: f(), tarefas))
    total = time.perf_counter() - inicio
    status = [r[0] for r in retornos]
    tempos = [r[2] for r in retornos]
    resumo = {
        "cenario": nome,
        "requisicoes": len(retornos),
        "paralelo": trabalhadores,
        "ok": sum(1 for s in status if esperado(s)),
        "erros_5xx": sum(1 for s in status if s >= 500),
        "falhas_de_rede": status.count(0),
        "req_por_s": round(len(retornos) / total, 1),
        "p50_ms": round(statistics.median(tempos) * 1000),
        "p95_ms": round(percentil(tempos, 0.95) * 1000),
        "max_ms": round(max(tempos) * 1000),
    }
    RESULTADOS.append(resumo)
    marca = (
        "OK " if resumo["erros_5xx"] == 0 and resumo["falhas_de_rede"] == 0 else "FALHA"
    )
    print(
        f"[{marca}] {nome}: {resumo['ok']}/{resumo['requisicoes']} esperados | 5xx={resumo['erros_5xx']} rede={resumo['falhas_de_rede']} "
        f"| {resumo['req_por_s']} req/s | p50={resumo['p50_ms']}ms p95={resumo['p95_ms']}ms max={resumo['max_ms']}ms"
    )
    return retornos


def main():
    global BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE)
    ap.add_argument(
        "--rapido", action="store_true", help="versão curta (metade da carga)"
    )
    args = ap.parse_args()
    BASE = args.base.rstrip("/")
    k = 1 if args.rapido else 2

    if chamar("GET", "/status")[0] != 200:
        sys.exit(f"Servidor não responde em {BASE}")
    chefe = entrar("pedro.henrique@idade.digital")
    usuario = entrar("usuario.teste@idade.digital")
    marca = secrets.token_hex(3)

    rotas = [
        "/cursos",
        "/informacoes",
        "/equipe",
        "/cursos/1",
        "/cursos?q=celular",
        "/informacoes?q=golpe",
    ]
    tarefas = [
        lambda r=rotas[i % len(rotas)]: chamar("GET", r, token=usuario)
        for i in range(200 * k)
    ]
    executar("1. leitura simultânea (listas e detalhes)", tarefas, 40)

    credenciais = contas()["usuario.teste@idade.digital"]
    tarefas = [
        lambda: chamar(
            "POST",
            "/auth/login",
            {"email": "usuario.teste@idade.digital", "senha": credenciais["senha"]},
        )
        for _ in range(40 * k)
    ]
    executar("2. pico de logins (hash de senha usa CPU)", tarefas, 40)

    tarefas = [lambda: chamar("GET", "/cursos", token=usuario) for _ in range(300 * k)]
    executar("3. saturação: 300 requisições ao mesmo tempo", tarefas, 150 * k)

    status, dados, _ = chamar(
        "POST",
        "/cursos",
        {
            "nome": f"ZZ-Teste Estresse {marca}",
            "descricao": "d",
            "categoria": "Celular",
        },
        chefe,
    )
    assert status == 201, dados
    cid = dados["id"]
    n_modulos = 25 * k
    tarefas = [
        lambda i=i: chamar("POST", f"/cursos/{cid}/modulos", {"titulo": f"M{i}"}, chefe)
        for i in range(n_modulos)
    ]
    executar(
        f"4a. {n_modulos} módulos criados ao mesmo tempo",
        tarefas,
        n_modulos,
        esperado=lambda s: s == 201,
    )
    ordens = [
        m["ordem"] for m in chamar("GET", f"/cursos/{cid}", token=chefe)[1]["modulos"]
    ]
    print(
        f"      numeração dos módulos: {'SEM buracos nem repetições' if ordens == list(range(1, n_modulos + 1)) else 'INCONSISTENTE ' + str(ordens)}"
    )

    metade = n_modulos // 2
    tarefas = [
        lambda: chamar("DELETE", f"/cursos/{cid}/modulos/1", token=chefe)
        for _ in range(metade)
    ]
    executar(
        f"4b. {metade} exclusões simultâneas do módulo 1 (renumeração)",
        tarefas,
        metade,
        esperado=lambda s: s in (200, 404),
    )
    ordens = [
        m["ordem"] for m in chamar("GET", f"/cursos/{cid}", token=chefe)[1]["modulos"]
    ]
    print(
        f"      módulos restantes: {len(ordens)} | numeração {'contínua' if ordens == list(range(1, len(ordens) + 1)) else 'INCONSISTENTE ' + str(ordens)}"
    )

    status, dados, _ = chamar(
        "POST",
        f"/cursos/{cid}/modulos/1/conteudos",
        {"tipo": "texto", "titulo": "T", "texto": "x"},
        chefe,
    )
    conteudo = dados["id"]
    tarefas = [
        lambda: chamar(
            "PUT",
            f"/cursos/{cid}/modulos/1/conteudos/{conteudo}/concluir",
            token=usuario,
        )
        for _ in range(60 * k)
    ]
    retornos = executar(
        "4c. mesmo conteúdo concluído 60x ao mesmo tempo", tarefas, 60 * k
    )
    novos = sum(
        1 for r in retornos if isinstance(r[1], dict) and r[1].get("recemConcluido")
    )
    print(f"      'recém concluído' informado {novos}x (esperado: 1)")

    email = f"zz.teste.{marca}@idade.digital"
    corpo = {"nome": "ZZ-Teste Duplicado", "email": email, "senha": "senha-teste-123"}
    tarefas = [lambda: chamar("POST", "/usuarios", corpo, chefe) for _ in range(20)]
    retornos = executar(
        "4d. 20 cadastros do MESMO e-mail ao mesmo tempo",
        tarefas,
        20,
        esperado=lambda s: s in (201, 409),
    )
    print(
        f"      criados={[r[0] for r in retornos].count(201)} (esperado 1), recusados={[r[0] for r in retornos].count(409)}"
    )

    if chamar("GET", "/voz/vozes", token=usuario)[1].get("disponivel"):
        tarefas = [
            lambda i=i: chamar(
                "POST",
                "/voz",
                {
                    "texto": f"Teste de estresse número {i} {marca}. Leitura em voz natural."
                },
                usuario,
            )
            for i in range(12 * k)
        ]
        executar("5. síntese de voz: textos diferentes ao mesmo tempo", tarefas, 12 * k)
        tarefas = [
            lambda: chamar(
                "POST", "/voz", {"texto": "Texto repetido para o cache."}, usuario
            )
            for _ in range(60 * k)
        ]
        executar("5b. mesmo texto 60x (cache)", tarefas, 30)

    lixo = [
        lambda: chamar("POST", "/auth/login", bruto=b"x" * (6 * 1024 * 1024)),
        lambda: chamar("POST", "/auth/login", bruto=b'{"email": "a", "senha":'),
        lambda: chamar("GET", "/cursos?q=" + "a" * 5000, token=usuario),
        lambda: chamar(
            "GET", "/cursos?q=%27%3B%20DROP%20TABLE%20cursos%3B--", token=usuario
        ),
        lambda: chamar("GET", "/informacoes?q=%25%25%25%5F%5F", token=usuario),
        lambda: chamar(
            "POST",
            "/cursos",
            {"nome": "x" * 100000, "descricao": "d", "categoria": "c"},
            chefe,
        ),
        lambda: chamar("GET", "/cursos/99999999999999999999", token=usuario),
        lambda: chamar("GET", "/cursos/-1/modulos/0", token=usuario),
        lambda: chamar(
            "PUT", "/cursos/1/modulos/1/conteudos/abc/concluir", token=usuario
        ),
    ]
    executar(
        "6. entradas hostis e payloads abusivos (nenhum 5xx esperado)",
        lixo * (10 * k),
        20,
        esperado=lambda s: 0 < s < 500,
    )

    duracao = 15 * k
    fim = time.time() + duracao
    contagem, erros = [0], [0]
    tempos = []
    trava = threading.Lock()

    def usuario_virtual(n):
        token = usuario
        while time.time() < fim:
            for metodo, rota, corpo in (
                ("GET", "/cursos", None),
                ("GET", "/cursos/1", None),
                ("GET", "/cursos/1/modulos/1", None),
                ("GET", "/informacoes?q=senha", None),
                ("GET", "/equipe", None),
                ("GET", "/auth/me", None),
                ("PUT", "/cursos/1/modulos/1/conteudos/1/concluir", None),
            ):
                s, _, t = chamar(metodo, rota, corpo, token)
                with trava:
                    contagem[0] += 1
                    tempos.append(t)
                    if s >= 500 or s == 0:
                        erros[0] += 1
                time.sleep(0.02)

    inicio = time.time()
    with ThreadPoolExecutor(max_workers=30) as pool:
        list(pool.map(usuario_virtual, range(30)))
    total = time.time() - inicio
    resumo = {
        "cenario": f"7. carga mista, 30 usuários virtuais por {duracao}s",
        "requisicoes": contagem[0],
        "paralelo": 30,
        "ok": contagem[0] - erros[0],
        "erros_5xx": erros[0],
        "falhas_de_rede": 0,
        "req_por_s": round(contagem[0] / total, 1),
        "p50_ms": round(statistics.median(tempos) * 1000),
        "p95_ms": round(percentil(tempos, 0.95) * 1000),
        "max_ms": round(max(tempos) * 1000),
    }
    RESULTADOS.append(resumo)
    print(
        f"[{'OK ' if not erros[0] else 'FALHA'}] {resumo['cenario']}: {contagem[0]} req | 5xx/rede={erros[0]} | {resumo['req_por_s']} req/s | "
        f"p50={resumo['p50_ms']}ms p95={resumo['p95_ms']}ms max={resumo['max_ms']}ms"
    )

    chamar("DELETE", f"/cursos/{cid}", token=chefe)
    lista = chamar("GET", "/usuarios?q=zz.teste", token=chefe)[1]
    for u in lista if isinstance(lista, list) else []:
        if u["email"].startswith("zz.teste."):
            chamar("DELETE", f"/usuarios/{u['id']}", token=chefe)

    print("\nSaúde do servidor após o estresse:", chamar("GET", "/health")[1])
    falhas = [r["cenario"] for r in RESULTADOS if r["erros_5xx"] or r["falhas_de_rede"]]
    print(
        "RESULTADO:",
        "todos os cenários sem erro 5xx" if not falhas else f"há falhas em: {falhas}",
    )
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
