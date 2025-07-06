"use client"
import api from '@/components/axios'
import { Projects } from '@/types/projectTypes';
import { Button } from '@heroui/button';
import { useParams } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react'
import { Divider } from "@heroui/divider";
import PullIcon from '@/components/icons/PullIcon';
import { Link } from '@heroui/link';
import { Select, SelectSection, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import AnsiToHtml from 'ansi-to-html';
import EyeIcon from '@/components/icons/EyeIcon';
import SettingsIcon from '@/components/icons/SettingsIcon';
import { Input, Textarea } from "@heroui/input";
import RefreshIcon from '@/components/icons/RefreshIcon';
import { convertToProperCase } from '@/utils/commonUtils';
import { MAIN_DEP_URL } from '@/config/constants';
import GithubRepo from './_components/GithubRepo';
import { addToast } from '@heroui/toast';
import { useRouter } from 'next/navigation';

const convert = new AnsiToHtml();
// const ws = new WebSocket('ws://localhost:3001/');

const ManageProjectsPage = () => {
    const params = useParams<{ id: string }>()
    const router = useRouter();
    const wsRef = useRef<WebSocket | null>(null);
    const logsContainerRef = useRef<HTMLDivElement | null>(null);
    const [selectedBranch, setSelectedBranch] = useState("main");
    const [deployment, setProject] = useState<Projects | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [commits, setCommits] = useState<{sha: string, message: string}[]>([]);
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedCommit, setSelectedCommit] = useState<string>("");
    const [builds, setBuilds] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'overview' | 'builds' | 'settings'>('overview');
    const [projectSettings, setProjectSettings] = useState({
        installCommand: "",
        buildCommand: "",
        runCommand: "",
        envVariables: "",
        projectType: "nodejs",
        port: 3000,
        rootPath: "/",
    });
    const [isUpdating, setIsUpdating] = useState(false);

    async function fetchData() {
        try {
            api.get('/projects/status/' + params.id).then((res) => {
                if (res.status === 200) {
                    // const { podStatus } = res.data.data;
                    // if (deployment) {
                    //     setProject({...deployment, status: podStatus});
                    // }
                }
            }).catch((err) => {
                console.log(err);
            });
            const response = await api.get('/projects/' + params.id);
            if (response.status === 200) {
                setProject(response.data.data);
            }
            const buildsResponse = await api.get('/projects/' + params.id + '/builds');
            if (buildsResponse.status === 200) {
                setBuilds(buildsResponse.data.data);
            }
            console.log(response.data);
        } catch (err) {

        }
    }
    async function fetchCommitsAndBranches() {
        // extract the repo name from the github_url
        const github_url = deployment?.github_url;
        if (!github_url) return;
        const repoName = github_url.split('/').slice(-2).join('/');

        try {
            const [commitsResponse, branchesResponse] = await Promise.all([
                fetch(`https://api.github.com/repos/${repoName}/commits?per_page=5`, {
                    headers: {
                        "Accept": "application/vnd.github+json"
                    }
                }),
                fetch(`https://api.github.com/repos/${repoName}/branches`, {
                    headers: {
                        "Accept": "application/vnd.github+json"
                    }
                })
            ]);

            if (commitsResponse.status !== 200) {
                console.log("Error fetching commits");
                return;
            }
            const commitsData = await commitsResponse.json();
            const commitsList = commitsData.map((commit: any) => ({
                sha: commit.sha,
                message: commit.commit?.message?.split('\n')[0] || 'No message'
            }));
            setCommits(commitsList);
            // Select first commit by default if available
            if (commitsList.length > 0) {
                setSelectedCommit(commitsList[0].sha);
            }

            if (branchesResponse.status === 200) {
                const branchesData = await branchesResponse.json();
                const branchNames = branchesData.map((branch: any) => branch.name);
                setBranches(branchNames);
                // Select first branch by default if available
                if (branchNames.length > 0) {
                    setSelectedBranch("main");
                }
            }
        } catch (err) {
            console.log("Error fetching commits or branches", err);
        }
    }
    useEffect(() => {
        fetchData();
    }, [])
    const { description, status, build_details, github_url, root_path } = deployment || {};

    useEffect(() => {
        fetchCommitsAndBranches();
        if (deployment) {
            setProjectSettings({
                installCommand: deployment.install_commands || "",
                buildCommand: deployment.build_commands || "",
                runCommand: deployment.run_commands || "",
                envVariables: deployment.env_variables || "",
                projectType: deployment.project_type || "nodejs",
                port: deployment.port || 3000,
                rootPath: deployment.root_path || "/",
            });
        }
    }, [deployment]);

    const connectWebSocket = async () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        if (!process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
            console.error("WebSocket URL is not defined");
            return;
        }

        let wsToken: string | null = null;
        try {
            const tokenResponse = await api.get('/users/ws-token');
            wsToken = tokenResponse.data.token;
        } catch (err) {
            console.error("Failed to get WebSocket auth token:", err);
            return;
        }

        const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'frontend-subscribe', deploymentId: params.id, token: wsToken }));
        };

        ws.onmessage = (event) => {
            const message = event.data;
            setLogs(prev => [...prev, message]);
        };

        ws.onerror = (error) => {
            console.log("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
        };

        wsRef.current = ws;
        return ws;
    };

    useEffect(() => {
        if (!params.id) return;

        connectWebSocket();

        return () => {
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [params.id]);

    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const refreshStatus = async () => {
        await connectWebSocket();
        
        api.get('/projects/status/' + params.id).then((res) => {
            if (res.status === 200) {
                const { podStatus } = res.data;
                if (deployment) {
                    console.log(podStatus);
                    setProject({...deployment, status: podStatus});
                    if(status !== podStatus) {
                        setLogs([]);
                    }
                }
            }
        }).catch((err) => {
            console.log(err);
        });
    }
    const pullAndDeploy = async (e: React.FormEvent) => {
        e.preventDefault();
        const { installCommand, buildCommand, runCommand, envVariables, projectType, port } = projectSettings;
        if (buildCommand === "" && installCommand === "" && runCommand === "" && envVariables === "" && port === 3000) {
            alert("Please update the project settings first");
            return;
        }
        try {
            const selectedCommitObj = commits.find(c => c.sha === selectedCommit);
            const response = await api.post('/builds/create/', {
                project_id: params.id,
                github_url: github_url,
                to_deploy_commit_hash: selectedCommit,
                commit_message: selectedCommitObj?.message || 'No message',
                branch: selectedBranch, // TODO: add support for other branches
                project_type: projectType,
            });
            if (response.status === 200) {
                addToast({
                    title: "Pull and deploy started",
                    description: response.data.message,
                    color: "success",
                });
                console.log("Pull and deploy started");
            }
        } catch (err) {

        }
    }

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            const response = await api.patch(`/projects/${params.id}`, {
                install_commands: projectSettings.installCommand,
                build_commands: projectSettings.buildCommand,
                run_commands: projectSettings.runCommand,
                env_variables: projectSettings.envVariables,
                project_type: projectSettings.projectType,
                port: projectSettings.port,
                root_path: projectSettings.rootPath
            });
            if (response.status === 200) {
                setActiveSection('overview');
                fetchData();
            }
        } catch (err) {
            // Optionally handle error
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    const deleteProject = async () => {
        const response = await api.delete(`/projects/${params.id}`);
        if (response.status === 200) {
            addToast({
                title: "Project deleted",
                description: response.data.message,
                color: "danger",
            });
            router.push('/projects');
        }
    }

    return (
        <div className="flex h-[calc(100vh-4.5rem)]">
            {/* Sidebar */}
            <aside className="w-42 sm:w-64 border-r border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-4">
                <h1 className="text-xl font-bold mb-2">Project</h1>
                <nav className="flex flex-col gap-2">
                    <button
                        onClick={() => setActiveSection('overview')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md ${activeSection === 'overview' ? 'bg-blue-500 text-white' : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                    >
                        <EyeIcon /> Overview
                    </button>
                    <button
                        onClick={() => setActiveSection('builds')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md ${activeSection === 'builds' ? 'bg-blue-500 text-white' : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                    >
                        <PullIcon /> Builds
                    </button>
                    <button
                        onClick={() => setActiveSection('settings')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md ${activeSection === 'settings' ? 'bg-blue-500 text-white' : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                    >
                        <SettingsIcon /> Settings
                    </button>
                </nav>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
                {activeSection === 'overview' && (
                    <section className="flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">{`Manage Project - ${deployment?.name ?? ''}`}</h2>
                        </div>


                        <form className="flex flex-wrap gap-4 items-end" onSubmit={pullAndDeploy}>
                            <Select
                                className="max-w-xs"
                                label="Select Branch"
                                isRequired
                                selectedKeys={selectedBranch ? [selectedBranch] : []}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                            >
                                {branches.map((branch) => (
                                    <SelectItem key={branch}>{branch}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                className="max-w-xs"
                                label="Select Commit"
                                isRequired
                                selectedKeys={selectedCommit ? [selectedCommit] : []}
                                onChange={(e) => setSelectedCommit(e.target.value)}
                            >
                                {commits.map((commit) => (
                                    <SelectItem key={commit.sha}>{commit.message}</SelectItem>
                                ))}
                            </Select>

                            <Button
                                type="submit"
                                variant="solid"
                                color="primary"
                                startContent={<PullIcon />}
                            >
                                Deploy
                            </Button>
                        </form>

                        <div className="flex flex-col gap-2">
                            <GithubRepo url={github_url} rootPath={root_path || "/"} />
                            {status && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm dark:text-gray-400">Status:</span>
                                    <span
                                        className={`text-white text-xs font-semibold px-2 py-1 rounded-full ${status === 'running' ? 'bg-green-500' : 'bg-red-600'}`}
                                    >
                                        {convertToProperCase(status)}
                                    </span>
                                </div>
                            )}
                            <Link className="text-sm inline-flex items-center gap-1" target="_blank" href={`http://${deployment?.subdomain}${MAIN_DEP_URL}`}>
                                {`${deployment?.subdomain}${MAIN_DEP_URL}`}
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.5 3C3.22386 3 3 2.77614 3 2.5C3 2.22386 3.22386 2 3.5 2H9.5C9.77614 2 10 2.22386 10 2.5V8.5C10 8.77614 9.77614 9 9.5 9C9.22386 9 9 8.77614 9 8.5V3.70711L2.85355 9.85355C2.65829 10.0488 2.34171 10.0488 2.14645 9.85355C1.95118 9.65829 1.95118 9.34171 2.14645 9.14645L8.29289 3H3.5Z" fill="currentColor"/>
                                </svg>
                            </Link>
                            <p className="dark:text-gray-400 text-sm">
                                Last Deployment: {build_details?.build_started_at ? new Date(build_details?.build_started_at).toLocaleTimeString() + ' ' + new Date(build_details.build_started_at).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>

                        {/* Logs */}
                        <div className="">
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-2xl font-bold">Logs</h2>
                                <Button isIconOnly aria-label="Watch" color="warning" variant="faded" onPress={refreshStatus}>
                                    <RefreshIcon />
                                </Button>
                            </div>
                            <Divider className="my-4" />
                            <div ref={logsContainerRef} className="p-4 rounded-md max-h-[60vh] overflow-y-auto bg-neutral-100 dark:bg-neutral-800 font-mono text-sm whitespace-pre-wrap">
                                {logs.map((log, index) => (
                                    <p key={index} className="text-md dark:text-gray-100">
                                        {log}
                                    </p>
                                ))}
                                <Spinner />
                            </div>
                        </div>
                    </section>
                )}

                {activeSection === 'builds' && (
                    <section className="flex flex-col gap-4">
                        <h2 className="text-2xl font-bold">{`Builds ${builds.length ? `(${builds.length})` : ''}`}</h2>
                        <Divider />
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] scrollbar-hide">
                            {builds.length === 0 && <p className="text-gray-400 text-sm">No builds found</p>}
                            {builds.map((build) => (
                                <div
                                    key={build.id}
                                    className="flex flex-col gap-1 border border-blue-300 p-3 rounded-md"
                                >
                                    <p className="dark:text-gray-300 text-sm">Build ID: {build.id}</p>
                                    <p className="dark:text-gray-400 text-sm">Commit Hash: {build.git_commit_hash}</p>
                                    <p className="dark:text-gray-400 text-sm">Commit Message: {build.git_commit_message}</p>
                                    <p className="dark:text-gray-400 text-sm">
                                        Build Started At:{' '}
                                        {new Date(build.build_started_at).toLocaleTimeString()} {' '}
                                        {new Date(build.build_started_at).toLocaleDateString()}
                                    </p>
                                    <p className="dark:text-gray-400 text-sm">Status: {build.status}</p>
                                    <p className="dark:text-gray-400 text-sm">Status Message: {build.status_message}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {activeSection === 'settings' && (
                    <section className="flex flex-col gap-6 max-w-2xl">
                        <h2 className="text-2xl font-bold">Project Settings</h2>
                        <form onSubmit={handleUpdateSettings} className="flex flex-col gap-4">
                            <Input
                                label="Install Command"
                                value={projectSettings.installCommand}
                                onChange={(e) => setProjectSettings((prev) => ({ ...prev, installCommand: e.target.value }))}
                                placeholder="npm install"
                                name="installCommand"
                            />
                            <Input
                                label="Build Command"
                                value={projectSettings.buildCommand}
                                onChange={(e) => setProjectSettings((prev) => ({ ...prev, buildCommand: e.target.value }))}
                                placeholder="npm run build"
                                name="buildCommand"
                            />
                            <Input
                                label="Run Command"
                                value={projectSettings.runCommand}
                                onChange={(e) => setProjectSettings((prev) => ({ ...prev, runCommand: e.target.value }))}
                                placeholder="npm start"
                                name="runCommand"
                            />
                            <Input
                                label="Port"
                                value={projectSettings.port.toString()}
                                onChange={(e) => setProjectSettings((prev) => ({ ...prev, port: parseInt(e.target.value) }))}
                                placeholder="3000"
                                name="port"
                            />
                            <Input
                                label="Root Path"
                                value={projectSettings.rootPath}
                                onChange={(e) => setProjectSettings((prev) => ({ ...prev, rootPath: e.target.value }))}
                                placeholder="/"
                                name="rootPath"
                                description="specify the subdirectory (e.g., /backend, /server)"
                            />
                            <Textarea
                                label="Env Variables (as a single string)"
                                value={projectSettings.envVariables}
                                onChange={(e) => setProjectSettings((prev) => ({ ...prev, envVariables: e.target.value }))}
                                placeholder={`KEY1=VALUE1\nKEY2=VALUE2`}
                                name="envVariables"
                            />
                            {/* Project Type selection */}
                            <div className="flex gap-4 items-center mt-2">
                                <button
                                    type="button"
                                    onClick={() => setProjectSettings((prev) => ({ ...prev, projectType: 'nodejs' }))}
                                    className={`border-2 rounded-lg p-1 ${projectSettings.projectType === 'nodejs' ? 'border-blue-500' : 'border-transparent'}`}
                                    aria-label="Node.js"
                                >
                                    <img src="/icons/nodejs.svg" height="48" width="48" alt="Node.js logo" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProjectSettings((prev) => ({ ...prev, projectType: 'python' }))}
                                    className={`border-2 rounded-lg p-1 ${projectSettings.projectType === 'python' ? 'border-blue-500' : 'border-transparent'}`}
                                    aria-label="Python"
                                >
                                    <img src="/icons/python.svg" height="48" width="48" alt="Python logo" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProjectSettings((prev) => ({ ...prev, projectType: 'go' }))}
                                    className={`border-2 rounded-lg p-1 ${projectSettings.projectType === 'go' ? 'border-blue-500' : 'border-transparent'}`}
                                    aria-label="Golang"
                                >
                                    <img src="/icons/go.svg" height="48" width="48" alt="Golang logo" />
                                </button>
                            </div>

                            <div className="flex gap-4 justify-end flex-wrap">
                                {/* <Button variant="light" type="button" onClick={() => setActiveSection('overview')}>Cancel</Button> */}
                                <Button color="primary" type="submit" isLoading={isUpdating} disabled={isUpdating}>
                                    Update
                                </Button>
                                <Button color="danger" type="button" onPress={() => deleteProject()}>
                                    Delete Project
                                </Button>
                            </div>
                            {/* Delete Project */}
                        </form>
                    </section>
                )}
            </main>
        </div>
    )
}

export default ManageProjectsPage