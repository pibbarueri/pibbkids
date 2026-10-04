# Changelog

Mudanças relevantes pro usuário final, uma seção por versão. Formato:
`## vX.Y.Z - YYYY-MM-DD`, seguido de uma lista com `-`. Uma linha indentada logo depois de um
item (sem `-` na frente) vira a descrição daquele item, exibida menor/discreta no modal.

A tag `vX.Y.Z` é criada manualmente na `main` (`git tag vX.Y.Z && git push origin vX.Y.Z`)
depois do merge que fecha uma leva de mudanças. Não é 1 tag por PR. O push da tag dispara o
deploy de produção (`.github/workflows/deploy.yml`), então a seção da versão precisa estar
aqui antes da tag sair.

## v1.7.0 - 2026-10-03
- Cada lanche agora tem seu próprio aviso de estoque baixo.
  No cadastro do lanche, preencha "Comprar mais quando chegar em" (de 0 a 50) e a liderança é avisada quando o estoque chegar nesse número. Use 0 para não receber aviso daquele lanche.
- Visitantes: dá pra informar só a idade em vez da data de nascimento.
- Visitantes agora podem ser editados ou removidos pela recepção!
- Excluir um evento agora pede confirmação.

## v1.6.0 - 2026-08-31
- Esse aviso, mostrando tudo o que mudou desde a última vez que você abriu o app!

## v1.5.0 - 2026-08-31
- Recepcionistas agora podem visualizar a tela de Aulas (somente leitura).
  Isso os ajudará na separação de materiais que os professores utilizarão em sala, antes mesmo da aula começar.
