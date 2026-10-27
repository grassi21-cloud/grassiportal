// Configuração do portal — edite aqui. Nada secreto neste arquivo (é público).
// Links "port" usam o mesmo endereço digitado no navegador (grassinas, nome Tailscale ou IP).
window.PORTAL_CONFIG = {
  title: "Casa Grassi",
  subtitle: "Aplicações e atalhos da casa",
  patri: { port: 8888 },
  // Casa = aplicações estáticas da casa servidas pela porta 80. "url" começando com "/"
  // é relativo à raiz do host digitado (grassinas, nome Tailscale ou IP).
  casa: [
    { label: "Saúde da Família", url: "/health/", icon: "🩺", desc: "Prontuários, exames e evolução da família" }
  ],
  admin: [
    { label: "Painel do QNAP", port: 8080, path: "/", icon: "🗄️" },
    { label: "Console do Patri", port: 8888, path: "/admin", icon: "🛠️" },
    { label: "Sentry", url: "https://patri.sentry.io", icon: "🐞", external: true },
    { label: "GitHub do Patri", url: "https://github.com/grassi21-cloud/Patri", icon: "🐙", external: true },
    { label: "Tailscale admin", url: "https://login.tailscale.com/admin", icon: "🔐", external: true }
  ]
};
