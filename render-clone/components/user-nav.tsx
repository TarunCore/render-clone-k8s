"use client";
import { useState } from "react";
import { useEffect } from "react";
import api from "./axios";
import { NavbarItem } from "@heroui/navbar";
import { Button } from "@heroui/button";
import LogoutIcon from "./icons/LogoutIcon";

const UserNav = () => {
    const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await api.get("/users/me");
        if (response.status === 200 && response.data) {
          setUsername(response.data.username || response.data.email || null);
        }
      } catch (err) {
        setUsername(null);
      }
    }
    fetchUser();
  }, []);
    return (
        <>

        {username && (
          <>
          <NavbarItem className="flex items-center px-2 text-sm font-medium text-default-700">
            {username}
          </NavbarItem>
        
        <Button isIconOnly aria-label="Logout" color="danger" variant="faded" onClick={() => {
            api.post("/users/logout").then((res) => {
                if (res.status === 200) {
                    window.location.href = "/";
                }
            });
        }}>
            <LogoutIcon />
        </Button>
        </>
        )}
        </>
    )
}

export default UserNav;