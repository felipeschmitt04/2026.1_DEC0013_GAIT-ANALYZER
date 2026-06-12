import numpy as np
import logging
from monocular_demos.biomechanics_mjx.visualize import render_trajectory

logging.basicConfig(level=logging.INFO, format="%(asctime)s | [%(levelname)s] %(message)s")
logger = logging.getLogger("RenderLocal")

def gerar_video_local():
    arquivo_npz = 'movimento_exportado.npz'
    arquivo_saida = '3d_rebuild.mp4'
    
    try:
        dados = np.load(arquivo_npz)
        angulos_3d = dados['angulos']
    
        render_trajectory(angulos_3d, arquivo_saida, xml_path=None)
        
        logger.info(f"Exportado")
        
    except FileNotFoundError:
        logger.error(f"Erro: O arquivo {arquivo_npz} não foi encontrado na pasta.")
    except Exception as e:
        logger.error(f"Ocorreu um erro durante a renderização: {e}")

if __name__ == "__main__":
    gerar_video_local()