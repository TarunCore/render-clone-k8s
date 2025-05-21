"use client"
import api from '@/components/axios'
import { Deployment } from '@/types/deploymentTypes';
import { Button } from '@heroui/button';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { Divider } from "@heroui/divider";
import PullIcon from '@/components/icons/PullIcon';
import { Link } from '@heroui/link';
import { Select, SelectSection, SelectItem } from "@heroui/select";
import {Spinner} from "@heroui/spinner";
const branches = [
    { key: "main", label: "main" },
    { key: "master", label: "master" },
]
import AnsiToHtml from 'ansi-to-html';
const convert = new AnsiToHtml();
// const ws = new WebSocket('ws://localhost:3001/');

const ManageDeploymentsPage = () => {
    const params = useParams<{ id: string }>()
    const [selectedBranch, setSelectedBranch] = useState("main");
    const [deployment, setDeployment] = useState<Deployment | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [htmlLogs, setHtmlLogs] = useState<string>("");
    const [commits, setCommits] = useState<string[]>([]);
    const [selectedCommit, setSelectedCommit] = useState<string>("");
    async function fetchData() {
        try {
            const response = await api.get('/deployments/' + params.id);
            if (response.status === 200) {
                setDeployment(response.data.data);
            }
            console.log(response.data);
        } catch (err) {

        }
    }
    async function fetchCommits() {
        // extract the repo name from the github_url
        const github_url = deployment?.github_url;
        if (!github_url) return;
        const repoName = github_url.split('/').slice(-2).join('/');
        // const repoUrl = github_url.replace(/\.git$/, '');
        // const repoPath = repoUrl.split('/').pop();
        // const repoOwner = repoUrl.split('/').slice(-2)[0];
        // const repo = repoUrl.split('/').slice(-2).join('/');
        // console.log(repoName, repoPath, repoOwner, repo);
        const response = await fetch(`https://api.github.com/repos/${repoName}/commits?per_page=5`, {
            headers: {
              "Accept": "application/vnd.github+json"
            }
          });
          
        const data = await response.json();
        if (response.status !== 200) {
            console.log("Error fetching commits");
            return;
        }
        const commitHashes = data.map((commit: any) => commit.sha);
        setCommits(commitHashes)
        console.log(commitHashes);
    }
    useEffect(() => {
        fetchData();
    }, [])
    const { description, status, last_deployed_hash, last_deployed_at, github_url } = deployment || {};
    useEffect(() => {
        fetchCommits();
    }
    , [deployment])
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
    return (

        <div className='flex'>
            <div className=' w-[30%]'>
                <h1 className="text-2xl font-bold">Status</h1>
                <Divider className='my-4' />
                <div className='flex flex-col gap-1'>
                    <h2 className="text-md">{"Name: " + deployment?.name}</h2>
                    <p className="text-gray-400 text-sm">{"Deployment ID: " + params.id}</p>
                    {description && <p className="text-gray-400 text-sm">{"Description: " + description}</p>}
                    <Divider className='my-4' />
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
                </div>
            </div>
            <div className='w-[70%]'>
                <h2 className="text-2xl font-bold">{"Manage Deployment"}</h2>
                {/* <Divider className='my-4' /> */}
                <Link className='text-sm' target='_blank' href={github_url}>{github_url}</Link>
                <form className="mt-4 flex flex-wrap gap-2">
                    <Select className="max-w-xs" label="Select Branch" isRequired defaultSelectedKeys={["main"]} onChange={(e) => { setSelectedBranch(e.target.value) }}>
                        {branches.map((branch) => (
                            <SelectItem key={branch.key}>{branch.label}</SelectItem>
                        ))}
                    </Select>
                    <Select className="max-w-xs" label="Select Commit" isRequired defaultSelectedKeys={[]} onChange={(e) => { setSelectedCommit(e.target.value) }}>
                        {commits.map((commit) => (
                            <SelectItem key={commit}>{commit.substring(0,10)}</SelectItem>
                        ))}
                    </Select>
                    <div className="mt-4">
                        <Button type='submit' variant='flat' color='success' startContent={PullIcon()}>Pull and Deploy</Button>
                    </div>
                </form>
                <div className=''>
                    <h2 className="text-2xl font-bold mt-8">Logs</h2>
                    <Divider className='my-4' />
                    <div className=' p-4 rounded-md max-h-[30vh] overflow-y-auto'>
                        {logs.map((log, index) =>{
                            return (
                                <div key={index+"logg"} dangerouslySetInnerHTML={{ __html: log }} />
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

export default ManageDeploymentsPage