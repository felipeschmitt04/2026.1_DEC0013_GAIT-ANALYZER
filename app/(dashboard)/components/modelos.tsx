"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ModeloCanvasProps {
  segmentoId: string | null;
}

export default function ModeloCanvas({ segmentoId }: ModeloCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const largura = container.clientWidth;
    const altura = container.clientHeight;

    // 1. CENA
    const cena = new THREE.Scene();

    // 2. CÂMERA
    const camera = new THREE.PerspectiveCamera(75, largura / altura, 0.1, 1000);
    camera.position.z = 5;

    // 3. RENDERIZADOR
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(largura, altura);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. CONTROLES (Girar, Zoom com Scroll e Arrastar)
    const controles = new OrbitControls(camera, renderer.domElement);
    controles.enableDamping = true;
    controles.dampingFactor = 0.05;

    // 5. SELEÇÃO DINÂMICA DA GEOMETRIA (Cubo, Esfera ou Pirâmide)
    let geometria: THREE.BufferGeometry;

    if (segmentoId === "perna-direita") {
      // 🧊 Perna Direita = Cubo
      geometria = new THREE.BoxGeometry(2, 2, 2);
    } else if (segmentoId === "perna-esquerda") {
      // 🔮 Perna Esquerda = Esfera
      geometria = new THREE.SphereGeometry(1.3, 32, 32);
    } else {
      // 🔺 Tronco / Padrão = Pirâmide (Cone com 4 lados)
      geometria = new THREE.ConeGeometry(1.5, 2.5, 4);
    }

    // Material estilo "Teia de Linhas" (Wireframe) para parecer scan de IA
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x10b981, // Esmeralda do seu tema
      wireframe: true 
    });
    
    const objeto3D = new THREE.Mesh(geometria, material);
    cena.add(objeto3D);

    // 6. LUZES
    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.8);
    cena.add(luzAmbiente);

    const luzDirecional = new THREE.DirectionalLight(0xffffff, 1);
    luzDirecional.position.set(5, 5, 5);
    cena.add(luzDirecional);

    // 7. LOOP DE ANIMAÇÃO
    const clock = new THREE.Clock();
    let idAnimacao: number;

    const animar = () => {
      idAnimacao = requestAnimationFrame(animar);

      // Rotação suave automática
      const tempo = clock.getElapsedTime();
      objeto3D.rotation.x = tempo * 0.15;
      objeto3D.rotation.y = tempo * 0.25;

      controles.update();
      renderer.render(cena, camera);
    };

    animar();

    // 8. REDIMENSIONAMENTO
    const tratarRedimensionamento = () => {
      const novaLargura = container.clientWidth;
      const novaAltura = container.clientHeight;
      camera.aspect = novaLargura / novaAltura;
      camera.updateProjectionMatrix();
      renderer.setSize(novaLargura, novaAltura);
    };

    window.addEventListener("resize", tratarRedimensionamento);

    // LIMPEZA DE MEMÓRIA
    return () => {
      window.removeEventListener("resize", tratarRedimensionamento);
      cancelAnimationFrame(idAnimacao);
      controles.dispose();
      geometria.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [segmentoId]); // 🌟 RE-RENDERIZA SE O SEGMENTO MUDAR!

  return <div ref={containerRef} className="w-full h-full" />;
}