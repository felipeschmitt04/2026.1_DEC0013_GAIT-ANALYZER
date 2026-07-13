from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
async def health_check():
    """Confirma que a API subiu e esta respondendo.

    Parametros:
        Nenhum.

    Retorna:
        Um dicionario simples com `status="ok"`, usado por deploy, Caddy e testes rapidos.
    """
    return {"status": "ok"}
