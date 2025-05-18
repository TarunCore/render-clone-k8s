"use client"
"use client";

import * as React from "react";
import { Form } from "@heroui/form";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("Please enter your name")
    .notOneOf(["admin"], "Nice try! Choose a different username"),
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Please enter your email"),
  password: Yup.string()
    .required("Please enter your password")
    .min(4, "Password must be 4 characters or more")
    .matches(/[A-Z]/, "Password needs at least 1 uppercase letter")
    .matches(/[^a-zA-Z0-9]/, "Password needs at least 1 symbol"),
  country: Yup.string().required("Please select a country"),
  terms: Yup.string().oneOf(["true"], "Please accept the terms"),
});

export default function LoginPage() {
  const [password, setPassword] = React.useState("");
  const [submitted, setSubmitted] = React.useState(null);
  const [errors, setErrors] = React.useState({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      await validationSchema.validate(data, { abortEarly: false });
      setErrors({});
      setSubmitted(data);
    } catch (validationError: any) {
      const formattedErrors: Record<string, string> = {};
      validationError.inner.forEach((err: any) => {
        if (err.path) {
          formattedErrors[err.path] = err.message;
        }
      });
      setErrors(formattedErrors);
    }
  };

  return (
    <Form
      className="w-full justify-center items-center space-y-4"
      validationErrors={errors}
      onReset={() => setSubmitted(null)}
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-4 max-w-md">
        <Input
          isRequired
          errorMessage={errors.name}
          label="Name"
          labelPlacement="outside"
          name="name"
          placeholder="Enter your name"
        />

        <Input
          isRequired
          errorMessage={errors.email}
          label="Email"
          labelPlacement="outside"
          name="email"
          placeholder="Enter your email"
          type="email"
        />

        <Input
          isRequired
          errorMessage={errors.password}
          isInvalid={!!errors.password}
          label="Password"
          labelPlacement="outside"
          name="password"
          placeholder="Enter your password"
          type="password"
          value={password}
          onValueChange={setPassword}
        />

        <Checkbox
          isRequired
          classNames={{ label: "text-small" }}
          isInvalid={!!errors.terms}
          name="terms"
          validationBehavior="aria"
          value="true"
          onValueChange={() => setErrors((prev) => ({ ...prev, terms: undefined }))}
        >
          I agree to the terms and conditions
        </Checkbox>

        {errors.terms && <span className="text-danger text-small">{errors.terms}</span>}

        <div className="flex gap-4">
          <Button className="w-full" color="primary" type="submit">
            Submit
          </Button>
          <Button type="reset" variant="bordered">
            Reset
          </Button>
        </div>
      </div>

      {submitted && (
        <div className="text-small text-default-500 mt-4">
          Submitted data: <pre>{JSON.stringify(submitted, null, 2)}</pre>
        </div>
      )}
    </Form>
  );
}
