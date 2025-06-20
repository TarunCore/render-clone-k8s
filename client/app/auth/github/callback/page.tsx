"use client"

import api from '@/components/axios';
import { useEffect } from 'react';
import { addToast } from '@heroui/toast';
import { Spinner } from '@heroui/spinner';

function GitHubCallback() {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            api.post('/users/login', { code, mode: 'github' })
                .then(response => {
                    window.location.href = "/projects";
                    addToast({ 
                        title: "Login successful",
                        description: response.data.message,
                        variant: "flat",
                        color: "success",
                    });
                })
                .catch((error) => {
                    console.error("Error during GitHub OAuth callback:", error);
                    addToast({
                        title: "Login failed",
                        description: "Please try again",
                        variant: "flat",
                        color: "danger",
                    });
                });
            // Send code to backend
            // fetch('http://localhost:5000/auth/github/callback', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ code }),
            // })
            // .then(response => response.json())
            // .then(data => {
            //     // Handle the response from your backend. Maybe store an authentication token or set user data.
            // });
        }
    }, []);

    return <>

     <div >Processing GitHub login...</div>
     <Spinner />

    </>
}
export default GitHubCallback;