"use client"
import { useUserContext } from "@/context/UserContext";
import { Code } from "@heroui/code";
import { Snippet } from "@heroui/snippet";
import { useRouter } from "next/navigation";
import { button as buttonStyles } from "@heroui/theme";
import Link from "next/link";
function UserActionSection() {
  const { username } = useUserContext();
  const router = useRouter();
  if (username) {
    return (
      <div className="mt-8">
        <button
          className={buttonStyles({ color: "primary", radius: "full", variant: "shadow" })}
          onClick={() => router.push("/projects")}
        >
          Take me to projects page
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>

        </button>
      </div>
    );
  }
  return (
    <div className="mt-8">
      <Link
          // isExternal
          className={buttonStyles({
            color: "primary",
            radius: "full",
            variant: "shadow",
          })}
          href={"/auth/login"}
        >
          Login
        </Link>
    </div>
  );
}

export default UserActionSection;