Trabalhar com dados de saúde exige um nível rigoroso de privacidade. Por isso, a última camada da nossa arquitetura de frontend foi desenhada para atuar como um escudo, blindando tanto o acesso ao nosso banco de dados quanto a comunicação com o servidor de Inteligência Artificial.

## Proteção de Credenciais (A Blindagem do Supabase)

O maior erro de segurança no desenvolvimento de software é expor senhas diretamente no código (o chamado *hardcoding*). Para proteger o nosso banco de dados Supabase, adotamos a política de **Variáveis de Ambiente Estritas**.

* **O Perigo Evitado:** A `DATABASE_URL` (que contém a senha mestre do banco) jamais é "comitada" ou enviada para o GitHub. Se alguém invadir o nosso repositório de código, não encontrará nenhuma senha lá.
* **A Solução na Nuvem:** No Azure App Service, utilizamos o painel seguro de configuração para cadastrar essa chave. Quando o nosso contêiner Docker liga lá na nuvem, a Azure injeta essa senha diretamente na memória do servidor de forma invisível. 
* **Rotas Ocultas:** Como o Next.js possui rotas de API internas (`/api/analises`), o navegador do médico nunca se conecta ao banco de dados diretamente. É o nosso servidor Next.js que faz essa ponte usando a chave secreta, impedindo qualquer ataque pelo lado do cliente.

## O Mecanismo de CORS (Cross-Origin Resource Sharing)

Como a nossa interface está hospedada na Azure e o motor de Inteligência Artificial roda em outro servidor externo (a máquina DGX), os navegadores de internet bloqueiam a comunicação entre eles por padrão, temendo roubo de dados. Para resolver isso com segurança, configuramos as políticas de **CORS**.

* **O que é o CORS?** É um mecanismo de segurança dos navegadores que atua como um "leão de chácara". Ele verifica se o site que está pedindo os dados tem autorização do servidor para recebê-los.
* **A Integração Segura:** Trabalhamos em conjunto com o desenvolvimento do backend para que a API externa aceite requisições **apenas** da URL oficial do nosso frontend na Azure. 
* **O Benefício Final:** Isso significa que, se um site malicioso ou um hacker tentar criar uma página falsa para puxar os laudos médicos da nossa API, o navegador vai bloquear a ação na hora, pois a requisição não tem a "assinatura" da nossa origem oficial. A troca de arquivos de vídeo e de JSONs clínicos ocorre em um túnel fechado e autorizado.