# Persistência com Supabase

Diferente de sistemas tradicionais onde o banco de dados fica escondido exclusivamente atrás do backend, o nosso projeto adotou uma estratégia inteligente: a persistência histórica e o gerenciamento dos dados clínicos ficaram sob a responsabilidade direta do **Frontend**. Como o servidor de IA foi desenhado estritamente para processar os vídeos, o frontend assume o papel de organizar, salvar e disponibilizar essas informações para o futuro.

Essa comunicação direta e segura com o armazenamento é feita utilizando o **Prisma ORM** conectado ao **Supabase**.

## O Papel do Prisma e do Supabase

* **Supabase (O Banco de Dados):** É um banco de dados relacional (PostgreSQL) hospedado na nuvem. Ele funciona como o arquivo morto digital da clínica, onde ficam armazenadas de forma permanente as fichas dos pacientes, os perfis dos profissionais e o histórico de exames.
* **Prisma ORM (O Tradutor):** Em vez de escrevermos linhas complexas de código de banco de dados na unha (comandos SQL), usamos o Prisma. Ele traduz os comandos do Next.js para o banco de dados automaticamente, garantindo que a leitura e a gravação de dados sejam rápidas, padronizadas e seguras.

## A "Amarração" Estratégica dos IDs (`id: jobId`)

O ponto mais elegante dessa integração acontece no momento em que um novo vídeo é enviado para análise. Para que o sistema saiba exatamente qual relatório pertence a qual processamento, o frontend realiza uma sincronização perfeita de identificadores:

1. **O Retorno da IA:** Assim que o frontend envia o vídeo, o backend de IA aceita o arquivo e devolve um código único de rastreio daquela tarefa: o `job_id`.
2. **A Criação do Registro Local:** Em vez de o frontend gerar um número aleatório qualquer para salvar a análise no nosso banco de dados, o código intercepta esse `job_id` da IA e o utiliza diretamente como a **Chave Primária (`id`)** da tabela no Supabase.
3. **O Vínculo Perfeito:** Ao salvar o registro no banco com o comando `db.análise.create({ data: { id: jobId, ... } })`, amarramos o ID do histórico local com o id do job da nuvem.
4. **O Resultado Prático:** O ID do exame no banco e o ID do processo na IA passam a ser **o mesmo número**. Isso elimina a necessidade de criar tabelas complexas de tradução e garante que, quando o médico clicar para ver os gráficos, o frontend saiba exatamente qual resultado buscar usando um único identificador.

## Vantagens dessa Arquitetura

1. **Independência do Sistema:** Mesmo se o servidor de processamento pesado da IA estiver temporariamente offline ou em manutenção, o médico não perde o acesso ao sistema. O histórico de consultas, o cadastro de pacientes e as métricas antigas continuam totalmente acessíveis.
2. **Blindagem de Credenciais:** Toda essa operação de gravação acontece dentro das rotas de API internas do Next.js (`/api/analises`). O navegador do paciente ou do médico nunca vê a senha do banco de dados; a rota interna faz a ponte de forma oculta e segura.
