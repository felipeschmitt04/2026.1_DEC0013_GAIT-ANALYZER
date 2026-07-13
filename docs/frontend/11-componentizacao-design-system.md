Em aplicações web de alto nível, a interface visual não é construída do zero a cada nova página. Para garantir que a ferramenta clínica tenha um visual profissional, padronizado e acessível, adotamos a estratégia de **Componentização** aliada a um forte **Design System**.

Em vez de escrevermos estilos de design soltos e desorganizados, criamos "peças de Lego" visuais que são reaproveitadas em todo o projeto.

## A Base Visual: Shadcn UI e Radix

* **A Abordagem Moderna:** Diferente de bibliotecas antigas e rígidas, utilizamos a arquitetura do **Shadcn UI** construída sobre os primitivos do **Radix**.
* **Controle Total:** O Shadcn não é um pacote fechado. Ele entrega o código-fonte exato de cada botão, modal ou formulário direto na nossa pasta `components/ui`. Isso nos dá controle absoluto para estilizar a aplicação com o TailwindCSS sem ficarmos limitados por regras de terceiros.
* **Acessibilidade Nativa:** Os componentes base já possuem suporte embutido para navegação por teclado e leitores de tela, garantindo que o sistema clínico seja inclusivo e siga as diretrizes mundiais de acessibilidade na web.

## Padronização e Estados de Carregamento

* **Reutilização Inteligente:** Campos de texto (inputs), botões e os cards de perfil dos pacientes são desenvolvidos apenas uma vez. Se o layout exigir uma mudança no arredondamento das bordas, nós alteramos um único arquivo raiz e o sistema inteiro se atualiza de forma mágica.
* **Feedback Contínuo:** A componentização facilitou a criação de estados de carregamento (*loading*). Por exemplo, durante o envio do vídeo, os inputs são visualmente desativados e o botão muda suavemente para "Processando...", oferecendo um feedback claro e impedindo duplos cliques acidentais.

## Iconografia com Lucide React

* **Sinalização Visual:** Para tornar a interface mais limpa e intuitiva, adotamos o pacote de ícones **Lucide React**.
* **Performance:** Os ícones não são imagens pesadas; eles são desenhados por código (SVG) em tempo real. Isso permite escalar os ícones e trocar a cor deles ao passar o mouse por cima (efeito *hover*) sem comprometer a velocidade de carregamento da tela.