# Changelog

Mudanças relevantes pro usuário final, uma seção por versão. Formato:
`## vX.Y.Z - YYYY-MM-DD`, seguido de uma lista com `-`. Uma linha indentada logo depois de um
item (sem `-` na frente) vira a descrição daquele item, exibida menor/discreta no modal. A
tag `vX.Y.Z` é criada manualmente (`git tag vX.Y.Z && git push --tags`) depois do merge que
fecha uma leva de mudanças — não é 1 tag por PR, e não muda o pipeline de deploy
(push→main→produção continua igual).

## v1.6.0 - 2026-08-31
- Recepcionistas agora podem visualizar a tela de Aulas (somente leitura).
  Isso os ajudará na separação de materiais que os professores utilizarão em sala, antes mesmo da aula começar.

## v1.5.0 - 2026-08-19
- Criação desde modal, mostrando o que mudou desde a última vez que você abriu o app
