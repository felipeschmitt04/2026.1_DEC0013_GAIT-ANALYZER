# Criação de VM na Azure com conta UFSC

Este guia descreve como ativar o benefício Microsoft/Azure pela conta UFSC e criar uma máquina virtual para uso no projeto. O foco é criar uma VM simples, acessível por SSH, usando os créditos do Azure for Students.

## 1. Ativação da parceria Microsoft pelo IDUFSC

Para ativar a conta da Azure para estudantes da UFSC, primeiro é necessário vincular sua conta pelo portal do IDUFSC.

1. Acesse `https://idufsc.ufsc.br`.
2. Entre com sua conta institucional.
3. Vá em **Parcerias > Microsoft**.
4. Habilite o **Microsoft Dev Tools**.
5. Clique em **Acessar portal da Microsoft**.


Para fazer login, use seu e-mail institucional no formato:

```text
nome.sobrenome@ufsc.br
```

O nome do e-mail depende do seu próprio IDUFSC. Durante o primeiro acesso, a Microsoft pode pedir validações adicionais da conta. Basta seguir os passos mostrados na tela.

## 2. Acesso ao portal da Azure

Após o login, você será direcionado para a tela inicial do benefício Microsoft/Azure.


Nessa tela é possível ver:

- os créditos disponíveis, normalmente US$ 100 para contas novas do Azure for Students;
- a data de expiração dos créditos, geralmente 365 dias após a ativação;
- atalhos para serviços Microsoft.

Para abrir o portal da Azure:

1. Clique nos pontinhos no canto superior esquerdo.
2. Selecione **Azure**.



## 3. Criação da máquina virtual

No portal da Azure, a tela pode variar um pouco dependendo da conta e da interface atual. Para criar a VM:

1. Clique em **Create a resource**.
2. Pesquise por **Virtual machine**.
3. Selecione a opção de máquina virtual da Microsoft.
4. Clique em **Create**.



## 4. Aba Basics

Na aba **Basics**, preencha os campos principais.

### Subscription

Use:

```text
Azure for Students
```

### Resource group

Crie um novo resource group. Um nome simples é suficiente, por exemplo:

```text
UFSC
```

O resource group agrupa todos os recursos criados para a VM, como disco, IP público, placa de rede e regras de firewall. Isso facilita apagar tudo depois, se necessário.

### Virtual machine name

Escolha um nome para a instância. Exemplo:

```text
gait-analyzer-vm
```

### Region

A escolha da região pode ser a parte mais problemática. Algumas regiões não ficam disponíveis para contas Azure for Students, e outras não oferecem todos os tamanhos de CPU.

Se uma configuração falhar, tente:

- trocar a região para **East US 2**;
- trocar para outra região dos Estados Unidos;
- desativar as opções de disponibilidade;
- escolher um tamanho de VM menor.

### Availability options

Para simplificar e evitar bloqueios de cota, use:

```text
No infrastructure redundancy required
```

ou a opção equivalente de não usar redundância/availability zone.

### Security type

Para uma VM simples de desenvolvimento, use a opção padrão. Se a Azure oferecer opções como Trusted Launch, mantenha o padrão recomendado, a menos que isso bloqueie a criação da VM.

### Image

Use uma imagem Linux. Recomenda-se:

```text
Ubuntu Server 24.04 LTS
```

Também é aceitável usar Ubuntu Server 22.04 LTS se a opção 24.04 não estiver disponível.

### Size

Para o backend do projeto em modo API/mock, uma VM CPU é suficiente. A VM usada no projeto é:

```text
Standard D4s v3
```

Características aproximadas:

```text
4 vCPUs
16 GiB RAM
sem GPU
```

Importante: essa VM não serve para processamento pesado com GPU. Ela é adequada para API, Docker CPU, testes com mock e integração com frontend.



## 5. Autenticação

Na parte de autenticação, escolha uma das opções.

### Opção mais simples: Password

Para facilitar o primeiro acesso, é possível escolher:

```text
Authentication type: Password
```

Depois preencha:

- usuário;
- senha;
- confirmação da senha.

Guarde esses dados, pois serão usados no SSH.

### Opção mais segura: SSH public key

Para uso mais seguro, especialmente se a VM ficar acessível pela internet, o ideal é usar chave SSH. Porém, para uma primeira configuração didática, senha é mais simples.

## 6. Portas de entrada

Em **Inbound port rules**, permita apenas SSH:

```text
SSH (22)
```

Não abra portas como HTTP/HTTPS ainda, a menos que o backend já vá ser exposto publicamente.


Depois clique em:

```text
Review + create
```

A Azure irá validar a configuração. Se tudo estiver correto, clique em **Create**.

## 7. Inicialização da VM

Após a criação, acesse a página da VM.


Se a VM não estiver ligada, clique em:

```text
Start
```

Aguarde até o status indicar que ela está em execução.

## 8. Instalação/verificação do SSH no computador local

Para acessar a VM, você precisa ter um cliente SSH instalado no seu computador.

### Windows

No Windows 10/11, o cliente OpenSSH geralmente já vem instalado. Para verificar, abra o PowerShell e rode:

```powershell
ssh -V
```

Se o comando não existir, verifique a disponibilidade do OpenSSH:

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
```

Instale apenas o cliente SSH:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

Observação: para conectar na Azure, você precisa do **OpenSSH Client**. O **OpenSSH Server** só é necessário se você quiser receber conexões SSH no seu próprio computador, o que não é o caso aqui.

### Linux/WSL/Ubuntu

No Ubuntu ou WSL, normalmente basta ter o cliente SSH:

```bash
sudo apt update
sudo apt install openssh-client
```

Verifique com:

```bash
ssh -V
```

### macOS

No macOS, o cliente SSH já vem pré-instalado. Verifique com:

```bash
ssh -V
```

## 9. Conexão via SSH

Na página da VM, clique em:

```text
Connect
```

A Azure irá mostrar um comando SSH parecido com:

```bash
ssh usuario@IP_PUBLICO_DA_VM
```

Copie esse comando e execute no terminal.

Na primeira conexão, o SSH pode perguntar se você confia no host:

```text
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Digite:

```text
yes
```

Depois será solicitada a senha criada durante a configuração da VM.

## 10. Primeiros comandos dentro da VM

Depois de conectar, atualize os pacotes:

```bash
sudo apt update
sudo apt upgrade -y
```

Instale ferramentas básicas:

```bash
sudo apt install -y git curl unzip ca-certificates
```

Para conferir o sistema:

```bash
lsb_release -a
uname -a
```

## 11. Cuidados com créditos e custos

A VM consome créditos enquanto está ligada. Para economizar:

- pare a VM quando não estiver usando;
- evite discos muito grandes sem necessidade;
- não deixe IPs, discos ou recursos esquecidos;
- acompanhe o saldo no painel do Azure for Students;
- use o resource group para apagar tudo quando o ambiente não for mais necessário.

Para parar a VM, use o botão:

```text
Stop
```

Na Azure, quando possível, prefira a opção que desaloca a VM, geralmente indicada como **Stop** ou **Stop (deallocate)**. Apenas desligar o Linux por dentro da VM pode não interromper todos os custos associados.

## 12. Observações para o projeto

Para este projeto, a VM CPU deve ser usada principalmente para:

- hospedar a API FastAPI;
- rodar Docker CPU;
- testar o modo mock;
- integrar com o frontend;
- validar contrato HTTP.

Ela não deve ser considerada uma VM de GPU. O processamento pesado com MeTRAbs, JAX, TensorFlow, MuJoCo/MJX e fitting completo pode exigir outro ambiente, como uma VM GPU configurada separadamente (não incluída no pacote Azure for Students).

Depois que a VM estiver criada e acessível por SSH, os próximos passos são:

1. instalar Docker;
2. clonar o repositório do backend;
3. subir a API em modo mock;
4. testar `GET /health`;
5. liberar a porta da API apenas quando for necessário integrar com o frontend.
