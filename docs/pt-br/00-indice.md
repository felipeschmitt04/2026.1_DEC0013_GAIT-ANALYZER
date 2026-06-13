# Documentação do Projeto

Este diretório contém a documentação técnica do sistema de análise de marcha humana com processamento híbrido GPU/CPU.

O objetivo desta documentação é registrar todo o processo de desenvolvimento, configuração, execução e implantação do sistema, incluindo a criação da máquina virtual na Azure, conexão via SSH, integração com GitHub, configuração do ambiente, execução do backend, containerização com Docker, deploy e troubleshooting.

## Índice

1. [Visão Geral](01-visao-geral.md)
   Apresenta o contexto do projeto, seus objetivos, requisitos principais e divisão geral entre frontend, backend, nuvem e processamento local.

2. [Arquitetura](02-arquitetura.md)
   Descreve a arquitetura do sistema, o fluxo de dados, a comunicação entre frontend e backend, o uso da GPU em nuvem e a organização dos módulos internos.

3. [Criação da VM na Azure](03-criacao-vm-azure.md)
   Documenta o processo de criação da máquina virtual utilizada para executar o backend em nuvem.

4. [Conexão via SSH](04-conexao-ssh.md)
   Explica como acessar a VM remotamente por SSH em ambiente headless.

5. [GitHub, SSH e Deploy Key](05-github-ssh-deploy-key.md)
   Descreve como configurar o acesso ao repositório GitHub a partir da VM ou da DGX sem interface gráfica.

6. [Configuração do Ambiente](06-configuracao-ambiente.md)
   Registra a instalação das dependências do sistema, ambiente Python, bibliotecas de IA e variáveis de ambiente.

7. [Execução sem Docker](07-execucao-sem-docker.md)
   Explica como executar o backend diretamente na VM antes da containerização.

8. [Docker](08-docker.md)
   Documenta a criação do Dockerfile, docker-compose, configuração com GPU e execução containerizada.

9. [Deploy](09-deploy.md)
   Descreve o processo de atualização do código no servidor, inicialização da API e exposição do serviço para o frontend.

10. [API](10-api.md)
    Documenta os endpoints disponíveis, parâmetros de entrada, formato de resposta e exemplos de requisição.

11. [DGX UFSC](11-dgx-ufsc.md)
    Registra os testes realizados na DGX H100 compartilhada da UFSC, incluindo acesso, limitações e diferenças em relação à Azure VM.

12. [Segurança](12-seguranca.md)
    Apresenta cuidados com chaves SSH, arquivos `.env`, credenciais, dados de pacientes, portas expostas e boas práticas de repositório.

13. [Troubleshooting](13-troubleshooting.md)
    Lista erros comuns encontrados durante o desenvolvimento e suas respectivas soluções.

## Idiomas

A documentação está organizada em duas versões:

* `docs/pt-br/`: documentação em português.
* `docs/en/`: documentação em inglês.

Sempre que possível, os arquivos em português e inglês devem manter a mesma estrutura para facilitar manutenção e comparação.
