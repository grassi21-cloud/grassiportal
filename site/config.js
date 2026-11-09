// Configuração do portal — edite aqui. Nada secreto neste arquivo (é público).
// Links "port" usam o mesmo endereço digitado no navegador (grassinas, nome Tailscale ou IP).
window.PORTAL_CONFIG = {
  title: "Casa Grassi",
  subtitle: "Aplicações e atalhos da casa",
  patri: { port: 8888 },
  // Agenda "Family" do Google (privada; só quem tem acesso e está logado no Google vê). O ID não é segredo.
  // people: cor por pessoa (a primeira cujo "match" aparece no título do evento, sem acento/maiúscula).
  // "color" vale para o tema claro e "colorDark" para o escuro (ambos com contraste AA).
  // showDescription: a descrição dos eventos pode ter texto sensível; só aparece se for true.
  calendar: {
    id: "family09827596762050534852@group.calendar.google.com",
    showDescription: false,
    people: [
      { name: "Nicolas",   color: "#1565c0", colorDark: "#64b5f6", match: ["nicolas"] },
      { name: "Anastasia", color: "#c2185b", colorDark: "#f48fb1", match: ["anastasia", "ana"] },
      { name: "André",     color: "#b45309", colorDark: "#ffb74d", match: ["andré", "andre"] }
    ],
    defaultName: "Família",
    defaultColor: "#5f6b64",
    defaultColorDark: "#a3b0a8"
  },
  // Casa = aplicações estáticas da casa servidas pela porta 80. "url" começando com "/"
  // é relativo à raiz do host digitado (grassinas, nome Tailscale ou IP).
  casa: [
    { label: "Saúde da Família", url: "/health/", icon: "🩺", desc: "Prontuários, exames e evolução da família" },
    { label: "eWeLink", url: "https://web.ewelink.cc", icon: "💡", desc: "Dispositivos SONOFF", external: true },
    { label: "Arlo", url: "https://my.arlo.com", icon: "📷", desc: "Câmeras de segurança", external: true },
    { label: "Google Home", url: "https://home.google.com", icon: "🏠", desc: "Casa conectada do Google", external: true }
  ],
  admin: [
    { label: "Painel do QNAP", port: 8080, path: "/", icon: "🗄️" },
    { label: "Console do Patri", port: 8888, path: "/admin", icon: "🛠️" },
    { label: "Sentry", url: "https://patri.sentry.io", icon: "🐞", external: true },
    { label: "GitHub do Patri", url: "https://github.com/grassi21-cloud/Patri", icon: "🐙", external: true },
    { label: "Tailscale admin", url: "https://login.tailscale.com/admin", icon: "🔐", external: true }
  ]
};
