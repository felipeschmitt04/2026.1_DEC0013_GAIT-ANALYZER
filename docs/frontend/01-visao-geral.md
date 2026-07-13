# Visão geral

O Frontend do Gait Analyzer é a parte visual e o gerenciador de dados do projeto de análise de marcha. Enquanto o backend foca na matemática pesada e na inteligência artificial, o frontend cuida de tudo o que o usuário vê, interage e de como as informações ficam salvas para o futuro.

A nossa interface web foi feita para ser leve, fácil de usar e totalmente separada das complexidades do supercomputador (a máquina DGX da UFSC).

## O que o Frontend faz?

- **Interface amigável:** Oferecé uma tela simples para o profissional de saúde cadastrar pacientes e fazer o upload dos vídeos de caminhada.
    
- **Banco de Dados Próprio:** Como o backend não guarda o histórico clínico, o frontend usa o banco de dados Supabase para salvar e organizar o registro de todas as análises feitas.
    
- **Memória de Tela:** Garante que o usuário possa navegar pelas páginas do site sem que o sistema "esqueça" qual paciente ou relatório estava selecionado.
    
- **Comunicação Inteligente:** Envia o vídeo para ser processado e fica checando automaticamente com o servidor se o resultado já está pronto (acompanhando o número do `job_id`).
    
- **Geração de Relatórios:** Pega os arquivos de texto e números gerados pela IA e os transforma em gráficos, métricas clínicas e visualizações em 3D fáceis de entender.
    

## O que o Frontend NÃO faz?

- Não roda inteligência artificial nem cálculos biomecânicos pesados.
    
- Não precisa saber como o servidor físico do backend está configurado.
    
- Não guarda os arquivos de vídeo para sempre (essa parte fica delegada ao storage do backend).
    

## Como funciona o fluxo de uma análise?

1. **O Upload:** O usuário escolhe o vídeo na tela e clica em enviar.
    
2. **O Repasse:** O frontend manda esse vídeo com segurança para o servidor externo de inteligência artificial trabalhar.
    
3. **O Registro:** Assim que o servidor externo recebe o vídeo e devolve um código de rastreio (o `job_id`), o frontend já cria uma ficha para essa análise no banco de dados Supabase.
    
4. **A Espera e a Exibição:** O site fica acompanhando o progresso. Quando a IA termina o trabalho, o site puxa os dados finais e monta o relatório visual na tela.
    

## Onde o sistema roda?

- **No Computador (Desenvolvimento):** Onde escrevemos e testamos o código. Usamos uma versão "simulada" (Mock) do backend para conseguir programar rápido sem depender da internet ou do supercomputador da universidade.
    
- **No Docker (O Pacote):** Todo o código do site é colocado dentro de uma "caixa" (o contêiner Docker). Isso garante que o site vai funcionar exatamente igual em qualquer computador do mundo, sem dar erros surpresa.
    
- **Na Azure (O Site no Ar):** É o servidor na nuvem onde o site oficial fica hospedado. A Azure cuida de entregar o site com cadeado de segurança (HTTPS) e esconde as nossas senhas do banco de dados, protegendo o sistema de invasões.
