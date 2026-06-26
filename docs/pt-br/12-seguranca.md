# Segurança

Este projeto manipula vídeos de pessoas e pode rodar em servidores acessíveis
pela rede. Mesmo sendo acadêmico, alguns cuidados são importantes.

## Arquivos Que Não Devem Ser Versionados

Não versionar:

- `.env` real;
- chaves SSH;
- tokens;
- vídeos enviados;
- resultados de processamento;
- `.mp4`, `.npz`, `.npy`, `.pt`, `.pth`, `.ckpt`, `.onnx`;
- URLs temporárias reais de túnel.

O `.gitignore` já cobre os principais casos, mas vale conferir antes de commitar:

```bash
git status --short
```

## Dados De Vídeo

Vídeos de marcha podem identificar uma pessoa. Para testes e demonstrações:

- prefira vídeos sintéticos ou autorizados;
- não suba vídeos reais para o repositório;
- apague uploads e resultados quando não forem mais necessários;
- evite compartilhar `result.json` se ele contiver dados sensíveis.

## CORS

Em desenvolvimento, `CORS_ORIGINS=*` facilita a integração. Em produção ou demo
pública, prefira listar as origens permitidas:

```env
CORS_ORIGINS=https://frontend.example.com,http://localhost:3000
```

## Portas

Portas comuns:

- `8000`: backend FastAPI central;
- `9000`: worker DGX;
- `5173`: demo local estática.

O frontend deve acessar a porta do backend central. O worker DGX não precisa ser
exposto para usuários finais.

## URLs Temporárias

Se usar túnel para conectar Azure e DGX, passe a URL por variável de ambiente e
não salve em arquivo versionado.

Exemplo:

```bash
docker run --rm -d \
  -e ENGINE_MODE=remote \
  -e REMOTE_ENGINE_URL="$REMOTE_ENGINE_URL" \
  gait-analyzer-backend:cpu
```

## Logs

Logs ajudam no debug, mas podem revelar caminhos locais, nomes de arquivos e
erros internos. Evite publicar logs completos sem revisar.

## Checklist Antes De PR

```bash
git status --short
git diff --stat
git diff --check
```

Confira se o PR não inclui dados sensíveis, arquivos gerados ou URLs temporárias.
