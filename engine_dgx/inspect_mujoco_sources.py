import inspect
import logging

from monocular_demos.biomechanics_mjx.monocular_trajectory import get_default_wrapper
from monocular_demos.biomechanics_mjx import visualize


logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger("InspectMuJoCo")


def summarize_object(label, obj, max_items=120):
    """Registra atributos relevantes de um objeto para investigacao.

    Parametros:
        label: Nome usado para identificar o objeto no log.
        obj: Objeto inspecionado.
        max_items: Quantidade maxima de atributos listados.

    Saida:
        Nao retorna valor. Escreve tipo, atributos e shapes no logger.
    """
    names = sorted(name for name in dir(obj) if not name.startswith("__"))
    logger.info("%s type: %s", label, type(obj))
    logger.info("%s attrs: %s", label, names[:max_items])

    shaped = []
    for name in names[:max_items]:
        try:
            value = getattr(obj, name)
        except Exception as exc:
            shaped.append(f"{name}: <erro {exc}>")
            continue

        shape = getattr(value, "shape", None)
        if shape is not None:
            shaped.append(f"{name}: shape={tuple(shape)}")
        elif isinstance(value, (str, int, float, bool, type(None))):
            shaped.append(f"{name}: {value!r}")
        elif hasattr(value, "__dict__"):
            shaped.append(f"{name}: type={type(value).__name__}")

    logger.info("%s shaped/simple attrs: %s", label, shaped[:max_items])


def main():
    """Inspeciona fontes e objetos do pacote de visualizacao MuJoCo.

    Parametros:
        Nenhum.

    Saida:
        Nao retorna valor. Imprime o source de `render_trajectory` e logs do wrapper.
    """
    logger.info("visualize module: %s", visualize.__file__)

    logger.info("===== render_trajectory source =====")
    print(inspect.getsource(visualize.render_trajectory))

    wrapper = get_default_wrapper()
    summarize_object("wrapper", wrapper)

    for name in sorted(n for n in dir(wrapper) if not n.startswith("__")):
        try:
            value = getattr(wrapper, name)
        except Exception:
            continue
        if hasattr(value, "__dict__"):
            summarize_object(f"wrapper.{name}", value, max_items=60)


if __name__ == "__main__":
    main()
