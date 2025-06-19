"use client"

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

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

interface LoginFormErrors {
  [key: string]: string | string[];
}

const validationSchema = Yup.object().shape({
  username: Yup.string()
    .required("Please enter your username")
    .notOneOf(["admin"], "Nice try! Choose a different username"),
  password: Yup.string()
    .required("Please enter your password")
    .min(4, "Password must be 4 characters or more")
  // terms: Yup.string().oneOf(["true"], "Please accept the terms"),
});

export default function LoginPage() {
  const [formValues, setFormValues] = React.useState<LoginFormValues>({
    username: "test",
    password: "test",
    remember: false,
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
    } catch (validationError: any) {
      const formattedErrors: LoginFormErrors = {};
      if (validationError.inner) {
        validationError.inner.forEach((err: any) => {
          if (err.path) {
            formattedErrors[err.path as keyof LoginFormErrors] = err.message || "";
          }
        });
      }
      setErrors(formattedErrors);
    }
    try {
      const response = await api.post('/users/login', {
        username: formValues.username,
        email: formValues.username,
        password: formValues.password
      });
      if (response.status === 200) {
        window.location.href = "/projects";
      }
    } catch (error) {
      addToast({
        title: "Login failed",
        description: "Please check your username and password",
        variant: "flat",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onReset = () => {
    setFormValues({ username: "", password: "", remember: false });
    setErrors({});
  };

  return (

    <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 p-8 rounded-lg shadow-md dark:bg-neutral-900">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight dark:text-white">
            Sign in to your account
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
            label="Username or Email"
            labelPlacement="outside"
            name="username"
            placeholder="Enter your username or email"
            value={formValues.username}
            onValueChange={(val) => handleInputChange("username", val)}
            autoComplete="username"
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
                className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />

          <div className="flex items-center justify-between w-full">
            <p className="text-sm dark:text-white">{"Don't have an account?"}</p>
            <Link href="/auth/signup" className="text-sm dark:text-primary-600 hover:underline">
              Create an account
            </Link>
          </div>

          <Button
            className="w-full"
            color="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Sign in
          </Button>
        </Form>

      </div>
    </div>
  );
}
