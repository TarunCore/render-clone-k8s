"use client"
import api from '@/components/axios'
import React, { useEffect, useState } from 'react'
import { Link } from '@heroui/link';
import { useRouter } from 'next/navigation';
import { Projects } from '@/types/projectTypes';
import { Button } from '@heroui/button';
import {  Modal,  ModalContent,  ModalHeader,  ModalBody,  ModalFooter} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";


const ProjectsPage = () => {
    const router = useRouter();
    const [projects, setProjects] = useState<Projects[]>([]);
    // Modal and form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [description, setDescription] = useState("");
    const [githubUrl, setGithubUrl] = useState("");
    const [projectType, setProjectType] = useState("nodejs");
    const [subdomain, setSubdomain] = useState("");
    async function fetchData() {
        try {
            const response = await api.get('/projects');
            if (response.status === 200) {
                setProjects(response.data.data);
            }
            console.log(response.data);
        } catch (err) {

        }
    }

    useEffect(() => {
        fetchData();
    }, [])

    // Optional: handle form submit
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Add API call to create deployment
        try{
            const response = await api.post('/projects', {
                name: projectName,
                description: description,
                github_url: githubUrl,
                project_type: projectType,
                subdomain: subdomain
            });
            if(response.status === 200){
                setIsModalOpen(false);
                fetchData();
            }
        }catch(e){
            console.log(e);
        }
    };

    return (
        // <div className='flex'>
        <div>
            <div className='flex justify-between items-center'>
            <h1 className="text-2xl font-bold">Projects</h1>
            <Button variant='flat' color='primary' onClick={() => setIsModalOpen(true)}>Create</Button>
            </div>
            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen} placement="center">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">Create New Project</ModalHeader>
                    <form onSubmit={handleCreate}>
                        <ModalBody>
                            <div className="flex flex-col gap-4">
                                <Input
                                    isRequired
                                    label="Project Name"
                                    value={projectName}
                                    onChange={e => setProjectName(e.target.value)}
                                    placeholder="Enter project name"
                                    name="projectName"
                                />
                                <Input
                                    isRequired
                                    label="Description"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Enter description"
                                    name="description"
                                />
                                <Input
                                    isRequired
                                    label="GitHub URL"
                                    value={githubUrl}
                                    onChange={e => setGithubUrl(e.target.value)}
                                    placeholder="https://github.com/username/repo"
                                    name="githubUrl"
                                />
                                <Input
                                    isRequired
                                    label="Subdomain"
                                    value={subdomain}
                                    onChange={e => setSubdomain(e.target.value)}
                                    placeholder="Enter subdomain"
                                    name="subdomain"
                                />
                                {/* Project Type selection as clickable icons */}
                                <div className="flex gap-4 items-center mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setProjectType('nodejs')}
                                        className={`border-2 rounded-lg p-1 ${projectType === 'nodejs' ? 'border-blue-500' : 'border-transparent'}`}
                                        aria-label="Node.js"
                                    >
                                        <img src="/icons/nodejs.svg" height="48" width="48" alt="Node.js logo" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProjectType('python')}
                                        className={`border-2 rounded-lg p-1 ${projectType === 'python' ? 'border-blue-500' : 'border-transparent'}`}
                                        aria-label="Python"
                                    >
                                        <img src="/icons/python.svg" height="48" width="48" alt="Python logo" />
                                    </button>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
                            <Button color="primary" type="submit">Create</Button>
                        </ModalFooter>
                    </form>
                </ModalContent>
            </Modal>
            {projects.map((deployment) => {
                return (
                    <div onClick={()=>router.push("/projects/"+deployment.id)} key={deployment.id + "dep"} className='border-1 hover:shadow-md border-gray-600 cursor-pointer rounded-2xl p-4 my-2 bg-neutral-800 hover:bg-neutral-900 animation duration-100'>
                        <h2 className="font-bold">{deployment.name}</h2>
                        <div className='flex justify-between'>
                            <div>
                                <p className="text-gray-400 text-sm">{deployment.description}</p>
                                <Link className='text-sm' href={deployment.github_url}>{deployment.github_url}</Link>
                            </div>

                            <p className={deployment.status == "pending" ? "text-red-400" : "text-green-500"}>{deployment.status}</p>
                        </div>
                    </div>
                )
            })}
        </div>
        // </div>
    )
}

export default ProjectsPage