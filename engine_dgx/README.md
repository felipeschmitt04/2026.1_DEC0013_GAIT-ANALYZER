# Engine DGX Worker

API isolada para processamento pesado na DGX.

Esta API nao substitui o backend central. Ela funciona como worker remoto:

```text
Backend Azure -> Engine DGX Worker -> raw_data
```

O frontend continua falando apenas com o backend central.

## Endpoints

### GET /health

Verifica se o worker esta online e se a engine ja foi carregada.

### POST /warmup

Carrega a engine pesada antes do primeiro processamento. Este endpoint pode
demorar, porque baixa/carrega MeTRAbs e GaitTransformer.

### POST /clear-cache

Limpa caches JAX/Equinox. O `/process` ja faz limpeza automatica antes e depois
do processamento; este endpoint fica como emergencia/debug.

### POST /process

Recebe:

- `video`: arquivo de video;
- `height_mm`: altura em milimetros;
- `rotated`: opcional, `true`/`false`.

Retorna:

```json
{
  "job_id": "uuid",
  "status": "completed",
  "raw_data": {
    "events": [],
    "pose3d": [],
    "kinematics": {
      "angles": [],
      "timestamps": []
    },
    "model3d": {
      "representation": "mujoco_geoms",
      "geoms": [],
      "meshes": [],
      "frames": []
    }
  },
  "artifacts": {}
}
```

`raw_data.model3d` e opcional. Quando presente com
`representation = "mujoco_geoms"`, ele contem a cena 3D exportada por forward
kinematics do modelo `humanoid_torque.xml`:

- `geoms`: geometrias renderizaveis do MuJoCo;
- `meshes`: vertices/faces de geometrias do tipo mesh;
- `frames[].geom_xpos`: posicoes globais das geometrias por frame;
- `frames[].geom_xmat`: matrizes de rotacao 3x3 das geometrias por frame.

Esse bloco e a fonte preferida para visualizacao 3D profissional no frontend.

## Como Rodar Na DGX

Ative o ambiente conda que ja possui as dependencias:

```bash
conda activate gait_env
```

Entre na pasta:

```bash
cd engine_dgx
```

Suba a API:

```bash
uvicorn main:app --host 0.0.0.0 --port 9000
```

Teste:

```bash
curl http://localhost:9000/health
```

Carregar a engine:

```bash
curl -X POST http://localhost:9000/warmup
```

Limpar caches manualmente, se necessario:

```bash
curl -X POST http://localhost:9000/clear-cache
```

Processamento:

```bash
curl -F video=@/caminho/video.mp4 \
  -F height_mm=1750 \
  http://localhost:9000/process \
  -o dgx_raw_result.json
```

Checar se o modelo 3D completo veio no resultado:

```bash
python -c "import json; r=json.load(open('dgx_raw_result.json')); m=r['raw_data'].get('model3d'); print(m and m.get('representation')); print('geoms:', len(m.get('geoms', [])) if m else 0); print('frames:', len(m.get('frames', [])) if m else 0)"
```

## Observacao

Este worker retorna `raw_data`. O backend central continua responsavel por montar
`ResultV1`, calcular metricas clinicas, incluir `skeleton`, `fitting` e salvar
`result.json`.
