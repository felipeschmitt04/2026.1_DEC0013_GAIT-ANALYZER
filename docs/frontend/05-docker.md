No desenvolvimento de software moderno, não enviamos mais arquivos "soltos" para o servidor correndo o risco de as versões instaladas lá serem incompatíveis com as do nosso computador. Para resolver isso, utilizamos o **Docker** para criar um "contêiner". 

O contêiner é uma caixa isolada que empacota o nosso código do Next.js junto com tudo o que ele precisa para rodar perfeitamente, garantindo que o sistema funcione de forma idêntica tanto na máquina local quanto na nuvem.

## O Arquivo Dockerfile

O `Dockerfile` é a "receita de bolo" que ensina o sistema a empacotar o nosso frontend. Em vez de criar um contêiner pesado, desenhamos um arquivo focado em performance, dividido em etapas (*multi-stage build*):

* **Fase de Dependências:** O Docker baixa tudo o que o projeto precisa.
* **Fase de Build:** O código é compilado.
* **Fase de Produção:** O Docker descarta as ferramentas pesadas de desenvolvimento e guarda apenas o site pronto na imagem final.

## A Estratégia de Build "Standalone" do Next.js

Para garantir que o nosso contêiner fosse o mais leve possível, ativamos a configuração de **Output Standalone** no `next.config.ts`.

* **Como Funciona:** Tradicionalmente, projetos Node.js carregam a pasta `node_modules` inteira para produção (o que pode pesar gigabytes). O modo *standalone* faz com que o Next.js análise o código e extraia apenas os arquivos e pacotes estritamente necessários para o site rodar.
* **O Benefício:** O nosso `Dockerfile` copia apenas essa versão enxuta. O resultado é uma imagem final extremamente leve, o que torna o deploy (envio para a Azure) muito mais rápido e consome muito menos memória do servidor.

## Comandos de Build e Envio para a Nuvem (ACR)

Para empacotar a aplicação e enviá-la para o registro da Azure (Azure Container Registry), utilizamos uma sequência de três comandos no terminal. A estratégia de versionamento manual permite total controle sobre qual versão vai para o ar (basta alterar o final do passo 2 e 3 para a próxima versão a cada novo envio).

**1. Construir a imagem localmente:**
```bash
docker build -t edukwinter/gait-analyzer:latest .
```

**2. Renomear (Tag) a imagem para o repositório da Azure:**


```
docker tag [seu usuário]/gait-analyzer:latest gaitanalyzer.azurecr.io/gait-analyzer:[o nome que quiser dar]
```

**3. Enviar (Push) a imagem para a nuvem:**


```
docker push gaitanalyzer.azurecr.io/gait-analyzer:[igual o nome do passo 2]
```
## Sincronização e Atualização no Painel da Azure

Diferente de sistemas com deploy automático, a nossa estratégia de versionamento manual exige que avisemos a Azure de que uma nova versão do contêiner está disponível. Sempre que você fizer o `docker push` de uma nova versão, siga o passo a passo abaixo para atualizar o site no ar:

1. **Acessar o Recurso:** No portal da Azure, entre na página do seu **App Service** do frontend.
    
2. **Centro de Implantação:** No menu lateral esquerdo, navegue até a opção **Centro de Implantação** (Deployment Center).
    
3. **Atualizar a Tag:** Na aba de configurações do contêiner, localize o campo **Marca de Imagem** (Image Tag).
    
4. **Sincronizar a Versão:** Altere esse campo colocando exatamente o mesmo nome/versão que você utilizou no final dos comandos dos passos 2 e 3.
    
5. **Salvar e Aplicar:** Clique no botão **Salvar** no topo do painel.
    
6. **Reiniciar o Servidor:** Volte para a página de _Visão Geral_ (Overview) do App Service e clique no botão **Reiniciar** (Restart). Em alguns instantes, a Azure puxará o novo contêiner do repositório e atualizará o site sem deixá-lo fora do ar.
## Manutenção e Limpeza de Ambiente (Cache)

Durante o desenvolvimento, testar e gerar novas imagens do Docker repetidas vezes acaba acumulando "lixo digital" (imagens antigas e camadas de cache abandonadas), o que pode lotar o HD do computador rapidamente.

- Para manter o ambiente de desenvolvimento leve e otimizado, adotamos práticas de limpeza via terminal.
    
- Utilizamos comandos de manutenção do sistema (como `docker system prune -a --volumes` ou a limpeza do construtor `docker builder prune`) para varrer resquícios de builds antigos, imagens não utilizadas e o cache de compilação, mantendo a máquina limpa.