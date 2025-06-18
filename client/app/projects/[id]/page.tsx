"use client"
import api from '@/components/axios'
import { Projects } from '@/types/projectTypes';
import { Button } from '@heroui/button';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'
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
import { HOST_URL } from '@/config/constants';
const convert = new AnsiToHtml();
// const ws = new WebSocket('ws://localhost:3001/');

const ManageProjectsPage = () => {
    const params = useParams<{ id: string }>()
    const [selectedBranch, setSelectedBranch] = useState("");
    const [deployment, setProjects] = useState<Projects | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [commits, setCommits] = useState<string[]>([]);
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
        port: "",
    });
    const [isUpdating, setIsUpdating] = useState(false);

    async function fetchData() {
        try {
            api.get('/projects/status/' + params.id)
            const response = await api.get('/projects/' + params.id);
            if (response.status === 200) {
                setProjects(response.data.data);
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
            const commitHashes = commitsData.map((commit: any) => commit.sha);
            setCommits(commitHashes);
            // Select first commit by default if available
            if (commitHashes.length > 0) {
                setSelectedCommit(commitHashes[0]);
            }

            if (branchesResponse.status === 200) {
                const branchesData = await branchesResponse.json();
                const branchNames = branchesData.map((branch: any) => branch.name);
                setBranches(branchNames);
                // Select first branch by default if available
                if (branchNames.length > 0) {
                    setSelectedBranch(branchNames[0]);
                }
            }
        } catch (err) {
            console.log("Error fetching commits or branches", err);
        }
    }
    useEffect(() => {
        fetchData();
    }, [])
    const { description, status, last_deployed_hash, last_deployed_at, github_url } = deployment || {};

    useEffect(() => {
        fetchCommitsAndBranches();
        if (deployment) {
            setProjectSettings({
                installCommand: deployment.install_commands || "",
                buildCommand: deployment.build_commands || "",
                runCommand: deployment.run_commands || "",
                envVariables: deployment.env_variables || "",
                projectType: deployment.project_type || "nodejs",
                port: deployment.port || "",
            });
        }
    }, [deployment]);

    useEffect(() => {
        if (!params.id) return;

        const ws = new WebSocket('ws://localhost:8080/');

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'frontend-subscribe', deploymentId: params.id }));
        };

        ws.onmessage = (event) => {
            const message = event.data;
            // const htmlLogs = convert.toHtml(message);
            setLogs(prev => [...prev, message]); // prepend new log to the top
        };

        ws.onerror = (error) => {
            console.log("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
        };

        return () => {
            ws.close(); // cleanup on component unmount
        };
    }, [params.id]);
    const watchLogs = async () => {
        try {
            const response = await api.post('/projects/' + params.id + '/watch-logs');
            if (response.status === 200) {
                console.log("Logs watched");
            }
        } catch (err) {
            console.log(err);
        }
    }
    const pullAndDeploy = async (e: React.FormEvent) => {
        e.preventDefault();
        const { installCommand, buildCommand, runCommand, envVariables, projectType, port } = projectSettings;
        if (buildCommand === "" && installCommand === "" && runCommand === "" && envVariables === "" && port === "") {
            alert("Please update the project settings first");
            return;
        }
        try {
            const response = await api.post('/builds/create/', {
                project_id: params.id,
                github_url: github_url,
                to_deploy_commit_hash: selectedCommit,
                branch: selectedBranch, // TODO: add support for other branches
                project_type: projectType,
            });
            if (response.status === 200) {
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
                port: projectSettings.port
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

    return (
        <div className="flex">
            {/* Sidebar */}
            <aside className="w-64 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-4">
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
            <main className="flex-1 p-6 overflow-y-auto">
                {activeSection === 'overview' && (
                    <section className="flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">{`Manage Project - ${deployment?.name ?? ''}`}</h2>
                        </div>

                        <Link className="text-sm" target="_blank" href={github_url}>{github_url}</Link>

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
                                    <SelectItem key={commit}>{commit}</SelectItem>
                                ))}
                            </Select>

                            <Button
                                type="submit"
                                variant="flat"
                                color="success"
                                startContent={<PullIcon />}
                            >
                                Pull & Deploy
                            </Button>
                        </form>

                        <div className="flex flex-col gap-2">
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
                            <p className="dark:text-gray-400 text-sm">
                                Last Deployment: {last_deployed_at ? new Date(last_deployed_at).toDateString() : 'N/A'}
                            </p>
                            <Link className="text-sm" target="_blank" href={`http://${deployment?.subdomain}${HOST_URL}`}>
                                {`${deployment?.subdomain}${HOST_URL}`}
                            </Link>
                        </div>

                        {/* Logs */}
                        <div className="">
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-2xl font-bold">Logs</h2>
                                <Button isIconOnly aria-label="Watch" color="warning" variant="faded" onClick={watchLogs}>
                                    <RefreshIcon />
                                </Button>
                            </div>
                            <Divider className="my-4" />
                            <div className="p-4 rounded-md max-h-[60vh] overflow-y-auto bg-neutral-100 dark:bg-neutral-800 font-mono text-sm whitespace-pre-wrap">
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
                                    <p className="dark:text-gray-400 text-sm">Commit Hash: {build.commit_hash}</p>
                                    <p className="dark:text-gray-400 text-sm">Commit Message: {build.commit_message}</p>
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
                                value={projectSettings.port}
                                onChange={(e) => setProjectSettings((prev) => ({ ...prev, port: e.target.value }))}
                                placeholder="3000"
                                name="port"
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
                            </div>

                            <div className="flex gap-4">
                                <Button variant="light" type="button" onClick={() => setActiveSection('overview')}>Cancel</Button>
                                <Button color="primary" type="submit" isLoading={isUpdating} disabled={isUpdating}>
                                    Update
                                </Button>
                            </div>
                        </form>
                    </section>
                )}
            </main>
        </div>
    )
}

export default ManageProjectsPage