import os
import jax
import equinox as eqx
# =========================================================
# AS REGRAS DE OURO DA VRAM
# =========================================================
os.environ['XLA_PYTHON_CLIENT_PREALLOCATE'] = 'false'
os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'
os.environ['MUJOCO_GL'] = 'egl' 

import shutil
import logging
import numpy as np # <-- O Numpy normal vive APENAS AQUI!
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

# Importa a IA pesada
from app.services.gait_engine import GaitAnalysisEngine

# =========================================================
# MATEMÁTICA ISOLADA (Longe do JAX)
# =========================================================
def calcular_angulo_3d(p1, p2, p3):
    """Calcula a flexão de uma articulação em graus clínicos (0º = esticado)"""
    v1 = np.array(p1) - np.array(p2)
    v2 = np.array(p3) - np.array(p2)
    
    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)
    
    dot_product = np.clip(np.dot(v1_u, v2_u), -1.0, 1.0)
    angulo_interno = float(np.degrees(np.arccos(dot_product)))
    
    # Converte para a Escala Médica (180 - ângulo)
    flexao_clinica = 180.0 - angulo_interno
    return flexao_clinica

def calcular_distancia_3d(p1, p2):
    """Calcula a distância física entre dois pontos 3D"""
    return float(np.linalg.norm(np.array(p1) - np.array(p2)))

# =========================================================
# INICIALIZAÇÃO DA API
# =========================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

app = FastAPI(title="Gait Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Iniciando a Engine de IA (carregando modelos na VRAM dinamicamente)...")
engine = GaitAnalysisEngine()
logger.info("Engine pronta!")

@app.post("/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    height_mm: int = Form(...)
):
    # =========================================================
    # A PÍLULA MÁGICA: Limpa o Cache do JAX antes do próximo vídeo
    # =========================================================
    eqx.clear_caches()
    jax.clear_caches()
    
    temp_file_path = f"temp_{video.filename}"
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        logger.info(f"Vídeo recebido. Iniciando análise para altura: {height_mm}mm")
        
        # 1. A Engine roda puramente com JAX (sem interferência)
        resultado_json = engine.process_video(temp_file_path, height_mm=height_mm)
        
        # 2. Quando o JAX termina, o Numpy normal processa TODAS as métricas
        matriz_frames = resultado_json["pose3d"]
        
        # Preparamos o dicionário para armazenar o histórico do vídeo inteiro
        metricas = {
            "joelho_direito_graus": [],
            "joelho_esquerdo_graus": [],
            "quadril_direito_graus": [],
            "quadril_esquerdo_graus": [],
            "distancia_tornozelos_mm": []
        }
        
        for frame in matriz_frames:
            # ==========================================
            # MAPEAMENTO CORRETO (Padrão Human3.6M)
            # ==========================================
            # Lado Direito
            ombro_dir = frame[14]
            quadril_dir = frame[1]
            joelho_dir = frame[2]
            tornozelo_dir = frame[3]
            
            # Lado Esquerdo
            ombro_esq = frame[11]
            quadril_esq = frame[4]
            joelho_esq = frame[5]
            tornozelo_esq = frame[6]
            
            # ==========================================
            # CÁLCULOS BIOMECÂNICOS REAIS
            # ==========================================
            # --- 1. Calcula Joelhos ---
            metricas["joelho_direito_graus"].append(round(calcular_angulo_3d(quadril_dir, joelho_dir, tornozelo_dir), 2))
            metricas["joelho_esquerdo_graus"].append(round(calcular_angulo_3d(quadril_esq, joelho_esq, tornozelo_esq), 2))
            
            # --- 2. Calcula Quadris ---
            metricas["quadril_direito_graus"].append(round(calcular_angulo_3d(ombro_dir, quadril_dir, joelho_dir), 2))
            metricas["quadril_esquerdo_graus"].append(round(calcular_angulo_3d(ombro_esq, quadril_esq, joelho_esq), 2))
            
            # --- 3. Calcula Distância (Comprimento da Passada em MM) ---
            # Multiplicamos por 1000 pois a IA retorna valores em Metros
            distancia_pes_m = calcular_distancia_3d(tornozelo_dir, tornozelo_esq)
            distancia_pes_mm = distancia_pes_m * 1000
            metricas["distancia_tornozelos_mm"].append(round(distancia_pes_mm, 2))
            
        # 3. Adiciona o super pacote no JSON final
        resultado_json["metricas_clinicas"] = metricas
        
        return resultado_json
        
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)