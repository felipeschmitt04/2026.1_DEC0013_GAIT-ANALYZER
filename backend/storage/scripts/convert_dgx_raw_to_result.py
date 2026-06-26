import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi.encoders import jsonable_encoder

from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo
from app.schemas.result import BiomechanicalData, ResultV1
from app.services.clinical_metrics import calculate_clinical_metrics
from app.services.fitting_metadata import build_fitting_payload
from app.services.skeleton import get_pose3d_skeleton_info


def parse_args():
    parser = argparse.ArgumentParser(
        description="Converte a resposta raw do worker DGX para ResultV1."
    )
    parser.add_argument("input", type=Path, help="Arquivo dgx_raw_result.json")
    parser.add_argument("output", type=Path, help="Arquivo ResultV1 de saida")
    parser.add_argument("--height-mm", type=int, default=1750)
    parser.add_argument("--fps", type=float, default=30.0)
    parser.add_argument("--window-l", type=int, default=150)
    parser.add_argument("--video-path", default="dgx/inferencia_real.mp4")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    raw_data = payload["raw_data"]
    pose3d = raw_data["pose3d"]
    kinematics = raw_data["kinematics"]

    now = datetime.now(timezone.utc)
    frame_count = len(pose3d)
    duration_ms = int((frame_count / args.fps) * 1000) if args.fps > 0 else 0

    job = JobInfo(
        job_id=payload.get("job_id", "dgx-real"),
        status=payload.get("status", "completed"),
        stage="finished",
        created_at=now,
        started_at=now,
        finished_at=now,
        duration_ms=0,
    )

    result = ResultV1(
        result_version="1.0",
        job=job,
        input_summary=InputSummary(
            video_path=args.video_path,
            height_mm=args.height_mm,
            rotated=False,
            window_L=args.window_l,
            fps=args.fps,
            duration_ms=duration_ms,
        ),
        quality_info=QualityInfo(
            frames_total=frame_count,
            frames_without_detection=0,
            warnings=[],
        ),
        data=BiomechanicalData(
            events=raw_data["events"],
            kinematics=kinematics,
            pose3d=pose3d,
            skeleton=get_pose3d_skeleton_info(),
            fitting=build_fitting_payload(kinematics),
            model3d=raw_data.get("model3d"),
            metricas_clinicas=calculate_clinical_metrics(pose3d),
            artifacts=payload.get("artifacts") or None,
            video_3d=None,
        ),
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(jsonable_encoder(result), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Arquivo gerado: {args.output}")
    print(f"job_id: {result.job.job_id}")
    print(f"pose3d frames: {len(result.data.pose3d)}")
    print(f"fitting frames: {len(result.data.fitting['angles'])}")
    print(f"fitting coordenadas: {len(result.data.fitting['coordinate_names'])}")


if __name__ == "__main__":
    main()
