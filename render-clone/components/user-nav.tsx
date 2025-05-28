"use client";
import { useState, useEffect } from "react";
import api from "./axios";
import { NavbarItem } from "@heroui/navbar";
import { Button } from "@heroui/button";
import LogoutIcon from "./icons/LogoutIcon";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";

export function useUser() {
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
  return { username };
}

const UserNav = () => {
    const { username } = useUser();
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
        {
          !username && (
            <NavbarItem>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium",
                )}
                color="foreground"
                href={"/auth/login"}
              >
                Login
              </NextLink>
            </NavbarItem>
          )
        }
        </>
    )
}

export default UserNav;