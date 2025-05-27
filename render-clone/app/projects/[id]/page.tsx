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
const convert = new AnsiToHtml();
// const ws = new WebSocket('ws://localhost:3001/');

const ManageProjectsPage = () => {
    const params = useParams<{ id: string }>()
    const [selectedBranch, setSelectedBranch] = useState("");
    const [deployment, setProjects] = useState<Projects | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [htmlLogs, setHtmlLogs] = useState<string>("");
    const [commits, setCommits] = useState<string[]>([]);
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedCommit, setSelectedCommit] = useState<string>("");
    const [builds, setBuilds] = useState<any[]>([]);
    async function fetchData() {
        try {
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
    }, [deployment]);

    
    useEffect(() => {
        //curl -H "Accept: application/vnd.github+json" https://api.github.com/repos/octocat/Spoon-Knife/commits?per_page=5
        // simulate fake logs for now ; TODO: stream using websockets
        // const interval = setInterval(() => {
        //     setLogs((prevLogs) => [`Log ${prevLogs.length + 1}`, ...prevLogs]);
        // }, 6000);
        // return () => clearInterval(interval);
    }, [])
    useEffect(() => {
        if (!params.id) return;

        const ws = new WebSocket('ws://localhost:8080/');

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'frontend-subscribe', deploymentId: params.id }));
        };

        ws.onmessage = (event) => {
            const message = event.data;
            const htmlLogs = convert.toHtml(message);
            setHtmlLogs(htmlLogs);
            setLogs(prev => [...prev, htmlLogs]); // prepend new log to the top
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
    const pullAndDeploy = async () => {
        try {
            const response = await api.post('/builds/create/v2', {
                project_id: params.id,
                github_url: github_url,
                to_deploy_commit_hash: selectedCommit,
                branch: selectedBranch, // TODO: add support for other branches
                project_type: "nodejs"
            });
            if (response.status === 200) {
                console.log("Pull and deploy started");
            }
        } catch (err) {
            
        }
    }

    return (

        <div className='flex'>
            <div className=' w-[30%]'>
                <h1 className="text-2xl font-bold">Status</h1>
                <Divider className='my-4' />
                <div className='flex flex-col gap-1'>
                    <h2 className="text-md">{"Name: " + deployment?.name}</h2>
                    <p className="text-gray-400 text-sm">{"Projects ID: " + params.id}</p>
                    {description && <p className="text-gray-400 text-sm">{"Description: " + description}</p>}
                    {status && (
                        <>
                            <p className={status === "pending" ? "text-red-400" : "text-green-500"}>
                                {status}
                            </p>
                        </>
                    )}
                    <p className="text-gray-400 text-sm">
                        Last Deployed: {last_deployed_hash || "N/A"}
                    </p>
                    <p className="text-gray-400 text-sm">
                        Last Deployed Time: {last_deployed_at ? new Date(last_deployed_at).toDateString() : "N/A"}
                    </p>
                    <Divider className='my-4' />
                    <h1 className="text-xl font-bold">{"Builds " + (builds.length == 0 ? "" : `(${builds.length})`)}</h1>
                    {/* hide scroll bar */}
                    <div className='flex flex-col gap-2 overflow-y-auto max-h-[40vh] scrollbar-hide'>
                        {builds.length === 0 && <p className="text-gray-400 text-sm">No builds found</p>}
                        {builds.map((build) => {
                            return <div className='flex flex-col gap-1 border-blue-300 border-2 p-2 rounded-md' key={build.id}>
                                <p className="text-gray-300 text-sm">{"Build ID: " + build.id}</p>
                                <p className="text-gray-400 text-sm">{"Commit Hash: " + build.commit_hash}</p>
                                <p className="text-gray-400 text-sm">{"Commit Message: " + build.commit_message}</p>
                                <p className="text-gray-400 text-sm">{"Build Started At: " + new Date(build.build_started_at).toLocaleTimeString()+ " "+new Date(build.build_started_at).toLocaleDateString()}</p>
                                <p className="text-gray-400 text-sm">{"Status: " + build.status}</p>
                                <p className="text-gray-400 text-sm">{"Status Message: " + build.status_message}</p>
                            </div>
                        })
                        }
                    </div>
                </div>
            </div>
            <div className='w-[70%]'>
                <h2 className="text-2xl font-bold">{"Manage Project"}</h2>
                {/* <Divider className='my-4' /> */}
                <Link className='text-sm' target='_blank' href={github_url}>{github_url}</Link>
                <form className="mt-4 flex flex-wrap gap-2">
                    <Select className="max-w-xs" label="Select Branch" isRequired defaultSelectedKeys={[]} onChange={(e) => { setSelectedBranch(e.target.value) }}>
                        {branches.map((branch) => (
                            <SelectItem key={branch}>{branch}</SelectItem>
                        ))}
                    </Select>
                    <Select className="max-w-xs" label="Select Commit" isRequired defaultSelectedKeys={[]} onChange={(e) => { setSelectedCommit(e.target.value) }}>
                        {commits.map((commit) => (
                            <SelectItem key={commit}>{commit}</SelectItem>
                        ))}
                    </Select>
                    <div className="mt-4">
                        <Button type='submit' variant='flat' color='success' startContent={PullIcon()} onClick={pullAndDeploy}>Pull and Deploy</Button>
                    </div>
                </form>
                <div className=''>
                    <div className='flex items-center gap-2 mt-8'>
                        <h2 className="text-2xl font-bold">Logs</h2>
                        <Button isIconOnly aria-label="Watch" color="warning" variant="faded" onClick={watchLogs}>
                            <EyeIcon />
                        </Button>
                    </div>
                    <Divider className='my-4' />
                    <div className=' p-4 rounded-md max-h-[42vh] overflow-y-auto'>
                        {logs.map((log, index) => {
                            return (
                                <div key={index + "logg"} dangerouslySetInnerHTML={{ __html: log }} />
                                // <p key={index} className='text-sm text-gray-100'>{log}</p>
                            )
                        })}
                        <Spinner />

                    </div>
                </div>
            </div>
        </div>
    )
}

export default ManageProjectsPage