# Backlog do grassiportal

O backlog vive no **GitHub Projects (`Projetos_Grassi`)**: https://github.com/users/grassi21-cloud/projects/1
— a issue é a fonte da verdade (descrição, decisões, prompt e diário em comentários).

Estes arquivos são **exportados ao fechar cada feature** (`scripts/backlog/export.py` do repositório Patri) — **não editar à mão**.

- `PORTAL-<n>-<P antigo>-<slug>.md` — feature migrada do backlog antigo; `PORTAL-<n>-<slug>.md` — feature nova.
  Cada arquivo traz a descrição da issue e todos os comentários.

MAPA: P001→#1, P002→#2, P003→#3, P004→#4, P005→#5

Exportar (a partir do clone do Patri):
`python <Patri>/scripts/backlog/export.py --repo grassi21-cloud/grassiportal --project-number 1 --prefix PORTAL --out docs/backlog --all`
(ou `--issue <n>`).
