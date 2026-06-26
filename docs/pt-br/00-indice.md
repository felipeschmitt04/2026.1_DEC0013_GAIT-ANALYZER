# Documentação do Projeto

Este diretório reúne a documentação técnica do backend de análise de marcha.
O objetivo é deixar claro como o sistema está organizado, como executar cada
parte e qual contrato deve ser consumido pelo frontend.

O estado atual do projeto é:

- backend FastAPI em `backend/`;
- Docker CPU leve para API em modo mock, usado na Azure e em integração;
- engine pesada em `engine_dgx/`, executada na DGX por ambiente conda;
- frontend web externo consumindo somente a API HTTP;
- demo local em `frontend-demo/` para inspecionar o JSON e a visualização 3D.

## Índice

1. [Visão Geral](01-visao-geral.md)
   Contexto do projeto, objetivo acadêmico, ambientes conhecidos e estado atual.

2. [Arquitetura](02-arquitetura.md)
   Fluxos de dados, separação entre frontend, backend, mock e worker DGX.

3. [Criação da VM na Azure](03-criacao-vm-azure.md)
   Reservado para o guia de criação da VM. Este arquivo não foi alterado nesta
   organização porque o material principal está em outra máquina.

4. [Conexão via SSH](04-conexao-ssh.md)
   Acesso remoto à VM ou DGX por terminal.

5. [GitHub, SSH e Deploy Key](05-github-ssh-deploy-key.md)
   Como preparar acesso ao repositório em ambientes sem interface gráfica.

6. [Configuração do Ambiente](06-configuracao-ambiente.md)
   Variáveis de ambiente, dependências, perfis de execução e estrutura de storage.

7. [Execução sem Docker](07-execucao-sem-docker.md)
   Como executar backend, worker DGX e demo local diretamente.

8. [Docker CPU](08-docker.md)
   Como construir e rodar a imagem CPU/mock. Docker GPU não é o caminho atual.

9. [Deploy](09-deploy.md)
   Fluxo prático para atualizar o backend na Azure e apontar para a DGX quando
   necessário.

10. [Contrato da API](10-api.md)
    Endpoints, parâmetros, `ResultV1`, `pose3d`, `fitting`, `model3d` e exemplos.

11. [DGX UFSC](11-dgx-ufsc.md)
    Como a engine pesada roda na DGX usando conda e a pasta `engine_dgx/`.

12. [Segurança](12-seguranca.md)
    Cuidados com `.env`, chaves, dados de vídeo, CORS, portas e URLs temporárias.

13. [Troubleshooting](13-troubleshooting.md)
    Problemas comuns e caminhos de diagnóstico.

14. [Evidências do Sprint 2](14-evidencias-sprint2.md)
    Registro dos testes de Docker CPU, mock, API e contrato JSON.

15. [Testes](15-testes.md)
    Explicação dos tipos de teste e como rodar validações no projeto.

## Observações de manutenção

- A documentação em português é a fonte principal para este projeto acadêmico.
- A documentação em inglês pode ficar atrasada em relação ao português.
- O frontend deve depender do contrato em `10-api.md`, não de caminhos internos
  do servidor.
- O Docker suportado no momento é o CPU/mock em `backend/Dockerfile.cpu`.
- A DGX não usa Docker neste projeto; ela roda a engine por conda em
  `engine_dgx/`.
