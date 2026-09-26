# Recomendaciones para mejorar el workflow — ChatGPT Work + GitHub

**Estado:** seguimiento de recomendaciones. El CI mínimo con GitHub Actions fue adoptado mediante Issue #26; las demás medidas continúan como propuestas y **no se consideran adoptadas** por este cambio. El [workflow vigente](../WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md) mantiene la separación de roles.

## Idea rectora

Asignar a GitHub los controles mecánicos repetibles y usar ChatGPT Work para interpretar la intención, revisar arquitectura, evidencia y alcance semántico. El agente implementador mantiene su rol. Los resultados automáticos son evidencia asociada al SHA; no equivalen a `SEMANTIC_ACCEPTED`.

La tabla comunicada por el propietario **no se ha identificado como una publicación oficial de OpenAI**. La documentación oficial confirma que existen herramientas para tareas repetibles y revisiones desde GitHub, pero no establece esa tabla como política obligatoria para este proyecto: [OpenAI, Codex GitHub Action](https://learn.chatgpt.com/docs/github-action) y [OpenAI, revisión de PR](https://learn.chatgpt.com/docs/third-party/github).

## Ideas que conviene evaluar

| Prioridad propuesta | Medida | Utilidad y condición de adopción |
|---|---|---|
| Adoptado — Issue #26 | GitHub Actions mínimo en PR: instalación reproducible, build, tests y `git diff --check`; ejecución manual por ref/SHA y base. | Adoptado mediante `.github/workflows/ci.yml` con runner Linux GitHub-hosted estándar, sin secrets del proyecto, caché, artefactos, deploy ni larger runners. Produce evidencia por SHA; no sustituye revisión semántica ni comprueba automáticamente el Authorized Scope de cada Issue. |
| Después | Plantilla o formulario para los seis encabezados del Work Item y comprobación de Base/HEAD. | Facilita completar Objective, Acceptance Criteria, Authorized Scope, Relevant Sources, Verification y Base. Los [Issue Forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms) pueden exigir campos a quien use el formulario; no demuestran por sí solos que el SHA sea correcto ni controlan otros canales de creación. |
| Después de validar los checks | [Ruleset de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) que requiera PR y checks relevantes para integrar en `main`. | Puede impedir merges con CI requerido sin éxito. Evitar activar un requisito sin un check estable, porque bloquearía la integración. Evaluar excepciones y permisos efectivos antes de configurarlo. |
| Según necesidad | Format, lint y controles de seguridad automatizados. | Incorporarlos sólo tras elegir herramientas, alcance y criterios de fallo; no registrar PASS de herramientas no configuradas. |
| Opcional | Branch automática y GitHub Projects. | Medir si reducen trabajo y errores frente a Issue + branch + PR + comentarios; no crear gestión adicional por defecto. |

## Límites que se mantienen

- GitHub guarda Issue, branch, commit, PR, diff y evidencia; el Supervisor contrasta Semantic Scope y decide para el **SHA revisado**.
- El agente implementador publica pruebas y PR, no se autoaprueba ni hace merge. Chat Web Supervisor ejecuta el merge sólo después de aceptación semántica y comprobaciones de integración. Cambiar esto requiere decisión humana explícita.
- Las pruebas manuales del propietario, incluida la previsualización coordinada en AI Studio cuando corresponda, no se sustituyen por un build o un análisis automatizado.
- El CI mínimo queda adoptado mediante Issue #26. Esta nota no presupone rulesets, Projects, lint/formatters, scanners ni revisión automática configurados en el repositorio.

## Contraste pendiente antes de adoptar

1. Comprobar cada recomendación concreta contra documentación **actual de OpenAI**, distinguiendo capacidades disponibles de orientación oficial aplicable a nuestro caso.
2. Revisar prácticas públicas de la **comunidad internacional de ingeniería de software** en fuentes técnicas identificables y evaluar sus límites para un proyecto pequeño y público; no citar «la comunidad» como autoridad uniforme ni inventar consenso.
3. Contrastar costos, permisos, comportamiento con PR y errores observados en este repositorio con la [documentación oficial de GitHub Actions](https://docs.github.com/en/actions/concepts/billing-and-usage) y de [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
4. Adoptar cada recomendación restante sólo mediante decisión humana y un Work Item propio, con seis secciones, rutas, pruebas y revisión por SHA. La adopción de CI en Issue #26 no autoriza rulesets ni las demás medidas de esta lista.
