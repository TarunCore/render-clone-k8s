import Dockerode from "dockerode";
import { docker } from "../docker/docker";

/*
   Takes a containerId and starts the build process
*/
async function startBuild(containerId: string, github_url: string, to_deploy_commit_hash: string) {
    const container = docker.getContainer(containerId);

    // Extract the repo name from the GitHub URL
    const repoName = github_url.split('/').pop()?.replace(/\.git$/, '') || 'repo';

    // const commands = [
    //     `git clone ${github_url}`,
    //     `cd ${repoName}`,
    //     "pwd",
    //     `git checkout ${to_deploy_commit_hash}`,
    //     `npm install`
    // ];

    // for (const command of commands) {
    //     await execInContainer(container, ['/bin/sh', '-c', command]);
    //     console.log(`Executed command: ${command}`);
    // }
    const command = `
        git clone ${github_url} && \
        cd ${repoName} && \
        pwd && \
        git checkout ${to_deploy_commit_hash} && \
        npm install
    `;
    await execInContainer(container, ['/bin/sh', '-c', command]);
    console.log(`Executed build process for repo ${repoName}`);
}

async function execInContainer(container: Dockerode.Container, cmd: string[]) {
    const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: false, // TODO
        AttachStderr: true,
        Tty: false
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise<void>((resolve, reject) => {
        container.modem.demuxStream(stream, process.stdout, process.stderr);
        stream.on('end', resolve);
        stream.on('error', reject);
    });
}

export {startBuild};