# Estado global

Em aplicações web tradicionais, quando o usuário muda de página, o navegador limpa a memória antiga para carregar o novo conteúdo. No nosso projeto, isso gerava um problema de usabilidade: se o fisioterapeuta selecionasse um paciente e clicasse na aba de "Relatórios", "Gráficos" ou "Visualização 3D", o sistema "esquecia" o que estava acontecendo.

Para resolver isso e criar o "cérebro" de navegação do site, implementamos um gerenciamento de estado global utilizando a **React Context API** através do arquivo `PacienteContext.tsx`.

## O que é o PacienteContext?

O `PacienteContext` funciona como uma "nuvem de dados" local que fica flutuando por cima de todas as páginas do sistema. Em vez de guardarmos as informações dentro de uma única tela, nós as guardamos nessa nuvem centralizada. 

Dessa forma, qualquer página do painel (`(dashboard)`) consegue olhar para o contexto, ler quem é o paciente atual ou qual código está sendo processado e atualizar a tela em tempo real, sem perder os dados durante a navegação.

## Os Três Estados Controlados

A nossa nuvem gerencia três estados fundamentais para o funcionamento do sistema:

* **pacienteAtivo:** Guarda o `id` e o `nome` do paciente que está recebendo atendimento no momento.
* **análiseAtiva:** Guarda o identificador da análise da marcha que foi escolhida para ser inspecionada no histórico ou nos relatórios.
* **jobIdAtivo:** Guarda o código único de rastreio (`job_id`) devolvido pelo backend de inteligência artificial. Ele é essencial para o frontend saber qual vídeo o supercomputador está processando naquele exato momento.

Toda essa estrutura fica envelopada pelo `PacienteProvider` na raiz do sistema (no arquivo `layout.tsx`), distribuindo essas informações para todo o projeto.

## A Regra Inteligente de Proteção de Dados

Um ponto crítico do desenvolvimento foi garantir a segurança e a integridade dos prontuários médicos. Se o profissional terminar o atendimento de um paciente e mudar para outro, o sistema jamais pode continuar exibindo os gráficos, laudos ou o processo de processamento do paciente anterior.

Para blindar o sistema contra isso, criamos uma **regra automatizada** dentro da função `setPacienteAtivo`:

* Sempre que um novo paciente é selecionado, o sistema intercepta a ação e compara o ID do paciente novo com o do paciente antigo.
* Se o sistema detectar que o paciente mudou (IDs diferentes), ele roda um comando duplo automático que limpa a análise ativa e também o ID do processo (`setAnaliseAtiva(null)` e `setJobIdAtivo(null)`).
* **O resultado prático:** O sistema "reseta" a memória temporária de exames na hora, impedindo diagnósticos cruzados ou a exibição de dados do paciente errado na tela do médico.

## Como as Páginas Consomem Esse Cérebro

Para facilitar o uso dessa nuvem pelas telas, criamos um atalho customizado (um hook) chamado `usePaciente()`. Com apenas uma linha de código, qualquer componente consegue interagir com a memória global:

* **Na Tela de Nova Análise:** O frontend usa a função `setJobIdAtivo` para guardar o código de rastreio assim que o backend aceita o vídeo.
* **Nas Telas de Consulta (Gráficos/3D):** O código lê o `jobIdAtivo` ou a `análiseAtiva` para buscar os dados certos no banco de dados e montar os relatórios de forma totalmente dinâmica.
