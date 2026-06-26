# Configuração Do Ambiente

Este documento resume as configurações necessárias para rodar o backend, o modo
mock e o worker DGX. A criação da VM Azure em si fica fora deste arquivo.

## Variáveis De Ambiente

Use `backend/.env.example` como referência.

```env
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000

UPLOAD_DIR=storage/uploads
RESULTS_DIR=storage/results
TEMP_DIR=storage/temp

WINDOW_L=150

USE_MOCK_ENGINE=false
ENGINE_MODE=local
REMOTE_ENGINE_URL=http://localhost:9000
REMOTE_ENGINE_TIMEOUT_S=3600

CORS_ORIGINS=*
```

## Seleção Da Engine

O backend aceita três modos principais:

```env
ENGINE_MODE=mock
```

Usa dados sintéticos e leves. É o modo recomendado para Docker CPU, Azure sem
GPU e integração com frontend.

```env
ENGINE_MODE=local
```

Carrega a engine pesada dentro do backend. Exige dependências de IA e ambiente
compatível.

```env
ENGINE_MODE=remote
REMOTE_ENGINE_URL=http://localhost:9000
```

Envia o vídeo para o worker DGX e monta o `ResultV1` no backend central.

`USE_MOCK_ENGINE=true` ainda é aceito por compatibilidade. Quando `ENGINE_MODE`
não é definido, `USE_MOCK_ENGINE=true` faz o backend escolher `mock`.

## Dependências Do Backend

Arquivos principais:

- `backend/requirements.api.txt`: API leve, mock, OpenCV headless, pytest e
  httpx;
- `backend/requirements.cpu.txt`: tentativa de ambiente CPU completo com
  bibliotecas pesadas;
- `backend/requirements.txt`: fotografia mais ampla do ambiente original.

Para integração e documentação, prefira o perfil leve:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.api.txt
```

## Storage

O backend cria e usa estas pastas:

```text
backend/storage/uploads/
backend/storage/results/
backend/storage/temp/
```

Essas pastas possuem `.gitkeep`, mas o conteúdo gerado em runtime não deve ser
versionado. Vídeos, resultados, `.npz`, `.npy` e modelos pesados ficam fora do
Git.

## Ambiente DGX

Na DGX, o fluxo atual usa conda e a pasta `engine_dgx/`. O ambiente deve conter
TensorFlow, TensorFlow Hub, JAX, Equinox, Optax, MuJoCo/MJX, MeTRAbs e
GaitTransformer.

Os arquivos de referência ficam em:

```text
env-dgx/environment-dgx.yml
env-dgx/conda-explicit-dgx.txt
env-dgx/pip-dgx.txt
engine_dgx/requirements.txt
```

O Docker GPU não é o caminho atual para a DGX.

## Validação Estática

Quando as dependências pesadas não estão instaladas, ainda é possível validar
sintaxe dos módulos do backend:

```bash
cd backend
python3 -m compileall app storage/scripts
```

Para validar os arquivos do worker DGX no Mac, pode ser necessário redirecionar
o cache do Python:

```bash
PYTHONPYCACHEPREFIX=/private/tmp/codex-pycache python3 -m compileall engine_dgx
```
