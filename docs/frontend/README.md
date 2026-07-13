# Frontend

O frontend final deste projeto e desenvolvido em outro repositorio/ambiente pelo Eduardo. Este backend deve expor somente a API HTTP e manter o contrato documentado em `docs/backend/pt-br/10-api.md`.

A pasta `frontend-demo/` deste repositorio nao e o frontend final. Ela e uma ferramenta local para validar visualmente o JSON `ResultV1`, principalmente:

- `data.model3d`, gerado pela DGX quando disponivel;
- `data.pose3d` e `data.skeleton`, como fallback/debug;
- `data.fitting.coordinate_names` e `data.fitting.angles`, para graficos e prototipos de movimento.

Para integracao real, o frontend externo deve chamar a URL do backend central, nunca o worker DGX diretamente.
