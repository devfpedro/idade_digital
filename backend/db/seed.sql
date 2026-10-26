INSERT INTO cursos (nome, descricao, categoria) VALUES
 ('Primeiros passos no celular',
  'Aprenda a ligar, desligar, atender chamadas, ajustar volume e brilho e usar os botões do smartphone com tranquilidade.',
  'Celular'),
 ('WhatsApp sem medo',
  'Enviar mensagens, fotos e áudios, fazer chamadas de vídeo com a família e configurar a privacidade do aplicativo.',
  'WhatsApp'),
 ('Navegando com segurança na internet',
  'Como pesquisar, reconhecer sites confiáveis e evitar páginas falsas ao usar o computador ou o celular.',
  'Internet'),
 ('Conhecendo o computador',
  'Ligar o computador, usar mouse e teclado, abrir programas e salvar arquivos, passo a passo e no seu ritmo.',
  'Computador'),
 ('Bancos e serviços no celular com segurança',
  'Como usar aplicativos de banco, Pix e o gov.br sem cair em golpes e protegendo seus dados.',
  'Segurança')
ON CONFLICT (nome) DO NOTHING;

UPDATE cursos SET categoria = 'Celular' WHERE nome = 'Primeiros passos no celular' AND categoria IN ('Video aula', 'Artigo');
UPDATE cursos SET categoria = 'WhatsApp' WHERE nome = 'WhatsApp sem medo' AND categoria IN ('Video aula', 'Artigo');
UPDATE cursos SET categoria = 'Internet' WHERE nome = 'Navegando com segurança na internet' AND categoria IN ('Video aula', 'Artigo');
UPDATE cursos SET categoria = 'Computador' WHERE nome = 'Conhecendo o computador' AND categoria IN ('Video aula', 'Artigo');
UPDATE cursos SET categoria = 'Segurança' WHERE nome = 'Bancos e serviços no celular com segurança' AND categoria IN ('Video aula', 'Artigo');

INSERT INTO modulos (curso_id, ordem, titulo, descricao)
SELECT c.id, a.ordem, a.titulo, a.descricao
FROM (VALUES
 ('Primeiros passos no celular', 1, 'Conhecendo os botões do celular', 'Para que servem os botões laterais e como ligar e desligar o aparelho.'),
 ('Primeiros passos no celular', 2, 'Fazendo e atendendo ligações', 'Como discar um número, atender, recusar e salvar contatos.'),
 ('Primeiros passos no celular', 3, 'Volume, brilho e tamanho da letra', 'Ajustes que deixam o celular mais confortável de usar.'),
 ('Primeiros passos no celular', 4, 'Conectando ao Wi-Fi', 'Como escolher uma rede e digitar a senha com segurança.'),
 ('WhatsApp sem medo', 1, 'Instalando e abrindo o WhatsApp', 'Primeiro acesso e cadastro do número de telefone.'),
 ('WhatsApp sem medo', 2, 'Enviando mensagens e áudios', 'Escrever, gravar um áudio e enviar para um contato.'),
 ('WhatsApp sem medo', 3, 'Chamada de vídeo com a família', 'Como iniciar e atender uma chamada de vídeo.'),
 ('WhatsApp sem medo', 4, 'Privacidade e golpes no WhatsApp', 'Quem pode ver seus dados e como se proteger do golpe do falso parente.'),
 ('Navegando com segurança na internet', 1, 'O que é um navegador', 'Conhecendo o navegador e a barra de endereços.'),
 ('Navegando com segurança na internet', 2, 'Pesquisando no Google', 'Como escrever uma boa pesquisa e entender os resultados.'),
 ('Navegando com segurança na internet', 3, 'Como saber se um site é confiável', 'O cadeado, o endereço correto e sinais de páginas falsas.'),
 ('Conhecendo o computador', 1, 'Ligando e desligando o computador', 'Como iniciar e encerrar o computador corretamente.'),
 ('Conhecendo o computador', 2, 'Usando o mouse e o teclado', 'Clicar, arrastar, digitar e usar as principais teclas.'),
 ('Conhecendo o computador', 3, 'Abrindo programas e salvando arquivos', 'Como abrir um programa, escrever um texto e guardá-lo.'),
 ('Bancos e serviços no celular com segurança', 1, 'Aplicativo do banco: o básico', 'Instalar apenas o aplicativo oficial e entrar com segurança.'),
 ('Bancos e serviços no celular com segurança', 2, 'Usando o Pix com cuidado', 'Conferir os dados antes de confirmar e limites de segurança.'),
 ('Bancos e serviços no celular com segurança', 3, 'Conta gov.br', 'Para que serve e como proteger sua conta gov.br.')
) AS a (curso, ordem, titulo, descricao)
JOIN cursos c ON c.nome = a.curso
WHERE NOT EXISTS (SELECT 1 FROM controle_seed WHERE chave = 'modulos_iniciais')
  AND NOT EXISTS (SELECT 1 FROM modulos x WHERE x.curso_id = c.id AND x.ordem = a.ordem);

INSERT INTO conteudos (modulo_id, ordem, tipo, titulo, texto)
SELECT m.id, 1, 'texto', 'Sobre este módulo',
       m.descricao || E'\n\nNeste módulo você vai aprender com calma, no seu ritmo. O material completo, com vídeos e atividades, será disponibilizado em breve. Leia este texto até o final para concluir o módulo e liberar o próximo.'
FROM modulos m
WHERE NOT EXISTS (SELECT 1 FROM controle_seed WHERE chave = 'modulos_iniciais')
  AND NOT EXISTS (SELECT 1 FROM conteudos x WHERE x.modulo_id = m.id AND x.ordem = 1);

INSERT INTO controle_seed (chave) VALUES ('modulos_iniciais') ON CONFLICT DO NOTHING;

INSERT INTO informacoes (nome, descricao, conteudo, artigo_url, artigo_fonte, artigo_titulo, artigo_resumo) VALUES
 ('Golpe do falso parente no WhatsApp',
  'Um número desconhecido diz ser seu filho ou neto e pede dinheiro com urgência.',
  E'Como funciona: o golpista usa a foto de um familiar, diz que trocou de número e pede um Pix urgente.\n\nComo se proteger:\n• Ligue para o número antigo ou para outro familiar antes de enviar qualquer valor.\n• Faça uma pergunta que só a pessoa de verdade saberia responder.\n• Desconfie de pedidos com pressa. Golpistas criam urgência para você não pensar.',
  'https://idec.org.br/dicas-e-direitos/10-principais-golpes-contra-pessoas-idosas',
  'Idec', '10 principais golpes contra pessoas idosas',
  'O Idec lista os dez golpes mais comuns contra idosos, entre eles o do WhatsApp com pedido de Pix, e ensina a confirmar quem está pedindo o dinheiro e a agir depois de uma fraude.'),
 ('Como criar uma senha forte',
  'Senhas fáceis são descobertas rapidamente. Veja como criar uma que seja segura e fácil de lembrar.',
  E'• Use uma frase longa, por exemplo: "meu neto joga bola aos domingos".\n• Não use data de nascimento, nome de familiares ou sequências como 123456.\n• Use senhas diferentes para o banco, o e-mail e as redes sociais.\n• Nunca passe sua senha ou os códigos recebidos por SMS para ninguém, nem para quem diz ser do banco.',
  'https://www.welivesecurity.com/br/2016/07/18/senha-forte/',
  'WeLiveSecurity (ESET)', 'Como criar uma senha forte',
  'O artigo explica que uma boa senha é longa e evita escolhas óbvias, e que transformar uma frase com sentido em senha ajuda a lembrar. Recomenda nunca repetir senhas e ativar a verificação em duas etapas.'),
 ('Mensagens e links falsos (phishing)',
  'Mensagens que parecem do banco, dos Correios ou de lojas e levam a páginas falsas.',
  E'Sinais de alerta:\n• Promessas de prêmio, dinheiro fácil ou ameaça de bloqueio da conta.\n• Erros de português e endereços estranhos no link.\n• Pedido de senha, CPF ou dados do cartão.\n\nO que fazer: não clique no link. Abra o aplicativo oficial do banco ou da empresa direto no seu celular, ou ligue para o telefone que está no seu cartão.',
  'https://www.gov.br/mcom/pt-br/noticias/noticias_alt/2026/julho/ataque-phishing-como-identificar-tentativas-de-fraude-na-internet',
  'Ministério das Comunicações', 'Phishing: como reconhecer golpes digitais',
  'O Ministério das Comunicações mostra como reconhecer mensagens golpistas: urgência, ameaça de bloqueio, pedido de senha ou código e links encurtados. Na dúvida, digite o endereço oficial no navegador.'),
 ('Ligação falsa de central do banco',
  'O golpista liga dizendo que há uma compra suspeita e pede que você "confirme" seus dados.',
  E'O banco nunca pede senha, token ou código por telefone, e nunca manda ninguém buscar seu cartão em casa.\n\nSe receber uma ligação assim: desligue, espere alguns minutos e ligue você mesmo para o número que está atrás do seu cartão.',
  'https://portal.febraban.org.br/noticia/4471/pt-br/',
  'Febraban', 'Golpe da falsa central: conheça as várias versões de um mesmo crime',
  'A Febraban explica as várias versões do golpe da falsa central. Diante de qualquer contato assim, desligue e procure o banco só por canais oficiais, como o número do verso do cartão, sem clicar em links nem instalar aplicativos enviados.'),
 ('Compras seguras pela internet',
  'Como comprar online sem cair em lojas falsas e preços bons demais para ser verdade.',
  E'• Prefira lojas conhecidas e confira o endereço do site.\n• Desconfie de preços muito abaixo do normal.\n• Procure a opinião de outros compradores antes de comprar.\n• Guarde o comprovante e os dados da compra.',
  'https://www.procon.sp.gov.br/site-de-compras-falso/',
  'Procon-SP', 'Procon-SP alerta para golpe do site de compras falso',
  'O Procon-SP alerta que criminosos copiam o visual de lojas conhecidas, com endereço quase igual e preço muito baixo. Orienta desconfiar de ofertas boas demais, conferir o endereço e consultar a lista de sites a evitar.')
ON CONFLICT (nome) DO UPDATE SET
    artigo_url    = COALESCE(informacoes.artigo_url,    EXCLUDED.artigo_url),
    artigo_fonte  = COALESCE(informacoes.artigo_fonte,  EXCLUDED.artigo_fonte),
    artigo_titulo = COALESCE(informacoes.artigo_titulo, EXCLUDED.artigo_titulo),
    artigo_resumo = COALESCE(informacoes.artigo_resumo, EXCLUDED.artigo_resumo)
WHERE NOT EXISTS (SELECT 1 FROM controle_seed WHERE chave = 'artigos_iniciais');

INSERT INTO controle_seed (chave) VALUES ('artigos_iniciais') ON CONFLICT DO NOTHING;

INSERT INTO colaboradores (categoria, nome, funcao, descricao, ordem) VALUES
 ('integrante', 'Pedro Henrique', E'Gerente de Projeto\nDesenvolvedor back-end e QA', '', 1),
 ('integrante', 'Gustavo Belizio', E'Desenvolvimento front-end\nTelas e interface', '', 2),
 ('integrante', 'Maria Kamily', E'Desenvolvedora back-end\nAnalista/Engenheira de dados', '', 3),
 ('integrante', 'Mateus Roseno', E'Tech Leader do front-end\nQA de análise de código do front-end', '', 4),
 ('integrante', 'Laerson Mendes Barbosa de Lima Junior', E'Design de UX\nDocumentação e material impresso', '', 5),
 ('parceiro', 'Centro de Convivência da Pessoa Idosa de Guarabira-PB',
  'Parceiro social',
  'Extensão do CRAS. É o espaço onde a plataforma é apresentada e testada junto às pessoas idosas.', 1),
 ('parceiro', 'IFPB - Campus Guarabira',
  'Instituição de ensino',
  'Curso Superior de Tecnologia em Sistemas para Internet, onde o projeto de extensão é desenvolvido.', 2)
ON CONFLICT (categoria, nome) DO NOTHING;

-- Atualiza as funcoes cadastradas na primeira versao (so se ainda estiverem como foram semeadas)
UPDATE colaboradores SET funcao = E'Gerente de Projeto\nDesenvolvedor back-end e QA'
 WHERE categoria = 'integrante' AND nome = 'Pedro Henrique' AND funcao = 'Gerência do projeto, back-end e QA';
UPDATE colaboradores SET funcao = E'Desenvolvimento front-end\nTelas e interface'
 WHERE categoria = 'integrante' AND nome = 'Gustavo Belizio' AND funcao = 'Front-end e telas';
UPDATE colaboradores SET funcao = E'Desenvolvedora back-end\nAnalista/Engenheira de dados'
 WHERE categoria = 'integrante' AND nome = 'Maria Kamily' AND funcao = 'Banco de dados e rotas';
UPDATE colaboradores SET funcao = E'Desenvolvedora back-end\nAnalista/Engenheira de dados'
 WHERE categoria = 'integrante' AND nome = 'Maria Kamily' AND funcao = E'Desenvolvedora back-end\nAnalista/Engenheira de dados, quando necessário';
UPDATE colaboradores SET funcao = E'Tech Leader do front-end\nQA de análise de código do front-end'
 WHERE categoria = 'integrante' AND nome = 'Mateus Roseno' AND funcao = 'QA e leitura em voz alta';
UPDATE colaboradores SET funcao = E'Design de UX\nDocumentação e material impresso'
 WHERE categoria = 'integrante' AND nome LIKE 'Laerson Mendes%' AND funcao = 'UX, documentação e material impresso';

UPDATE colaboradores SET github = 'devfpedro' WHERE categoria = 'integrante' AND nome = 'Pedro Henrique' AND github IS NULL;
UPDATE colaboradores SET github = 'Kamily1289' WHERE categoria = 'integrante' AND nome = 'Maria Kamily' AND github IS NULL;
UPDATE colaboradores SET github = 'MateusRoseno' WHERE categoria = 'integrante' AND nome = 'Mateus Roseno' AND github IS NULL;
UPDATE colaboradores SET github = 'laersontech' WHERE categoria = 'integrante' AND nome LIKE 'Laerson Mendes%' AND github IS NULL;
UPDATE colaboradores SET github = 'gustavobelizio' WHERE categoria = 'integrante' AND nome = 'Gustavo Belizio' AND github IS NULL;
-- O perfil informado do Laerson substitui o login provisório usado antes
UPDATE colaboradores SET github = 'laersontech' WHERE categoria = 'integrante' AND nome LIKE 'Laerson Mendes%' AND github IN ('laerson-junior');
