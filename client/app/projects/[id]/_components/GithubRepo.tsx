import Link from "next/link";

function GithubRepo({ url }: { url: string | undefined }) {
  if (!url) {
    return null;
  }
  const repoPath = url.replace("https://github.com/", ""); // Extracts "TarunCore/ffcs-api-v2"
  return (
    <Link
      href={url}
      target="_blank"
      className="inline-flex items-center gap-1 text-gray-800 dark:text-gray-200 hover:underline text-sm"
    >
      <img src="/icons/github.svg" height="20" width="20" alt="Github logo" />
      <span className="font-medium">{repoPath.split("/")[0]}</span>
      <span>/</span>
      <span>{repoPath.split("/")[1]}</span>
    </Link>
  );
}

export default GithubRepo;
