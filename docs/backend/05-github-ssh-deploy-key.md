# GitHub, SSH E Deploy Key

Este guia resume como deixar um servidor capaz de baixar o repositório pelo
GitHub usando SSH. Isso é útil para Azure e DGX, principalmente quando não há
interface gráfica.

## Verificar Chaves Existentes

```bash
ls ~/.ssh
```

Arquivos comuns:

- `id_ed25519`: chave privada;
- `id_ed25519.pub`: chave pública;
- `known_hosts`: hosts já reconhecidos.

Nunca publique a chave privada.

## Criar Uma Chave SSH

```bash
ssh-keygen -t ed25519 -C "gait-analyzer-deploy"
```

Quando perguntar o caminho, pode usar:

```text
~/.ssh/gait_analyzer_deploy
```

Depois, veja a chave pública:

```bash
cat ~/.ssh/gait_analyzer_deploy.pub
```

## Adicionar No GitHub

Para servidor de deploy, prefira uma Deploy Key do repositório:

```text
GitHub -> Repository -> Settings -> Deploy keys -> Add deploy key
```

Marque permissão de escrita somente se o servidor realmente precisar fazer push.
Para deploy normal, leitura basta.

## Configurar SSH Para Usar A Chave

Edite `~/.ssh/config`:

```text
Host github.com-gait-analyzer
    HostName github.com
    User git
    IdentityFile ~/.ssh/gait_analyzer_deploy
    IdentitiesOnly yes
```

Teste:

```bash
ssh -T git@github.com-gait-analyzer
```

## Clonar O Repositório

Use o host configurado:

```bash
git clone git@github.com-gait-analyzer:USUARIO/REPOSITORIO.git gait_analyzer
```

Se o repositório já existe:

```bash
cd gait_analyzer
git pull
```

## Boas Práticas

- Não commitar chaves.
- Não copiar chave privada para conversas ou documentos.
- Usar Deploy Key por repositório quando possível.
- Remover a chave do GitHub se o servidor for descartado.
- Usar `git status --short` antes de atualizar o servidor para não perder
  alterações locais.

## Problemas Comuns

### Permission denied publickey

Verifique:

```bash
ssh -T git@github.com-gait-analyzer
ls -l ~/.ssh/gait_analyzer_deploy
cat ~/.ssh/config
```

### Host Key Verification Failed

Remova a entrada antiga com cuidado e conecte novamente:

```bash
ssh-keygen -R github.com
ssh -T git@github.com-gait-analyzer
```

### Repositório Clonado Por HTTPS

Troque o remote para SSH:

```bash
git remote set-url origin git@github.com-gait-analyzer:USUARIO/REPOSITORIO.git
git remote -v
```
