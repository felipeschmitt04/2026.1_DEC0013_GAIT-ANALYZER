Antes de rodar o frontend, a máquina de desenvolvimento precisa estar preparada com as ferramentas adequadas. Esta seção centraliza os pré-requisitos e a preparação do ambiente de trabalho.

## 1. Pré-requisitos do Sistema
Para executar este frontend, é necessário ter instalado:
* **Node.js (Versão 18 ou superior):** O ambiente de execução do JavaScript/Next.js.
* **Docker Desktop:** Necessário para testar o empacotamento do contêiner localmente antes do deploy.

## 2. Configuração do VS Code (Ambiente de Trabalho)
O Visual Studio Code é o editor recomendado para este projeto. Para garantir a padronização do código, recomenda-se instalar as seguintes extensões:
* **Prisma:** Garante coloração de sintaxe e autocompleta os modelos do arquivo `schema.prisma`.
* **Tailwind CSS IntelliSense:** Exibe sugestões automáticas das classes de estilização visual nas telas.
* **ESLint:** Avisa em tempo real no editor se houver alguma quebra de padrão ou erro de TypeScript.

## 3. Configuração do Arquivo `.env`
Na raiz do projeto, crie um arquivo chamado `.env` (copiando como base o `.env.example`). Adicione a linha de conexão com o banco de dados Supabase:

```env
DATABASE_URL="postgresql://postgres:[SENHA_DO_BANCO]@db.[ID_DO_SUPABASE].supabase.co:5432/postgres"