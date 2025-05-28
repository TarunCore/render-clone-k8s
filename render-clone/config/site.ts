export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "sudo deploy",
  description: "Deploy your code to the cloud with ease.",
  navItems: [
    {
      label: "Projects",
      href: "/projects",
    },
  ],
  navMenuItems: [
    {
      label: "Projects",
      href: "/projects",
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
  links: {
    github: "https://github.com/TarunCore/render-clone-k8s",
    twitter: "https://twitter.com/hero_ui",
    docs: "https://heroui.com",
    discord: "https://discord.gg/9b6yyZKmH4",
  },
};
