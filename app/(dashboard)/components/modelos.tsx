"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// 🌟 INTERFACE ADAPTADA PARA RECEBER O FRAME ATUAL DA BARRA DE REPRODUÇÃO
interface ModeloCanvasProps {
  segmentoId: string | null;
  dadosBiomecanicos: any; 
  frameAtual: number; 
}

const CONEXOES_PADRAO = [
  [0, 1], [1, 2], [2, 3],     // Pelve -> Quadril Direito -> Joelho Direito -> Tornozelo Direito
  [0, 4], [4, 5], [5, 6],     // Pelve -> Quadril Esquerdo -> Joelho Esquerdo -> Tornozelo Esquerdo
  [0, 7], [7, 8], [8, 9], [9, 10], // Pelve -> Espinha -> Pescoço -> Cabeça -> Topo da Cabeça
  [8, 11], [11, 12], [12, 13], // Pescoço -> Ombro Esquerdo -> Cotovelo Esquerdo -> Punho Esquerdo
  [8, 14], [14, 15], [15, 16]  // Pescoço -> Ombro Direito -> Cotovelo Direito -> Punho Direito
];

export default function ModeloCanvas({ segmentoId, dadosBiomecanicos, frameAtual }: ModeloCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Usamos referências mutáveis para que o loop de renderização do Three.js consiga
  // ler o frame mais recente vindo do React sem precisar recriar a cena do zero
  const frameRef = useRef<number>(frameAtual);
  useEffect(() => {
    frameRef.current = frameAtual;
  }, [frameAtual]);

  useEffect(() => {
    if (!containerRef.current || !dadosBiomecanicos || !dadosBiomecanicos.pose3d) return;

    const container = containerRef.current;
    const largura = container.clientWidth;
    const altura = container.clientHeight;

    const cena = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, largura / altura, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(largura, altura);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controles = new OrbitControls(camera, renderer.domElement);
    controles.enableDamping = true;
    controles.dampingFactor = 0.05;

    // 🎥 POSICIONAMENTO DO ZOOM INTELIGENTE baseado no Segmento Ativo
    if (segmentoId === "perna-direita") {
      camera.position.set(1.2, -0.4, 1.6); 
      controles.target.set(0.2, -0.5, 0);  
    } else if (segmentoId === "perna-esquerda") {
      camera.position.set(-1.2, -0.4, 1.6); 
      controles.target.set(-0.2, -0.5, 0);  
    } else if (segmentoId === "tronco-coluna") {
      camera.position.set(0, 0.5, 1.8);    
      controles.target.set(0, 0.3, 0);     
    } else {
      camera.position.set(0, 0, 3.5);      
      controles.target.set(0, 0, 0);       
    }
    controles.update();

    const grupoEsqueleto = new THREE.Group();
    cena.add(grupoEsqueleto);

    const pontosPose3D = dadosBiomecanicos.pose3d;
    const conexoes = dadosBiomecanicos.skeleton?.connections || CONEXOES_PADRAO;

    // Definição de paleta e volumetria de materiais
    const materialJuntaNormal = new THREE.MeshStandardMaterial({ color: 0x10b981 }); 
    const materialJuntaFocada = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.3 }); 
    const materialOsso = new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 2 });

    const esferasJuntas: THREE.Mesh[] = [];
    const linhasOssos: THREE.Line[] = [];

    const geometriaEsfera = new THREE.SphereGeometry(0.04, 16, 16); 
    const frameInicial = pontosPose3D[0];

    const juntasPernaDireita = [1, 2, 3];
    const juntasPernaEsquerda = [4, 5, 6];
    const juntasTronco = [0, 7, 8, 9, 10, 11, 14];

    // Alocação inicial das esferas (juntas)
    for (let i = 0; i < frameInicial.length; i++) {
      let deveFocar = false;
      if (segmentoId === "perna-direita" && juntasPernaDireita.includes(i)) deveFocar = true;
      if (segmentoId === "perna-esquerda" && juntasPernaEsquerda.includes(i)) deveFocar = true;
      if (segmentoId === "tronco-coluna" && juntasTronco.includes(i)) deveFocar = true;

      const esfera = new THREE.Mesh(geometriaEsfera, deveFocar ? materialJuntaFocada : materialJuntaNormal);
      esfera.position.set(frameInicial[i][0], frameInicial[i][1], frameInicial[i][2]);
      grupoEsqueleto.add(esfera);
      esferasJuntas.push(esfera);
    }

    // Alocação inicial das conexões lineares (ossos)
    conexoes.forEach(([indexA, indexB]: [number, number]) => {
      const geometriaLinha = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(frameInicial[indexA][0], frameInicial[indexA][1], frameInicial[frameInicial[indexA][2]]),
        new THREE.Vector3(frameInicial[indexB][0], frameInicial[indexB][1], frameInicial[indexB][2])
      ]);
      const linha = new THREE.Line(geometriaLinha, materialOsso);
      grupoEsqueleto.add(linha);
      linhasOssos.push(linha);
    });

    // Luzes artificiais estáveis
    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.9);
    cena.add(luzAmbiente);

    const luzDirecional = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDirecional.position.set(3, 4, 5);
    cena.add(luzDirecional);

    // 🌟 LOOP GRÁFICO REESTRUTURADO (Sincronizado com o React externo)
    let idAnimacao: number;

    const animarEsqueleto = () => {
      idAnimacao = requestAnimationFrame(animarEsqueleto);

      // Pega o frame atual do estado unificado que a timeline está ditando lá fora
      const fAtual = frameRef.current;
      const dadosDoFrame = pontosPose3D[fAtual];

      if (dadosDoFrame) {
        // 1. Atualiza as esferas na nova coordenada tridimensional do frame ativo
        for (let i = 0; i < esferasJuntas.length; i++) {
          if (dadosDoFrame[i]) {
            esferasJuntas[i].position.set(dadosDoFrame[i][0], dadosDoFrame[i][1], dadosDoFrame[i][2]);
          }
        }

        // 2. Reposiciona as extremidades dos ossos com precisão matemática frame a frame
        conexoes.forEach(([indexA, indexB]: [number, number], idx: number) => {
          const ptA = dadosDoFrame[indexA];
          const ptB = dadosDoFrame[indexB];
          if (ptA && ptB && linhasOssos[idx]) {
            const posicoes = new Float32Array([
              ptA[0], ptA[1], ptA[2],
              ptB[0], ptB[1], ptB[2]
            ]);
            linhasOssos[idx].geometry.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
            linhasOssos[idx].geometry.computeBoundingBox();
            linhasOssos[idx].geometry.computeBoundingSphere();
            linhasOssos[idx].geometry.attributes.position.needsUpdate = true;
          }
        });
      }

      controles.update();
      renderer.render(cena, camera);
    };

    idAnimacao = requestAnimationFrame(animarEsqueleto);

    const tratarRedimensionamento = () => {
      const novaLargura = container.clientWidth;
      const novaAltura = container.clientHeight;
      camera.aspect = novaLargura / novaAltura;
      camera.updateProjectionMatrix();
      renderer.setSize(novaLargura, novaAltura);
    };

    window.addEventListener("resize", tratarRedimensionamento);

    return () => {
      window.removeEventListener("resize", tratarRedimensionamento);
      cancelAnimationFrame(idAnimacao);
      controles.dispose();
      geometriaEsfera.dispose();
      materialJuntaNormal.dispose();
      materialJuntaFocada.dispose();
      materialOsso.dispose();
      linhasOssos.forEach(l => l.geometry.dispose());

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [segmentoId, dadosBiomecanicos]); // Removemos o frameAtual das dependências para não destruir/recriar a cena do Three.js a cada quadro

  return <div ref={containerRef} className="w-full h-full" />;
}