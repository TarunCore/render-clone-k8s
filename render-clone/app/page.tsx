import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";
import UserActionSection from "@/components/take-to-projects";
import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import { UserProvider } from "@/context/UserContext";


export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>Deploy your&nbsp;</span>
        <span className={title({ color: "blue" })}>code&nbsp;</span>
        <br />
        <span className={title()}>
          to the cloud in seconds.
        </span>
        <div className={subtitle({ class: "mt-4" })}>
          Made with Kubernetes.
        </div>
      </div>

      <div className="flex gap-3">
        
        <Link
          isExternal
          className={buttonStyles({ variant: "bordered", radius: "full" })}
          href={siteConfig.links.github}
        >
          <GithubIcon size={20} />
          GitHub
        </Link>
      </div>
      <UserProvider>
        <UserActionSection />
      </UserProvider>
    </section>
  );
}
