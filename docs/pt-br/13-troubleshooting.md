# Troubleshooting

Problemas comuns e caminhos rápidos de diagnóstico.

## API Não Responde

Verifique se o container ou processo está rodando:

```bash
curl http://localhost:8000/health
docker ps
docker logs gait-analyzer-api
```

Se estiver rodando sem Docker, confira o terminal do `uvicorn`.

## Porta 8000 Ocupada

Liste containers:

```bash
docker ps
```

Pare o container antigo:

```bash
docker stop gait-analyzer-api
```

Ou suba a API em outra porta:

```bash
docker run --rm -p 8001:8000 gait-analyzer-backend:cpu
```

## `pytest` Não Instalado No Mac

O Python local pode não ter dependências. Use Docker ou instale o perfil leve:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.api.txt
python -m pytest tests
```

Ou:

```bash
docker run --rm gait-analyzer-backend:cpu python -m pytest tests
```

## OpenCV Não Abre O Vídeo

Possíveis causas:

- arquivo não existe no caminho enviado;
- formato incompatível;
- vídeo corrompido;
- FPS ou duração inválidos.

Erros comuns:

- `ERROR_104_PATH`: caminho inexistente;
- `ERROR_103_VIDEO_OPEN`: OpenCV não abriu o vídeo;
- `ERROR_101_FPS_INVALID`: FPS inválido;
- `ERROR_102_VIDEO_DURATION`: duração inválida.

## Docker Build Falha Baixando Dependências

O build precisa de internet para baixar pacotes. Se falhar:

- confirme conexão;
- confira proxy/firewall;
- rode novamente;
- prefira `requirements.api.txt` para o build leve.

## Frontend Não Consegue Chamar API

Verifique:

- backend está em `http://localhost:8000`;
- CORS permite a origem do frontend;
- frontend está usando a URL correta;
- container mapeou `-p 8000:8000`.

Teste manual:

```bash
curl http://localhost:8000/health
```

## Worker DGX Não Responde

Na DGX:

```bash
curl http://localhost:9000/health
```

Se falhar:

- confirme se o `uvicorn main:app --port 9000` está rodando;
- confirme se o ambiente conda está ativo;
- veja logs do terminal;
- confirme se a URL usada em `REMOTE_ENGINE_URL` é acessível a partir do
  backend central.

## Primeiro Processamento Na DGX Demora

É esperado. A engine carrega MeTRAbs, GaitTransformer e bibliotecas pesadas.
Use:

```bash
curl -X POST http://localhost:9000/warmup
```

antes da demonstração.

## Erro De Memória Na DGX

Tente limpar caches:

```bash
curl -X POST http://localhost:9000/clear-cache
```

Se persistir, reinicie o processo do worker.

## `compileall engine_dgx` Falha No Mac Por Permissão

O Python do macOS pode tentar escrever cache fora da área permitida. Use:

```bash
PYTHONPYCACHEPREFIX=/private/tmp/codex-pycache python3 -m compileall engine_dgx
```
