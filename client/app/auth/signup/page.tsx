"use client"
"use client";

import * as React from "react";
import { Form } from "@heroui/form";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import * as Yup from "yup";
import Link from "next/link";
import api from "@/components/axios";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";
import Image from "next/image";
import { FRONTEND_URL } from "@/config/constants";
interface LoginFormValues {
  username: string;
  email: string;
  password: string;
}

interface LoginFormErrors {
  [key: string]: string | string[];
}

const validationSchema = Yup.object().shape({
  username: Yup.string()
    .required("Please enter your username")
    .notOneOf(["admin"], "Nice try! Choose a different username"),
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Please enter your email"),
  password: Yup.string()
    .required("Please enter your password")
    .min(4, "Password must be 4 characters or more")
});

export default function SignupPage() {
  const [formValues, setFormValues] = React.useState<LoginFormValues>({
    username: "test",
    email: "test@test.com",
    password: "test",
  });
  const [errors, setErrors] = React.useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter();
  const handleInputChange = (name: keyof LoginFormValues, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    try {
      const dataToValidate = { ...formValues };
      await validationSchema.validate(dataToValidate, { abortEarly: false });
      setErrors({});

      const response = await api.post('/users/signup', {
        username: formValues.username,
        email: formValues.email,
        password: formValues.password,
        provider: 'custom'
      });
      if(response.status === 201){ // 201 Created
          router.push('/auth/login');
      }
      // Here you would handle the actual login logic (API call, etc.)
    } catch (validationError: any) {
      const formattedErrors: LoginFormErrors = {};
      addToast({
        title: "Signup failed",
        description: "Please check your username and password",
        variant: "flat",
        color: "danger",
      });
      if (validationError.inner) {
        validationError.inner.forEach((err: any) => {
          if (err.path) {
            formattedErrors[err.path as keyof LoginFormErrors] = err.message || "";
          }
        });
      }
      setErrors(formattedErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onReset = () => {
    setFormValues({ username: "", email: "", password: "" });
    setErrors({});
  };

  const handleGithubLogin = async () => {
    const clientID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientID) {
      addToast({
        title: "Login failed",
        description: "GitHub client ID is not set",
        variant: "flat",
        color: "danger",
      });
      return;
    }
    const redirectURI = `${FRONTEND_URL}/auth/github/callback`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&scope=user:email`;
  };

  return (
    <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 p-8 rounded-lg shadow-md dark:bg-neutral-900">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight dark:text-white">
            Create an account
          </h2>
        </div>
        <Form
          className="space-y-8"
          validationErrors={errors}
          onReset={onReset}
          onSubmit={onSubmit}
        >
          <Input
            isRequired
            errorMessage={errors.username}
            label="Username"
            labelPlacement="outside"
            name="username"
            placeholder="Enter your username"
            value={formValues.username}
            onValueChange={(val) => handleInputChange("username", val)}
            autoComplete="username"
          />

          <Input
            isRequired
            errorMessage={errors.email}
            label="Email"
            labelPlacement="outside"
            name="email"
            placeholder="Enter your email"
            type="email"
            value={formValues.email}
            onValueChange={(val) => handleInputChange("email", val)}
            autoComplete="email"
          />

          <Input
            isRequired
            errorMessage={errors.password}
            isInvalid={!!errors.password}
            label="Password"
            labelPlacement="outside"
            name="password"
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            value={formValues.password}
            onValueChange={(val) => handleInputChange("password", val)}
            autoComplete="current-password"
            endContent={
              <button
                type="button"
                tabIndex={-1}
                className="text-xs text-gray-300 hover:text-gray-500 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />

          <div className="flex items-center justify-between w-full">
            <p className="text-sm dark:text-white">{"Already have an account?"}</p>
            <Link href="/auth/login" className="text-sm text-primary-600 hover:underline">
              Sign in
            </Link>
          </div>

          <Button
            className="w-full"
            color="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Sign up
          </Button>
          <Button
            className="w-full bg-[#24292e] hover:bg-[#1a1e22] text-white border-0 flex items-center justify-center gap-3 py-6 transition-colors duration-200"
            type="button"
            onPress={handleGithubLogin}
          >
            <Image
              src="/icons/github.svg"
              alt="GitHub"
              width={20}
              height={20}
              className="invert"
            />
            <span className="font-medium">Login/Signup with GitHub</span>
          </Button>
        </Form>
      </div>
    </div>
  );
}
