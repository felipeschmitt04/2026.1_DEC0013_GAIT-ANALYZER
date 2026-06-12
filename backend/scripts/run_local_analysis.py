import logging
from app.services.gait_engine import GaitAnalysisEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s | [%(levelname)s] %(message)s")

if __name__ == "__main__":
    motor = GaitAnalysisEngine(window_L=150)

    video_teste = "meu_video.mp4"
    altura_paciente = 1778

    try:
        resultado = motor.process_video(
            video_path=video_teste,
            height_mm=altura_paciente,
            rotated=False
        )
        print("Finalizado")

    except Exception as e:
        print(f"Erro {e}"
