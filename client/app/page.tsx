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
      <section className="py-10 px-4  from-default-50 to-default-100 dark:from-default-900/20 dark:to-default-800/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={title({class: "mb-6" })}>
              Deploy in <span className={title({ color: "blue" })}>3 simple steps</span>
            </h2>
            <p className={subtitle({ class: "max-w-2xl mx-auto" })}>
              Get your application live in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Connect Your Repository</h3>
              <p className="text-default-600">
                Connect your GitHub, GitLab, or Bitbucket repository with just a few clicks.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Configure & Deploy</h3>
              <p className="text-default-600">
                Set your build settings and environment variables. We handle the rest automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Go Live</h3>
              <p className="text-default-600">
                Your application is live with SSL, CDN, and monitoring included out of the box.
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
