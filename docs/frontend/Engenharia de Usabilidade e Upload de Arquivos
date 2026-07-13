Um dos maiores desafios no desenvolvimento de interfaces clínicas é garantir que a ferramenta seja intuitiva, rápida e à prova de erros. A nossa tela de **Nova Análise** foi projetada pensando estritamente na experiência do usuário (UX), removendo atritos técnicos para o profissional de saúde.

## Upload Inteligente

O centro da tela de envio é uma área interativa de upload construída para ser fluida.
* **Arrastar e Soltar:** Em vez de obrigar o usuário a clicar e procurar arquivos navegando por pastas complexas, ele pode simplesmente arrastar o vídeo do paciente para dentro da tela.
* **Feedback Visual:** A interface reage dinamicamente. Quando o usuário arrasta o arquivo por cima da área, as bordas mudam de cor para confirmar que o sistema reconheceu o movimento. Após soltar, um ícone de sucesso e o nome do vídeo aparecem imediatamente na tela.

## Validações e Travas de Segurança

Para evitar que o sistema envie arquivos incorretos para processamento (o que geraria erros e desperdício no supercomputador), o frontend atua como a primeira barreira de defesa:
* **Filtro de Formato:** A área de upload possui uma trava de segurança em tempo de execução que aceita estritamente arquivos de vídeo no formato `.mp4`.
* **Alerta Imediato:** Se o usuário tentar enviar uma imagem, documento ou formato de vídeo não suportado, o navegador barra a ação na mesma hora, exibe um alerta claro e limpa a seleção automaticamente.

## Tradução do Contrato de Negócio (A regra dos centímetros)

O backend de inteligência artificial exige que a altura do paciente seja enviada estritamente em **milímetros (mm)**, que é o padrão matemático dos cálculos biomecânicos da IA. Porém, no dia a dia clínico, ninguém mede a altura de um paciente em milímetros.
* **A Solução de UX:** Na tela, criamos um campo amigável que pede a altura do paciente na medida habitual do brasileiro: **centímetros (cm)**.
* **A Conversão Oculta:** Quando o médico clica em analisar, o nosso código (Next.js) pega esse valor, faz a conversão matemática de forma invisível para milímetros e constrói o pacote (`FormData`) exatamente no formato rigoroso que o backend exige. Isso une o conforto do usuário com a engenharia de dados pesada!

## Orientação do Vídeo e Prevenção de Duplicidade

* **Seletor Visual:** Adicionamos um botão rápido de orientação (Em Pé / Deitado) usando ícones claros. O frontend transforma essa escolha visual em uma variável (`rotated: true/false`) necessária para calibrar os eixos da IA.
* **Bloqueio de Estado (Loading):** Assim que o botão "Analisar Marcha" é clicado, toda a tela é bloqueada e o botão muda para "Processando...". Isso impede que o usuário clique duas vezes seguidas por ansiedade, evitando o envio de vídeos duplicados para o servidor.