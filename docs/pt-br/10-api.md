# Contrato da API para Frontend

Este contrato define a versao V1 da API que o frontend deve consumir para
upload de video, acompanhamento do job, visualizacao 3D, graficos e relatorio.

O frontend deve considerar `data.model3d`, quando presente, como a fonte
principal para visualizacao 3D fiel do modelo MuJoCo. `data.fitting` continua
sendo a fonte principal para graficos biomecanicos, analises de coordenadas e
fallback visual. `data.pose3d` existe como representacao simples por pontos e
linhas, util para depuracao, fallback visual ou preview de esqueleto.

## URL Base

Em desenvolvimento local:

```text
http://localhost:8000
```

Na Azure/producao, trocar apenas a URL base. Os caminhos dos endpoints devem
continuar iguais.

## Fluxo Recomendado

```text
1. Frontend envia video + altura para POST /analyze
2. Backend processa o video e retorna ResultV1
3. Frontend guarda job.job_id
4. Frontend usa data.model3d para animacao 3D quando disponivel
5. Frontend usa data.fitting para graficos biomecanicos e fallback visual
6. Frontend usa data.metricas_clinicas para graficos/relatorio clinico
7. Frontend pode buscar novamente o resultado em GET /results/{job_id}
```

No momento o processamento e sincrono: `POST /analyze` ja retorna o resultado
final quando o job termina. O endpoint `/status/{job_id}` existe para consulta
e compatibilidade futura, mas nao ha fila assincrona ainda.

## Endpoints

### GET /health

Verifica se a API esta online.

Resposta `200`:

```json
{
  "status": "ok"
}
```

### POST /analyze

Envia um video para analise.

Content-Type:

```text
multipart/form-data
```

Campos:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `video` | arquivo | sim | Video da marcha, preferencialmente `.mp4`. |
| `height_mm` | inteiro | sim | Altura do paciente em milimetros. Exemplo: `1750`. |

Regras:

- `height_mm` deve ser maior que zero.
- O video precisa abrir no OpenCV.
- Videos com FPS baixo, baixa resolucao ou duracao curta podem gerar warnings,
  mas ainda podem ser processados.

Exemplo com `curl`:

```bash
curl -F video=@meu_video.mp4 \
  -F height_mm=1750 \
  http://localhost:8000/analyze
```

Resposta `200`: objeto `ResultV1`.

### GET /status/{job_id}

Retorna o estado conhecido do job.

Resposta quando concluido:

```json
{
  "job_id": "41449887-c694-4c5d-aa1c-bd98110bea75",
  "status": "completed",
  "stage": "finished",
  "created_at": "2026-06-13T03:56:21.223691Z",
  "started_at": "2026-06-13T03:56:21.223697Z",
  "finished_at": "2026-06-13T03:56:21.828820Z",
  "duration_ms": 605
}
```

Possiveis `status`:

| Status | Significado |
| --- | --- |
| `running` | Job criado e iniciado. |
| `processing` | Video validado e pipeline em execucao. |
| `completed` | Resultado final disponivel. |
| `failed` | Falha de validacao ou processamento. |

Possiveis `stage` atuais:

| Stage | Significado |
| --- | --- |
| `ingest` | Recepcao/validacao inicial do video. |
| `fase_1` | Processamento principal da engine. |
| `finished` | Resultado final salvo. |
| `unknown` | Upload existe, mas o resultado ainda nao foi salvo. |

### GET /results/{job_id}

Retorna novamente o JSON salvo para o job.

Uso recomendado:

- recarregar pagina;
- abrir relatorio salvo;
- compartilhar resultado dentro do frontend;
- evitar reenviar o video se o job ja foi processado.

### GET /results/{job_id}/artifacts/{filename}

Retorna artefatos gerados pelo processamento quando existirem.

Nomes aceitos:

| Arquivo | Descricao |
| --- | --- |
| `movimento_exportado.npz` | Exportacao dos dados de movimento/fitting. |
| `3d_rebuild.mp4` | Video renderizado 3D, se existir no futuro. |

Observacao: a visualizacao web nao deve depender de `3d_rebuild.mp4`. O caminho
principal e usar `data.fitting` para animar o modelo 3D interativo no navegador.

## ResultV1

Estrutura geral:

```json
{
  "result_version": "1.0",
  "job": {},
  "error": null,
  "input_summary": {},
  "quality_info": {},
  "data": {}
}
```

### job

```json
{
  "job_id": "string",
  "status": "completed",
  "stage": "finished",
  "created_at": "datetime ISO 8601",
  "started_at": "datetime ISO 8601 ou null",
  "finished_at": "datetime ISO 8601 ou null",
  "duration_ms": 605
}
```

### error

Quando nao ha erro:

```json
null
```

Quando ha erro:

```json
{
  "code": "ERROR_VIDEO_INVALID",
  "message": "O video enviado nao pode ser aberto ou nao atende aos requisitos basicos",
  "stage": "ingest",
  "details": "string opcional",
  "retryable": false
}
```

Codigos conhecidos:

| Codigo | Significado |
| --- | --- |
| `ERROR_104_PATH` | Arquivo nao encontrado no backend. |
| `ERROR_103_VIDEO_OPEN` | OpenCV nao conseguiu abrir o video. |
| `ERROR_101_FPS_INVALID` | FPS invalido ou zero. |
| `ERROR_102_VIDEO_DURATION` | Duracao invalida ou zero. |
| `ERROR_VIDEO_INVALID` | Video falhou nos requisitos basicos. |

### input_summary

```json
{
  "video_path": "storage/uploads/{job_id}/input.mp4",
  "height_mm": 1750,
  "rotated": false,
  "window_L": 150,
  "fps": 59.71508759599958,
  "duration_ms": 4806
}
```

Uso no frontend:

- exibir dados do video no relatorio;
- sincronizar timeline;
- mostrar avisos contextuais.

### quality_info

```json
{
  "frames_total": 287,
  "frames_without_detection": 0,
  "warnings": []
}
```

Warnings conhecidos:

| Warning | Significado |
| --- | --- |
| `WARNING_101_LOW_FPS` | FPS menor que 30. |
| `WARNING_102_VIDEO_SHORT` | Video com menos de 2 segundos. |
| `WARNING_103_LOW_RES` | Resolucao menor que 400 px em algum eixo. |

O frontend deve mostrar warnings de forma nao bloqueante.

## data

```json
{
  "events": [],
  "kinematics": {},
  "pose3d": [],
  "skeleton": {},
  "fitting": {},
  "model3d": null,
  "metricas_clinicas": {},
  "artifacts": null,
  "video_3d": null
}
```

Prioridade de uso no frontend:

| Uso | Campo principal | Campo alternativo |
| --- | --- | --- |
| Modelo 3D preciso/interativo | `data.model3d` | `data.fitting` |
| Graficos biomecanicos | `data.fitting`, `data.metricas_clinicas` | `data.kinematics` |
| Relatorio clinico | `data.metricas_clinicas`, `input_summary`, `quality_info` | `data.fitting` |
| Preview simples de esqueleto | `data.pose3d`, `data.skeleton` | nenhum |

## data.model3d

Quando a engine pesada roda na DGX, o backend pode retornar `data.model3d`.
Esse bloco representa a cena 3D exportada a partir do proprio modelo
MuJoCo/MJX ajustado, evitando que o frontend precise reconstruir manualmente a
hierarquia do `humanoid_torque.xml`.

Exemplo de estrutura:

```json
{
  "version": "1.0",
  "source": "humanoid_torque.xml",
  "representation": "mujoco_geoms",
  "unit": "meters",
  "coordinate_system": {
    "up_axis": "y",
    "forward_axis": "z",
    "right_axis": "x"
  },
  "bodies": [],
  "geoms": [],
  "meshes": [],
  "sites": [],
  "frames": []
}
```

Uso recomendado no frontend:

```text
data.model3d.geoms[index]
data.model3d.frames[frame].geom_xpos[index]
data.model3d.frames[frame].geom_xmat[index]
```

Campos principais:

| Campo | Significado |
| --- | --- |
| `bodies` | Corpos do modelo MuJoCo, com `parent_id` para hierarquia. |
| `geoms` | Geometrias renderizaveis do modelo: esfera, capsula, cilindro, caixa, elipsoide ou mesh. |
| `meshes` | Vertices e faces quando alguma geometria usa tipo `mesh`. |
| `sites` | Pontos auxiliares do modelo, uteis para debug e validacao. |
| `frames[].geom_xpos` | Posicao global de cada geometria por frame. |
| `frames[].geom_xmat` | Matriz de rotacao global 3x3 de cada geometria por frame. |

Regra:

- Se `data.model3d` existir, o frontend deve preferir esse bloco para o avatar
  principal.
- Se `data.model3d` vier `null`, usar `data.fitting` como fallback visual.
- `data.fitting.angles` continua sendo a fonte correta para graficos e series
  biomecanicas.

## data.fitting

Este e o bloco principal para graficos biomecanicos, coordenadas articulares e
fallback visual quando `data.model3d` nao estiver disponivel.

```json
{
  "model": "humanoid_torque",
  "source": "monocular_demos.biomechanics_mjx",
  "xml": "humanoid_torque.xml",
  "coordinates": [],
  "coordinate_names": [],
  "angles": [],
  "timestamps": [],
  "notes": []
}
```

### Regra de indexacao

```text
data.fitting.angles[frame][index]
corresponde a
data.fitting.coordinate_names[index]
```

Exemplo:

```text
angles[10][6] = valor de hip_flexion_r no frame 10
```

### Unidades

| Tipo | Unidade |
| --- | --- |
| Translações da pelve | metros |
| Rotações articulares | radianos |
| Timestamps | segundos |

### Modelo biomecanico

O fitting usa o modelo MuJoCo `humanoid_torque.xml`, vindo de
`monocular_demos.biomechanics_mjx`.

O frontend deve tratar `fitting.model + fitting.xml + coordinate_names` como o
contrato do rig biomecanico. Se um rig Three.js/GLTF for usado, ele precisa
mapear essas coordenadas para os ossos/controles equivalentes.

### Coordenadas do fitting

Ordem definitiva das 40 coordenadas:

| Indice | Nome | Tipo | Unidade | Segmento |
| --- | --- | --- | --- | --- |
| 0 | `pelvis_tx` | translacao | metros | pelve |
| 1 | `pelvis_tz` | translacao | metros | pelve |
| 2 | `pelvis_ty` | translacao | metros | pelve |
| 3 | `pelvis_tilt` | rotacao | radianos | pelve |
| 4 | `pelvis_list` | rotacao | radianos | pelve |
| 5 | `pelvis_rotation` | rotacao | radianos | pelve |
| 6 | `hip_flexion_r` | rotacao | radianos | quadril direito |
| 7 | `hip_adduction_r` | rotacao | radianos | quadril direito |
| 8 | `hip_rotation_r` | rotacao | radianos | quadril direito |
| 9 | `knee_angle_r` | rotacao | radianos | joelho direito |
| 10 | `ankle_angle_r` | rotacao | radianos | tornozelo direito |
| 11 | `subtalar_angle_r` | rotacao | radianos | subtalar direito |
| 12 | `mtp_angle_r` | rotacao | radianos | dedos direito |
| 13 | `hip_flexion_l` | rotacao | radianos | quadril esquerdo |
| 14 | `hip_adduction_l` | rotacao | radianos | quadril esquerdo |
| 15 | `hip_rotation_l` | rotacao | radianos | quadril esquerdo |
| 16 | `knee_angle_l` | rotacao | radianos | joelho esquerdo |
| 17 | `ankle_angle_l` | rotacao | radianos | tornozelo esquerdo |
| 18 | `subtalar_angle_l` | rotacao | radianos | subtalar esquerdo |
| 19 | `mtp_angle_l` | rotacao | radianos | dedos esquerdo |
| 20 | `lumbar_extension` | rotacao | radianos | lombar |
| 21 | `lumbar_bending` | rotacao | radianos | lombar |
| 22 | `lumbar_rotation` | rotacao | radianos | lombar |
| 23 | `neck_extension` | rotacao | radianos | pescoco |
| 24 | `neck_bending` | rotacao | radianos | pescoco |
| 25 | `neck_rotation` | rotacao | radianos | pescoco |
| 26 | `arm_flex_r` | rotacao | radianos | ombro direito |
| 27 | `arm_add_r` | rotacao | radianos | ombro direito |
| 28 | `arm_rot_r` | rotacao | radianos | ombro direito |
| 29 | `elbow_flex_r` | rotacao | radianos | cotovelo direito |
| 30 | `pro_sup_r` | rotacao | radianos | antebraco direito |
| 31 | `wrist_flex_r` | rotacao | radianos | punho direito |
| 32 | `wrist_dev_r` | rotacao | radianos | punho direito |
| 33 | `arm_flex_l` | rotacao | radianos | ombro esquerdo |
| 34 | `arm_add_l` | rotacao | radianos | ombro esquerdo |
| 35 | `arm_rot_l` | rotacao | radianos | ombro esquerdo |
| 36 | `elbow_flex_l` | rotacao | radianos | cotovelo esquerdo |
| 37 | `pro_sup_l` | rotacao | radianos | antebraco esquerdo |
| 38 | `wrist_flex_l` | rotacao | radianos | punho esquerdo |
| 39 | `wrist_dev_l` | rotacao | radianos | punho esquerdo |

### coordinates

Cada item de `coordinates` detalha uma coordenada:

```json
{
  "name": "hip_flexion_r",
  "kind": "rotation",
  "segment": "right_hip",
  "axis": [0.0, 0.0, 1.0],
  "units": "radians",
  "range": [-0.787, 2.0944]
}
```

O frontend pode usar esse metadado para:

- validar se recebeu 40 colunas;
- nomear graficos;
- montar legendas;
- mapear coordenadas para controles do modelo 3D;
- converter radianos para graus na interface.

### angles

Matriz temporal:

```text
shape: [frames, 40]
```

Exemplo abreviado:

```json
[
  [0.0, 0.0, 0.0, 0.01, 0.02],
  [0.0, 0.0, 0.0, 0.02, 0.03]
]
```

Para graficos:

```js
const i = result.data.fitting.coordinate_names.indexOf("knee_angle_r");
const serie = result.data.fitting.angles.map((frame) => frame[i]);
```

Para exibir em graus:

```js
const degrees = radians * 180 / Math.PI;
```

## data.pose3d e data.skeleton

`pose3d` e uma representacao por keypoints 3D:

```text
data.pose3d[frame][joint] = [x, y, z]
```

Unidade: metros.

Origem: pelve.

Uso recomendado:

- preview rapido;
- debug;
- fallback visual;
- desenho de esqueleto simples por pontos e linhas.

O frontend deve preferir `data.fitting` para o modelo 3D final.

### skeleton

```json
{
  "name": "mpi_inf_3dhp_17_normalized",
  "joint_names": [],
  "connections": [],
  "root_joint": "pelvis",
  "units": "meters",
  "coordinate_system": {
    "x": "lateral",
    "y": "vertical",
    "z": "depth",
    "origin": "pelvis"
  }
}
```

Regra:

```text
connections = pares de indices em joint_names
```

Exemplo:

```text
[0, 1] liga pelvis a right_hip
```

## data.metricas_clinicas

Series temporais calculadas a partir da pose 3D:

```json
{
  "joelho_direito_graus": [],
  "joelho_esquerdo_graus": [],
  "quadril_direito_graus": [],
  "quadril_esquerdo_graus": [],
  "distancia_tornozelos_mm": []
}
```

Uso no frontend:

- graficos clinicos;
- cards resumidos;
- relatorio;
- comparacao entre lados direito/esquerdo.

Observacao: mesmo quando o avatar principal usar `data.model3d`, essas metricas
podem ser exibidas diretamente no relatorio porque ja estao em unidades
clinicas amigaveis.

## data.kinematics

Bloco legado/baixo nivel:

```json
{
  "angles": [],
  "timestamps": []
}
```

O frontend deve preferir `data.fitting`, que inclui os mesmos valores de
`angles`/`timestamps` com metadados completos.

## data.events

Saida temporal do GaitTransformer + suavizacao por Kalman.

Formato atual:

```text
array temporal
```

Uso recomendado agora:

- manter salvo para evolucao;
- nao depender desse campo para a primeira versao visual do frontend sem uma
  validacao conjunta do significado de cada coluna.

## Exemplo de Fetch no Frontend

```js
async function analyzeVideo(file, heightMm) {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("height_mm", String(heightMm));

  const response = await fetch("http://localhost:8000/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Falha na analise: HTTP ${response.status}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}
```

## Exemplo de Uso do Fitting

```js
const fitting = result.data.fitting;
const frameIndex = 0;

const poseForRig = Object.fromEntries(
  fitting.coordinate_names.map((name, index) => [
    name,
    fitting.angles[frameIndex][index],
  ])
);

// poseForRig.hip_flexion_r, poseForRig.knee_angle_r, etc.
```

## Campos Estaveis para o Frontend

O frontend pode depender destes campos na V1:

- `result_version`
- `job.job_id`
- `job.status`
- `job.stage`
- `input_summary.height_mm`
- `input_summary.fps`
- `input_summary.duration_ms`
- `quality_info.frames_total`
- `quality_info.warnings`
- `data.fitting.model`
- `data.fitting.xml`
- `data.fitting.coordinate_names`
- `data.fitting.coordinates`
- `data.fitting.angles`
- `data.fitting.timestamps`
- `data.model3d`
- `data.pose3d`
- `data.skeleton`
- `data.metricas_clinicas`

## Decisoes para o Frontend

- Modelo 3D interativo: usar `data.model3d` quando existir.
- Fallback de modelo 3D: usar `data.fitting`.
- Graficos biomecanicos detalhados: usar `data.fitting`.
- Graficos clinicos simples: usar `data.metricas_clinicas`.
- Relatorio: combinar `input_summary`, `quality_info`,
  `data.metricas_clinicas` e series selecionadas de `data.fitting`.
- Esqueleto simples/fallback: usar `data.pose3d` e `data.skeleton`.
- Nao depender de video renderizado no backend para a primeira integracao.

## Observacoes sobre Mock

Em `USE_MOCK_ENGINE=true`, a API retorna o mesmo contrato estrutural, mas os
valores de `pose3d` e `fitting.angles` sao simulados.

Isso serve para o frontend desenvolver:

- upload;
- loading;
- tela de resultado;
- graficos;
- timeline;
- modelo 3D;
- relatorio.

Quando `USE_MOCK_ENGINE=false` estiver rodando em ambiente completo, o mesmo
contrato sera preenchido com a saida real da engine.
