import inspect

import monocular_demos.biomechanics_mjx.visualize as visualize


def print_source(name: str) -> None:
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
    print("visualize module:", visualize.__file__)
    names = sorted(name for name in dir(visualize) if not name.startswith("_"))
    print("public names:", names)

    for name in names:
        if any(token in name.lower() for token in ["render", "trajectory", "xml", "video"]):
            print_source(name)


if __name__ == "__main__":
    main()
