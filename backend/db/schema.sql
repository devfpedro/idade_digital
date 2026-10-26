CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) NOT NULL,
    senha_hash  TEXT         NOT NULL,
    papel       VARCHAR(20)  NOT NULL DEFAULT 'usuario',
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_email ON usuarios (lower(email));

CREATE TABLE IF NOT EXISTS cursos (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL UNIQUE,
    descricao  TEXT         NOT NULL,
    categoria  VARCHAR(60)  NOT NULL,
    imagem     TEXT,
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS informacoes (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL UNIQUE,
    descricao  TEXT         NOT NULL,
    conteudo   TEXT         NOT NULL DEFAULT '',
    imagem     TEXT,
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE informacoes ADD COLUMN IF NOT EXISTS video_url      TEXT;
ALTER TABLE informacoes ADD COLUMN IF NOT EXISTS artigo_url     TEXT;
ALTER TABLE informacoes ADD COLUMN IF NOT EXISTS artigo_fonte   VARCHAR(80);
ALTER TABLE informacoes ADD COLUMN IF NOT EXISTS artigo_titulo  VARCHAR(200);
ALTER TABLE informacoes ADD COLUMN IF NOT EXISTS artigo_resumo  TEXT;

CREATE TABLE IF NOT EXISTS colaboradores (
    id         SERIAL PRIMARY KEY,
    categoria  VARCHAR(12)  NOT NULL CHECK (categoria IN ('integrante', 'parceiro', 'colaborador')),
    nome       VARCHAR(160) NOT NULL,
    funcao     VARCHAR(160) NOT NULL,
    descricao  TEXT         NOT NULL DEFAULT '',
    ordem      INTEGER      NOT NULL DEFAULT 0,
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (categoria, nome)
);
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS github VARCHAR(39);

ALTER TABLE usuarios ALTER COLUMN papel TYPE VARCHAR(20);
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;
UPDATE usuarios SET papel = 'administrador' WHERE papel = 'admin';
UPDATE usuarios SET papel = 'usuario' WHERE papel = 'aluno';
ALTER TABLE usuarios ALTER COLUMN papel SET DEFAULT 'usuario';
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_valido;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_papel_valido
    CHECK (papel IN ('administrador_chefe', 'administrador', 'organizador', 'usuario'));
CREATE UNIQUE INDEX IF NOT EXISTS ux_um_administrador_chefe
    ON usuarios (papel) WHERE papel = 'administrador_chefe';

DROP TABLE IF EXISTS progresso;
DROP TABLE IF EXISTS aulas CASCADE;

CREATE TABLE IF NOT EXISTS modulos (
    id         SERIAL PRIMARY KEY,
    curso_id   INTEGER      NOT NULL REFERENCES cursos (id) ON DELETE CASCADE,
    ordem      INTEGER      NOT NULL CHECK (ordem > 0),
    titulo     VARCHAR(150) NOT NULL,
    descricao  TEXT         NOT NULL DEFAULT '',
    UNIQUE (curso_id, ordem) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE IF NOT EXISTS conteudos (
    id         SERIAL PRIMARY KEY,
    modulo_id  INTEGER      NOT NULL REFERENCES modulos (id) ON DELETE CASCADE,
    ordem      INTEGER      NOT NULL CHECK (ordem > 0),
    tipo       VARCHAR(10)  NOT NULL CHECK (tipo IN ('texto', 'video', 'link')),
    titulo     VARCHAR(150) NOT NULL,
    texto      TEXT         NOT NULL DEFAULT '',
    url        TEXT,
    UNIQUE (modulo_id, ordem) DEFERRABLE INITIALLY IMMEDIATE
);

-- Bancos criados antes: as restricoes precisam ser adiaveis para renumerar ao excluir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modulos_curso_id_ordem_key' AND NOT condeferrable) THEN
        ALTER TABLE modulos DROP CONSTRAINT modulos_curso_id_ordem_key;
        ALTER TABLE modulos ADD CONSTRAINT modulos_curso_id_ordem_key
            UNIQUE (curso_id, ordem) DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conteudos_modulo_id_ordem_key' AND NOT condeferrable) THEN
        ALTER TABLE conteudos DROP CONSTRAINT conteudos_modulo_id_ordem_key;
        ALTER TABLE conteudos ADD CONSTRAINT conteudos_modulo_id_ordem_key
            UNIQUE (modulo_id, ordem) DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS progresso_conteudo (
    usuario_id    INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    conteudo_id   INTEGER     NOT NULL REFERENCES conteudos (id) ON DELETE CASCADE,
    concluido_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, conteudo_id)
);

CREATE TABLE IF NOT EXISTS progresso_modulo (
    usuario_id    INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    modulo_id     INTEGER     NOT NULL REFERENCES modulos (id) ON DELETE CASCADE,
    concluido_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, modulo_id)
);

-- Marca o que o seed ja semeou: nada que um administrador apagou ou editou volta sozinho
CREATE TABLE IF NOT EXISTS controle_seed (
    chave       VARCHAR(60) PRIMARY KEY,
    aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- unaccent() nao e IMMUTABLE; este wrapper permite usa-lo em indices
CREATE OR REPLACE FUNCTION f_unaccent(texto TEXT) RETURNS TEXT
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT public.unaccent('public.unaccent', texto) $$;

CREATE INDEX IF NOT EXISTS ix_cursos_busca ON cursos
    USING gin (f_unaccent(lower(nome || ' ' || descricao || ' ' || categoria)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_informacoes_busca ON informacoes
    USING gin (f_unaccent(lower(nome || ' ' || descricao || ' ' || conteudo)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_modulos_curso ON modulos (curso_id, ordem);
CREATE INDEX IF NOT EXISTS ix_conteudos_modulo ON conteudos (modulo_id, ordem);
