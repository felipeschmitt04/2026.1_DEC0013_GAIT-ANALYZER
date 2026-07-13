# Integração com API e polling

O processamento de marcha pode levar alguns minutos. Por isso, o frontend não
fica preso esperando a resposta final do upload. Ele envia o vídeo, recebe um
`job_id`, salva esse identificador no banco e acompanha o processamento por
consultas periódicas.

## Fluxo completo

1. O usuário seleciona paciente, vídeo, altura e orientação.
2. A tela envia os dados para `app/api/analises/route.ts`.
3. A rota interna monta o `FormData` exigido pelo backend:
   - `video`: arquivo de vídeo.
   - `height_mm`: altura em milímetros.
   - `rotated`: `true` ou `false`.
4. A rota interna chama `POST /analyze` no backend.
5. O backend devolve um `job_id`.
6. O frontend cria a análise no Supabase usando esse `job_id` como `id`.
7. A interface acompanha o job com `GET /status/{job_id}`.
8. Quando o status fica `completed`, a interface busca `GET /results/{job_id}`.
9. O relatório PDF é baixado por `app/api/analises/relatorio/route.ts`.

## Endpoints do backend consumidos

| Endpoint | Uso no frontend |
| --- | --- |
| `POST /analyze` | Enviar vídeo e criar job de análise. |
| `GET /status/{job_id}` | Acompanhar fila, processamento e conclusão. |
| `GET /results/{job_id}` | Buscar o JSON `ResultV1` completo. |
| `GET /results/{job_id}/report.pdf` | Baixar o relatório clínico em PDF. |

## Por que usar rotas internas do Next.js

O navegador não deve falar diretamente com o Supabase nem carregar segredos.
As rotas em `app/api` executam no servidor do frontend, onde é seguro usar
`DATABASE_URL` e aplicar regras de negócio antes de responder ao navegador.

No estado atual, as rotas internas também concentram a URL pública do backend.
Em produção, essa URL precisa apontar para a API central hospedada na Azure ou
para o domínio HTTPS configurado para ela.

Exemplo conceitual:

```ts
const API_BASE_URL = "https://52-247-110-87.sslip.io";

const response = await fetch(`${API_BASE_URL}/results/${jobId}`);
```

## Relatório PDF

O botão de download da tela de relatório deve chamar a rota interna:

```text
GET /api/analises/relatorio?jobId={job_id}
```

Essa rota faz proxy para:

```text
GET /results/{job_id}/report.pdf
```

O backend retorna `application/pdf`. A rota do Next.js repassa o arquivo com
`Content-Disposition: attachment`, permitindo que o navegador baixe o relatório
com um nome associado ao `job_id`.

## Cuidados operacionais

- Se o backend for reconstruído sem volume persistente, jobs antigos podem
  desaparecer e o PDF retornará `404`.
- O botão de PDF só deve ser habilitado para análises com `job_id` válido.
- O frontend deve tratar `404`, `409` e `500` com mensagens claras.
- O worker DGX nunca deve ser chamado pelo frontend.
