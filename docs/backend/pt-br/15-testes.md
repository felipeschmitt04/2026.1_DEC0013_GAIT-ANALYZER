# Testes

Testes automatizados ajudam a verificar uma funcionalidade isolada sem precisar
rodar o sistema inteiro toda vez. Em um projeto com FastAPI, OpenCV, storage,
mock, engine pesada e Docker, isso reduz bastante o custo mental de descobrir
onde algo quebrou.

Rodar a API inteira prova que algo funciona em conjunto, mas mistura muitas
camadas:

```text
FastAPI + upload + OpenCV + pipeline + mock/engine + storage + HTTP
```

Um teste pequeno tenta responder uma pergunta específica.

## Quando Criar Um Teste

Um teste faz sentido quando a lógica:

- pode quebrar silenciosamente;
- é importante para o contrato ou resultado;
- tem regras que podem ser explicadas por exemplo;
- já teve bug;
- será alterada depois e precisa de confiança.

## Teste Unitário

Testa uma função isolada. Exemplo:

```python
def test_calculate_distance_3d_between_two_points():
    p1 = [0, 0, 0]
    p2 = [3, 4, 0]

    distance = calculate_distance_3d(p1, p2)

    assert distance == 5.0
```

Esse tipo de teste é bom para funções determinísticas, como cálculo de distância
e ângulo.

## Smoke Test

Verifica se a aplicação sobe e responde o básico. Exemplo:

```bash
curl http://localhost:8000/health
```

É útil para demo, Docker e deploy.

## Teste De Integração

Valida se módulos trabalham juntos. Exemplos:

- endpoint `/analyze` usando `MockGaitAnalysisEngine`;
- gravação de `result.json`;
- recuperação por `GET /results/{job_id}`;
- validação de vídeo com OpenCV.

## Teste De Contrato

Confirma se o JSON entregue pelo backend possui os campos que o frontend espera:

- `job.job_id`;
- `job.status`;
- `data.pose3d`;
- `data.skeleton`;
- `data.fitting.coordinate_names`;
- `data.fitting.angles`;
- `data.metricas_clinicas`.

Esse tipo de teste é importante porque o frontend depende do contrato, não da
implementação interna.

## Teste End-To-End

Valida o fluxo do ponto de vista do usuário:

```text
enviar vídeo -> aguardar resultado -> abrir visualização -> conferir gráficos
```

No momento, o foco deve ser em testes leves e de contrato antes de automatizar
um end-to-end completo.

## Como Rodar Testes Localmente

Com dependências instaladas:

```bash
cd backend
python -m pytest tests
```

Se o Python local não tiver dependências, use o Docker CPU:

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
docker run --rm gait-analyzer-backend:cpu python -m pytest tests
```

## Testes Existentes

A suite leve cobre atualmente:

- metricas clinicas deterministicas;
- `GET /health`;
- fluxo mockado de `POST /analyze`, incluindo persistencia de `result.json`;
- recuperacao por `GET /results/{job_id}`;
- validacao de `height_mm`;
- limite de tamanho de upload;
- contrato estrutural do `MockGaitAnalysisEngine`;
- `get_metadata` com arquivo inexistente;
- erro estruturado do pipeline quando a engine falha;
- cliente `RemoteDgxEngine`, incluindo download de artefatos permitidos;
- script de limpeza de storage em modo seguro.

Para rodar tudo:

```bash
cd backend
python -m pytest tests
```

## CI No GitHub Actions

CI significa integracao continua. Neste repositorio, isso quer dizer que o GitHub roda automaticamente uma checagem leve quando ha push ou pull request para `main`:

```text
instalar requirements.api.txt -> compileall -> pytest
```

Isso nao faz deploy. O objetivo e avisar cedo se alguem quebrou import, sintaxe, contrato basico ou testes leves.

## Boa Prática

Cada teste deve ser simples de ler:

```text
Arrange -> Act -> Assert
```

Ou seja:

- preparar dados;
- executar a função ou endpoint;
- verificar o resultado esperado.
