import logging
from typing import Any

import numpy as np


logger = logging.getLogger("EngineDGX.Model3D")

GEOM_TYPE_NAMES = {
    0: "plane",
    1: "hfield",
    2: "sphere",
    3: "capsule",
    4: "ellipsoid",
    5: "cylinder",
    6: "box",
    7: "mesh",
    8: "sdf",
}


def build_model3d_payload(wrapper: Any, state: Any) -> dict | None:
    """Exporta uma cena 3D leve derivada do modelo MuJoCo/MJX ajustado.

    O objetivo e entregar ao frontend a geometria real do modelo biomecanico,
    evitando que o navegador tenha que reimplementar a hierarquia do XML.
    """

    try:
        model = find_mujoco_model(wrapper)
        if model is None:
            logger.warning("Modelo MuJoCo nao encontrado no wrapper")
            log_object_summary("wrapper", wrapper)
            log_object_summary("state", state)
            return build_state_only_payload(state)

        geoms = export_geoms(model)
        meshes = export_meshes(model)
        bodies = export_bodies(model)
        sites = export_sites(model)
        frames = export_frames(state)

        if not frames:
            logger.warning("State nao possui campos exportaveis para model3d")
            return None

        return {
            "version": "1.0",
            "source": "humanoid_torque.xml",
            "representation": "mujoco_geoms",
            "unit": "meters",
            "coordinate_system": {
                "up_axis": "y",
                "forward_axis": "z",
                "right_axis": "x",
            },
            "bodies": bodies,
            "geoms": geoms,
            "meshes": meshes,
            "sites": sites,
            "frames": frames,
            "notes": [
                "Gerado por forward kinematics do modelo MuJoCo/MJX ajustado.",
                "Use geoms + frames.geom_xpos/geom_xmat para renderizacao fiel.",
                "Sites sao pontos auxiliares do modelo e podem ser usados para debug.",
            ],
        }
    except Exception:
        logger.exception("Falha ao exportar model3d")
        return None


def build_state_only_payload(state: Any) -> dict | None:
    frames = export_frames(state)
    if not frames:
        logger.warning("State nao possui campos exportaveis para model3d")
        log_object_summary("state_sem_frames", state)
        return None

    return {
        "version": "1.0",
        "source": "humanoid_torque.xml",
        "representation": "state_only",
        "unit": "meters",
        "coordinate_system": {
            "up_axis": "y",
            "forward_axis": "z",
            "right_axis": "x",
        },
        "bodies": [],
        "geoms": [],
        "meshes": [],
        "sites": [],
        "frames": frames,
        "notes": [
            "Wrapper nao expos o MjModel, mas o state foi exportado.",
            "Use este payload para inspecao e ajuste do exportador na DGX.",
        ],
    }


def find_mujoco_model(wrapper: Any) -> Any | None:
    candidates = [
        "mj_model",
        "mujoco_model",
        "model",
        "mjx_model",
        "sys",
        "fk.model",
        "fkw.model",
        "kinematics.model",
        "forward_kinetics.model",
        "forward_kinematics.model",
    ]

    for path in candidates:
        value = get_nested_attr(wrapper, path)
        if looks_like_mujoco_model(value):
            return value

    if not hasattr(wrapper, "__dict__"):
        return None

    nested = find_model_recursive(wrapper, max_depth=4)
    if nested is not None:
        return nested

    return None


def log_object_summary(label: str, obj: Any, max_items: int = 80) -> None:
    try:
        names = sorted(name for name in dir(obj) if not name.startswith("__"))
    except Exception as exc:
        logger.warning("Nao foi possivel listar atributos de %s: %s", label, exc)
        return

    logger.warning("%s tipo: %s", label, type(obj))
    logger.warning("%s atributos: %s", label, names[:max_items])

    shaped = []
    for name in names[:max_items]:
        try:
            value = getattr(obj, name)
        except Exception:
            continue

        shape = getattr(value, "shape", None)
        if shape is not None:
            shaped.append(f"{name}: shape={tuple(shape)}")
            continue

        if isinstance(value, (int, float, str, bool, type(None))):
            shaped.append(f"{name}: {value!r}")
            continue

        if hasattr(value, "__dict__"):
            shaped.append(f"{name}: type={type(value).__name__}")

    logger.warning("%s atributos_com_shape_ou_tipo: %s", label, shaped[:max_items])


def find_model_recursive(
    obj: Any,
    max_depth: int,
    seen: set[int] | None = None,
) -> Any | None:
    if seen is None:
        seen = set()

    if obj is None or max_depth < 0:
        return None

    obj_id = id(obj)
    if obj_id in seen:
        return None
    seen.add(obj_id)

    if looks_like_mujoco_model(obj):
        return obj

    if not hasattr(obj, "__dict__"):
        return None

    for name, value in vars(obj).items():
        if name.startswith("_") and name not in {"_model", "_mj_model", "_mujoco_model"}:
            continue

        found = find_model_recursive(value, max_depth=max_depth - 1, seen=seen)
        if found is not None:
            return found

    return None


def looks_like_mujoco_model(value: Any) -> bool:
    return value is not None and hasattr(value, "ngeom") and hasattr(value, "nbody")


def get_nested_attr(obj: Any, path: str) -> Any | None:
    current = obj
    for part in path.split("."):
        if current is None or not hasattr(current, part):
            return None
        current = getattr(current, part)
    return current


def export_bodies(model: Any) -> list[dict]:
    body_parentid = to_numpy(getattr(model, "body_parentid", []), dtype=int)
    nbody = int(getattr(model, "nbody", len(body_parentid)))

    bodies = []
    for body_id in range(nbody):
        parent_id = int(body_parentid[body_id]) if body_id < len(body_parentid) else -1
        bodies.append(
            {
                "id": body_id,
                "name": get_model_name(model, "body", body_id) or f"body_{body_id}",
                "parent_id": parent_id,
                "parent_name": get_model_name(model, "body", parent_id)
                if parent_id >= 0
                else None,
            }
        )

    return bodies


def export_geoms(model: Any) -> list[dict]:
    ngeom = int(getattr(model, "ngeom", 0))
    geom_type = to_numpy(getattr(model, "geom_type", []), dtype=int)
    geom_bodyid = to_numpy(getattr(model, "geom_bodyid", []), dtype=int)
    geom_dataid = to_numpy(getattr(model, "geom_dataid", []), dtype=int)
    geom_size = to_numpy(getattr(model, "geom_size", []), dtype=float)
    geom_rgba = to_numpy(getattr(model, "geom_rgba", []), dtype=float)

    geoms = []
    for geom_id in range(ngeom):
        type_id = int(geom_type[geom_id]) if geom_id < len(geom_type) else -1
        body_id = int(geom_bodyid[geom_id]) if geom_id < len(geom_bodyid) else -1
        mesh_id = int(geom_dataid[geom_id]) if type_id == 7 and geom_id < len(geom_dataid) else -1
        geoms.append(
            {
                "id": geom_id,
                "name": get_model_name(model, "geom", geom_id) or f"geom_{geom_id}",
                "type_id": type_id,
                "type": GEOM_TYPE_NAMES.get(type_id, "unknown"),
                "body_id": body_id,
                "body_name": get_model_name(model, "body", body_id)
                if body_id >= 0
                else None,
                "mesh_id": mesh_id if mesh_id >= 0 else None,
                "size": safe_row(geom_size, geom_id, 3),
                "rgba": safe_row(geom_rgba, geom_id, 4, default=[0.55, 0.8, 0.45, 1.0]),
            }
        )

    return geoms


def export_meshes(model: Any) -> list[dict]:
    nmesh = int(getattr(model, "nmesh", 0))
    if nmesh <= 0:
        return []

    mesh_vert = to_numpy(getattr(model, "mesh_vert", []), dtype=float)
    mesh_face = to_numpy(getattr(model, "mesh_face", []), dtype=int)
    mesh_vertadr = to_numpy(getattr(model, "mesh_vertadr", []), dtype=int)
    mesh_vertnum = to_numpy(getattr(model, "mesh_vertnum", []), dtype=int)
    mesh_faceadr = to_numpy(getattr(model, "mesh_faceadr", []), dtype=int)
    mesh_facenum = to_numpy(getattr(model, "mesh_facenum", []), dtype=int)

    meshes = []
    for mesh_id in range(nmesh):
        vert_start = int(mesh_vertadr[mesh_id]) if mesh_id < len(mesh_vertadr) else 0
        vert_count = int(mesh_vertnum[mesh_id]) if mesh_id < len(mesh_vertnum) else 0
        face_start = int(mesh_faceadr[mesh_id]) if mesh_id < len(mesh_faceadr) else 0
        face_count = int(mesh_facenum[mesh_id]) if mesh_id < len(mesh_facenum) else 0

        meshes.append(
            {
                "id": mesh_id,
                "name": get_model_name(model, "mesh", mesh_id) or f"mesh_{mesh_id}",
                "vertices": mesh_vert[vert_start : vert_start + vert_count].tolist(),
                "faces": mesh_face[face_start : face_start + face_count].tolist(),
            }
        )

    return meshes


def export_sites(model: Any) -> list[dict]:
    nsite = int(getattr(model, "nsite", 0))
    site_bodyid = to_numpy(getattr(model, "site_bodyid", []), dtype=int)

    sites = []
    for site_id in range(nsite):
        body_id = int(site_bodyid[site_id]) if site_id < len(site_bodyid) else -1
        sites.append(
            {
                "id": site_id,
                "name": get_model_name(model, "site", site_id) or f"site_{site_id}",
                "body_id": body_id,
                "body_name": get_model_name(model, "body", body_id)
                if body_id >= 0
                else None,
            }
        )

    return sites


def export_frames(state: Any) -> list[dict]:
    geom_xpos = state_array(state, "geom_xpos")
    geom_xmat = state_array(state, "geom_xmat")
    body_xpos = first_state_array(state, "xpos", "body_xpos")
    body_xmat = first_state_array(state, "xmat", "body_xmat")
    site_xpos = state_array(state, "site_xpos")

    frame_count = infer_frame_count(geom_xpos, body_xpos, site_xpos)
    frames = []

    for frame_index in range(frame_count):
        frame = {}
        add_frame_array(frame, "geom_xpos", geom_xpos, frame_index)
        add_frame_array(frame, "geom_xmat", geom_xmat, frame_index)
        add_frame_array(frame, "body_xpos", body_xpos, frame_index)
        add_frame_array(frame, "body_xmat", body_xmat, frame_index)
        add_frame_array(frame, "site_xpos", site_xpos, frame_index)
        frames.append(frame)

    return frames


def infer_frame_count(*arrays: Any) -> int:
    for array in arrays:
        if array is not None and getattr(array, "ndim", 0) >= 2:
            return int(array.shape[0])
    return 0


def add_frame_array(frame: dict, name: str, values: np.ndarray | None, frame_index: int) -> None:
    if values is None or values.ndim < 2:
        return

    row = values[frame_index]
    if row.ndim == 3 and row.shape[-2:] == (3, 3):
        row = row.reshape(row.shape[0], 9)

    frame[name] = row.tolist()


def state_array(state: Any, name: str) -> np.ndarray | None:
    if not hasattr(state, name):
        return None

    value = to_numpy(getattr(state, name), dtype=float)
    if value.size == 0:
        return None

    return value


def first_state_array(state: Any, *names: str) -> np.ndarray | None:
    for name in names:
        value = state_array(state, name)
        if value is not None:
            return value
    return None


def get_model_name(model: Any, object_type: str, object_id: int) -> str | None:
    if object_id < 0:
        return None

    try:
        import mujoco

        enum_by_type = {
            "body": mujoco.mjtObj.mjOBJ_BODY,
            "geom": mujoco.mjtObj.mjOBJ_GEOM,
            "site": mujoco.mjtObj.mjOBJ_SITE,
            "mesh": mujoco.mjtObj.mjOBJ_MESH,
        }
        enum_value = enum_by_type.get(object_type)
        if enum_value is None:
            return None
        return mujoco.mj_id2name(model, enum_value, int(object_id))
    except Exception:
        pass

    return None


def safe_row(array: np.ndarray, index: int, width: int, default: list[float] | None = None):
    if default is None:
        default = [0.0] * width
    if array.ndim < 2 or index >= array.shape[0]:
        return default
    row = array[index].tolist()
    return row[:width] + default[len(row) : width]


def to_numpy(value: Any, dtype=None) -> np.ndarray:
    if value is None:
        return np.array([], dtype=dtype or float)

    try:
        array = np.asarray(value)
    except Exception:
        try:
            array = np.asarray(value.tolist())
        except Exception:
            return np.array([], dtype=dtype or float)

    if dtype is not None:
        try:
            array = array.astype(dtype)
        except (TypeError, ValueError):
            return np.array([], dtype=dtype)

    return array
