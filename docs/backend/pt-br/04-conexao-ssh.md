# Conexão Via SSH

SSH é o caminho padrão para acessar a VM Azure ou a DGX por terminal. Como esses
ambientes normalmente não têm interface gráfica disponível, todos os comandos de
deploy, logs e execução devem funcionar via shell.

## Comando Básico

```bash
ssh usuario@IP-OU-HOST
```

Exemplo:

```bash
ssh felipe@servidor.example.com
```

## Usando Chave Específica

```bash
ssh -i ~/.ssh/nome_da_chave usuario@IP-OU-HOST
```

Cuide das permissões da chave:

```bash
chmod 600 ~/.ssh/nome_da_chave
```

## Primeiro Acesso

No primeiro acesso, o SSH pode perguntar se você confia no host:

```text
Are you sure you want to continue connecting?
```

Digite `yes` apenas se o IP/host estiver correto.

## Copiar Arquivos Com scp

Enviar arquivo local para servidor:

```bash
scp arquivo.txt usuario@IP-OU-HOST:/caminho/destino/
```

Baixar arquivo do servidor:

```bash
scp usuario@IP-OU-HOST:/caminho/arquivo.txt .
```

Para diretórios:

```bash
scp -r pasta/ usuario@IP-OU-HOST:/caminho/destino/
```

## Manter Processo Rodando

Para processos longos, use `tmux` ou `screen` quando disponível:

```bash
tmux new -s gait
```

Dentro da sessão, rode o backend ou worker. Para sair sem encerrar:

```text
Ctrl-b d
```

Para voltar:

```bash
tmux attach -t gait
```

## Portas Importantes

- `8000`: backend FastAPI central;
- `9000`: worker DGX;
- `5173`: demo local.

Se uma porta não responder, confirme primeiro se o processo está rodando no
servidor e depois se firewall, túnel ou regra de rede permite acesso externo.

## Diagnóstico Rápido

```bash
pwd
ls
git status --short
python3 --version
docker ps
curl http://localhost:8000/health
```

Na DGX, Docker pode não estar disponível. Nesse caso, valide o worker por conda:

```bash
conda activate gait_env
cd engine_dgx
uvicorn main:app --host 0.0.0.0 --port 9000
```
