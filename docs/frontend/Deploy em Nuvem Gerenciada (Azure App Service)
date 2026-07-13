Depois de programar o site, organizar o banco de dados e empacotar tudo no Docker, o passo final é colocar a aplicação no ar para que qualquer fisioterapeuta possa acessá-la de qualquer lugar do mundo através da internet. Para isso, adotamos uma estratégia de nuvem moderna utilizando o **Azure App Service**.

## A Estratégia de PaaS (Plataforma como Serviço)

Para o frontend, escolhemos trabalhar com o modelo de **PaaS (Platform as a Service)**. 
* **A Diferença Estratégica:** Enquanto o backend de IA precisou de uma Máquina Virtual tradicional (IaaS) — onde é necessário configurar o sistema operacional Linux, atualizar pacotes na mão e gerenciar firewalls —, no Frontend nós deixamos essa dor de cabeça para a Azure.
* **Foco no Produto:** No App Service, nós apenas entregamos o nosso contêiner Docker pronto. A Azure cuida de toda a infraestrutura por baixo dos panos, garantindo estabilidade, atualizações de segurança do servidor e escalabilidade automática (se muitos médicos acessarem ao mesmo tempo, o servidor aguenta o tranco sozinho).

## Hospedagem do Contêiner Docker

O processo de colocar o site no ar funciona de forma automatizada através do contêiner que criamos:
1. A imagem Docker do frontend é enviada para a nuvem da Azure.
2. O Azure App Service puxa essa imagem e a coloca para rodar dentro da infraestrutura gerenciada deles.
3. Se precisarmos atualizar o site com uma nova função, basta gerar uma nova versão da imagem Docker e o servidor atualiza o site no ar sem derrubá-lo para os usuários (*Zero Downtime*).

## Configuração de Portas Internas

Um ponto técnico vital para o site funcionar foi alinhar a comunicação de rede do contêiner com a Azure:
* Por padrão, a nossa aplicação Next.js roda em uma porta interna específica dentro do contêiner (geralmente a porta 3000).
* O Azure App Service é inteligente: configuramos o servidor para mapear o tráfego que vem da internet e direcioná-lo exatamente para essa porta interna do contêiner. Isso faz com que as requisições web entrem e saiam da nossa aplicação sem nenhum bloqueio de rede.

## Link Público Seguro e HTTPS Automático

Como estamos lidando com um sistema de saúde que gerencia prontuários e nomes de pacientes, a segurança de rede é uma exigência obrigatória.
* O Azure App Service gera automaticamente um link público para o nosso projeto já configurado com o certificado digital **HTTPS** (o cadeado de segurança do navegador).
* **Criptografia de Ponta a Ponta:** Isso garante que todos os dados que trafegam entre o computador do médico e o nosso site sejam totalmente criptografados, impedindo que interceptem as senhas ou os dados clínicos dos pacientes na rede.

## Passo a Passo para Criação do Servidor na Azure (App Service)

Para publicar o contêiner Docker do frontend do zero na Azure, siga este roteiro no painel web da Azure:

1. **Criar o Recurso:** No menu da Azure, clique em *Criar um recurso* e selecione **App Service** (Serviço de Aplicativo).
2. **Configurações Básicas:**
   * **Assinatura:** Selecione a sua assinatura acadêmica.
   * **Grupo de Recursos:** Escolha o mesmo grupo onde está a VM do backend.
   * **Nome:** Defina o subdomínio público do seu site (ex: `gait-analyzer-front`).
   * **Publicar:** Selecione a opção **Contêiner do Docker**.
   * **Sistema Operacional:** Linux.
3. **Configuração do Contêiner:**
   * **Origem da Imagem:** Selecione se a sua imagem Docker está no Docker Hub ou no Azure Container Registry.
   * **Marcas (Tag):** Selecione a versão da imagem (ex: `latest`).
4. **Plano de Hospedagem:** Escolha um plano Linux (o plano *Free* ou *B1* atende perfeitamente aos requisitos acadêmicos de memória do Next.js standalone).
5. **Injeção de Segurança (Variáveis de Ambiente):**
   * Após a criação do recurso, vá ao menu lateral em **Configurações -> Variáveis de Ambiente**.
   * Clique em *Nova configuração de aplicativo*.
   * Adicione a chave `DATABASE_URL` e cole o valor correspondente ao Supabase de produção.
6. **Revisar e Criar:** Clique em criar. A Azure gerará automaticamente a URL pública
