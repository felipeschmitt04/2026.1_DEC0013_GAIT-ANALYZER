from collections import Counter

from model3d_export import GEOM_TYPE_NAMES, find_humanoid_xml_path, load_mujoco_model_from_package
from monocular_demos.biomechanics_mjx.monocular_trajectory import get_default_wrapper


def main() -> None:
    wrapper = get_default_wrapper()
    xml_path = find_humanoid_xml_path()
    model = load_mujoco_model_from_package()

    print("wrapper:", type(wrapper))
    print("wrapper.njoints:", getattr(wrapper, "njoints", None))
    print("wrapper.nvjoints:", getattr(wrapper, "nvjoints", None))
    print("wrapper.freeroot:", getattr(wrapper, "freeroot", None))
    print("wrapper.forward:", type(getattr(wrapper, "forward", None)))
    print("xml_path:", xml_path)

    if model is None:
        print("MjModel: nao carregado")
        return

    print("MjModel.nq:", model.nq)
    print("MjModel.nv:", model.nv)
    print("MjModel.nbody:", model.nbody)
    print("MjModel.ngeom:", model.ngeom)
    print("MjModel.nsite:", model.nsite)
    print("MjModel.nmesh:", model.nmesh)

    geom_types = Counter(GEOM_TYPE_NAMES.get(int(value), f"unknown_{int(value)}") for value in model.geom_type)
    print("geom_types:", dict(sorted(geom_types.items())))

    if model.nq == getattr(wrapper, "njoints", None):
        print("OK: model.nq bate com wrapper.njoints")
    else:
        print("ATENCAO: model.nq nao bate com wrapper.njoints")


if __name__ == "__main__":
    main()
