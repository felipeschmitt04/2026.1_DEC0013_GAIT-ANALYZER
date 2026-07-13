import inspect

import monocular_demos.biomechanics_mjx.visualize as visualize


def print_source(name: str) -> None:
    """Imprime o codigo-fonte de um simbolo do modulo `visualize`.

    Parametros:
        name: Nome da funcao/objeto publico a procurar.

    Saida:
        Nao retorna valor. Escreve o resultado no terminal.
    """
    value = getattr(visualize, name, None)
    print(f"\n### {name}")
    if value is None:
        print("NAO ENCONTRADO")
        return

    try:
        print(inspect.getsource(value))
    except (OSError, TypeError) as exc:
        print(f"SEM SOURCE: {exc}")


def main() -> None:
    """Lista simbolos publicos de `visualize` e imprime os relacionados a render.

    Parametros:
        Nenhum.

    Saida:
        Nao retorna valor. Ajuda a entender como o render oficial funciona.
    """
    print("visualize module:", visualize.__file__)
    names = sorted(name for name in dir(visualize) if not name.startswith("_"))
    print("public names:", names)

    for name in names:
        if any(token in name.lower() for token in ["render", "trajectory", "xml", "video"]):
            print_source(name)


if __name__ == "__main__":
    main()
