"use client";
import api from "@/components/axios";
import React, { useEffect, useState } from "react";
import { Link } from "@heroui/link";
import { useRouter } from "next/navigation";
import { Projects } from "@/types/projectTypes";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { convertToProperCase } from "@/utils/commonUtils";

const projectTypes = [
  { type: "nodejs", label: "Node.js", icon: "nodejs.svg" },
  { type: "python", label: "Python", icon: "python.svg" },
  { type: "go", label: "Go", icon: "go.svg" },
];

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
      const response = await api.get("/projects");
      if (response.status === 200) {
        setProjects(response.data.data);
      }
      console.log(response.data);
    } catch (err) { }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Optional: handle form submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/projects", {
        name: projectName,
        description: description,
        github_url: githubUrl,
        project_type: projectType,
        subdomain: subdomain,
      });
      if (response.status === 200) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    // <div className='flex'>
    // Originaly Layout had pt-16 and max-w-7xl mx-auto
    <div className="max-w-6xl pt-12 mx-auto">
      <div className="flex justify-between items-center pb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button
          variant="solid"
          color="primary"
          onPress={() => setIsModalOpen(true)}
        >
          Create
        </Button>
      </div>
      <Modal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        placement="center"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Create New Project
          </ModalHeader>
          <form onSubmit={handleCreate}>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  label="Project Name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  name="projectName"
                />
                {/* <Input
                  isRequired
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  name="description"
                /> */}
                <Input
                  isRequired
                  label="GitHub URL"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  name="githubUrl"
                />
                <Input
                  isRequired
                  label="Subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="Enter subdomain"
                  name="subdomain"
                />
                {/* Project Type selection as clickable icons */}
                <div className="flex gap-4 items-center mt-2">
                  {projectTypes.map((type) => {
                    return (
                      <button
                        type="button"
                        key={type.type}
                        onClick={() => setProjectType(type.type)}
                        className={`border-2 rounded-lg p-1 ${projectType === type.type ? "border-blue-500" : "border-transparent"}`}
                        aria-label={type.label}
                      >
                        <img
                          src={`/icons/${type.icon}`}
                          height="48"
                          width="48"
                          alt={`${type.label} logo`}
                        />
                      </button>
                    );
                  })}
                  {/* <button
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
                                    </button> */}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setIsModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button color="primary" type="submit">
                Create
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
      {projects.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-800 dark:text-gray-400">
            No projects found. Create a new project to get started.
          </p>
        </div>
      )}

      {projects.map((deployment) => {
        return (
          <div
            onClick={() => router.push("/projects/" + deployment.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                router.push("/projects/" + deployment.id);
              }
            }}
            role="button"
            tabIndex={0}
            key={deployment.id + "dep"}
            className="border-1 hover:shadow-md border-gray-600 cursor-pointer rounded-2xl p-4 my-2 dark:bg-neutral-800 dark:hover:bg-neutral-900 animation duration-100"
          >
            <div className="flex items-center gap-2">
              <h2 className="font-bold">{deployment.name}</h2>
              <img src={`/icons/${deployment.project_type}.svg`} alt={deployment.project_type} className="w-4 h-4" />
            </div>
            <div className="flex justify-between">
              <div>
                <p className="dark:text-gray-400 text-sm">
                  {deployment.description}
                </p>
                <Link className="text-sm inline-flex items-center gap-1" href={deployment.github_url} target="_blank">
                  {deployment.github_url}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.5 3C3.22386 3 3 2.77614 3 2.5C3 2.22386 3.22386 2 3.5 2H9.5C9.77614 2 10 2.22386 10 2.5V8.5C10 8.77614 9.77614 9 9.5 9C9.22386 9 9 8.77614 9 8.5V3.70711L2.85355 9.85355C2.65829 10.0488 2.34171 10.0488 2.14645 9.85355C1.95118 9.65829 1.95118 9.34171 2.14645 9.14645L8.29289 3H3.5Z" fill="currentColor" />
                  </svg>
                </Link>
              </div>

              <p
                className={
                  deployment.status === "running" ? "text-green-500" : "text-red-600"
                }
              >
                {convertToProperCase(deployment.status)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
    // </div>
  );
};

export default ProjectsPage;
