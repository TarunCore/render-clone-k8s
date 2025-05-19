"use client"
import api from '@/components/axios'
import React, { useEffect, useState } from 'react'
import { Link } from '@heroui/link';
import { useRouter } from 'next/navigation';
import { Deployment } from '@/types/deploymentTypes';
import { Button } from '@heroui/button';
import {  Modal,  ModalContent,  ModalHeader,  ModalBody,  ModalFooter} from "@heroui/modal";


const DeploymentsPage = () => {
    const router = useRouter();
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    async function fetchData() {
        try {
            const response = await api.get('/deployments');
            if (response.status === 200) {
                setDeployments(response.data.data);
            }
            console.log(response.data);
        } catch (err) {

        }
    }

    useEffect(() => {
        fetchData();
    }, [])


    return (
        // <div className='flex'>
        <div>
            <div className='flex justify-between items-center'>
            <h1 className="text-2xl font-bold">Deployments</h1>
            <Button variant='flat' color='primary'>Create</Button>
            </div>
            {deployments.map((deployment) => {
                return (
                    <div onClick={()=>router.push("/deployments/"+deployment.id)} key={deployment.id + "dep"} className='border-1 hover:shadow-md border-gray-600 cursor-pointer rounded-2xl p-4 my-2 bg-neutral-800 hover:bg-neutral-900 animation duration-100'>
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

export default DeploymentsPage