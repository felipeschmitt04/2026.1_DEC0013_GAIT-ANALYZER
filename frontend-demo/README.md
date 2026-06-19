# Demo 3D do Backend

Este prototipo usa Three.js para visualizar dados retornados pelo backend em
tres modos:

- `MuJoCo`: desenha `data.model3d`, quando a DGX exporta as geometrias reais do
  modelo `humanoid_torque.xml`;
- `Pose3D`: desenha diretamente `data.pose3d` e `data.skeleton.connections`;
- `Fitting`: usa `data.fitting.coordinate_names` e `data.fitting.angles` para
  dirigir um rig humanoide simplificado de fallback.

## Como Rodar

Na raiz do repositorio:

```bash
cd frontend-demo
python3 -m http.server 5173
```

Abra:

```text
http://localhost:5173
```

## Formas De Carregar Dados

1. Usar a amostra interna, carregada automaticamente.
2. Carregar um JSON local gerado pelo backend, por exemplo:

```text
backend/storage/temp/sprint2_analyze_result.json
```

3. Buscar da API local informando um `job_id`.

Para a opcao de API, o backend precisa estar rodando em:

```text
http://localhost:8000
```

## Escopo

Esta demo desenha um esqueleto simples com:

- 17 juntas vindas de `data.pose3d`;
- linhas vindas de `data.skeleton.connections`;
- metricas clinicas por frame quando disponiveis.
- um rig simplificado usando coordenadas principais do fitting:
  - `pelvis_tx`, `pelvis_ty`, `pelvis_tz`;
  - `pelvis_tilt`, `pelvis_list`, `pelvis_rotation`;
  - `hip_flexion_*`, `knee_angle_*`, `ankle_angle_*`;
  - `arm_flex_*`, `elbow_flex_*`.
- grafico de coordenadas com:
  - linha cinza para o dado bruto;
  - linha ciano para a serie suavizada usada na leitura visual;
  - rotacoes exibidas em graus;
  - translacoes exibidas em metros.

## Normalizacao Visual

O demo aplica uma normalizacao somente na renderizacao Three.js:

- centraliza o corpo pelo pelvis;
- estima uma escala visual para o `pose3d`;
- alinha a direcao geral da marcha para um eixo visual estavel;
- remove offsets iniciais de altura;
- suaviza os angulos usados apenas pelo avatar;
- mantem o rig simplificado apoiado no chao;
- evita aplicar a rotacao global crua da pelve no avatar.

Isso nao altera o JSON gerado pelo backend. As coordenadas e angulos brutos
continuam disponiveis para graficos, metricas e validacao clinica. A
normalizacao serve apenas para comparar videos gravados de lados diferentes
sem o boneco mudar de direcao ou ficar visualmente instavel.

## Observacao Sobre O Fitting

O modo `MuJoCo` e o alvo principal para uma visualizacao profissional, porque
usa geometrias e poses exportadas pelo proprio modelo biomecanico depois do
fitting. O frontend recebe uma cena pronta em `data.model3d`:

```text
data.model3d.geoms
data.model3d.meshes
data.model3d.frames[frame].geom_xpos
data.model3d.frames[frame].geom_xmat
```

O modo `Fitting` nao e um rig clinico final. Ele e um prototipo de integracao
para mostrar ao frontend como consumir:

```text
data.fitting.coordinate_names[index]
data.fitting.angles[frame][index]
```

O mapeamento visual completo ainda precisa ser calibrado com o modelo
biomecanico usado no fitting (`humanoid_torque.xml`). Essa evolucao fica para o
Sprint 3, mas o contrato de dados ja esta demonstrado aqui.

O JSON possui dois niveis diferentes de esqueleto/modelo:

- `data.pose3d`: 17 keypoints 3D, util para debug e fallback visual, mas nao e
  um modelo clinico completo;
- `data.fitting`: 40 coordenadas generalizadas do modelo biomecanico, incluindo
  pelve, quadris, joelhos, tornozelos, subtalar, dedos, lombar, pescoco,
  ombros, cotovelos, antebracos e punhos.

O avatar Three.js deste demo usa apenas um subconjunto dessas coordenadas para
ficar estavel no navegador. Um avatar final deveria usar a hierarquia completa
do `humanoid_torque.xml` ou receber do backend as posicoes/orientacoes dos corpos
ja calculadas por forward kinematics.
