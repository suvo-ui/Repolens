import { AtSign, LoaderCircle, Lock, ScanSearch, User } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";
import type { LoginRequest, RegisterRequest } from "../types/auth";

type AuthMode = "login" | "register";

interface AuthScreenProps {
  initialMode?: AuthMode;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validate(values: {
  name: string;
  email: string;
  password: string;
  mode: AuthMode;
}): FormErrors {
  const errors: FormErrors = {};
  const email = values.email.trim();
  const password = values.password;

  if (values.mode === "register") {
    const name = values.name.trim();
    if (!name) {
      errors.name = "Your name is required.";
    } else if (name.length > 100) {
      errors.name = "Your name must be 100 characters or fewer.";
    }
  }

  if (!email) {
    errors.email = "An email address is required.";
  } else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, like you@example.com.";
  }

  if (!password) {
    errors.password = "A password is required.";
  } else if (
    values.mode === "register" &&
    password.length < MIN_PASSWORD_LENGTH
  ) {
    errors.password = `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (password.length > 128) {
    errors.password = "Passwords must be 128 characters or fewer.";
  }

  return errors;
}

export function AuthScreen({ initialMode = "login" }: AuthScreenProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const errors = validate({ ...values, mode });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        const request: RegisterRequest = {
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        };
        await register(request);
      } else {
        const request: LoginRequest = {
          email: values.email.trim(),
          password: values.password,
        };
        await login(request);
      }
      // Successful login/register flips the auth state; the app renders.
    } catch (requestError) {
      setServerError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const description =
    mode === "login"
      ? "Sign in to run analyses and revisit your repository briefs."
      : "Sign up to turn any GitHub repository into an engineering brief.";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full border-[36px] border-coral/15" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[-7rem] size-80 rounded-full bg-lime/35 blur-3xl" />

      <section className="relative w-full max-w-md animate-rise">
        <div className="mb-8 flex flex-col items-center gap-4">
          <BrandMark />
          <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
            <ScanSearch size={14} className="text-coral" />
            AI-powered repository intelligence
          </div>
        </div>

        <div className="border border-ink/10 bg-white p-7 shadow-[12px_16px_0_rgba(32,36,31,0.12)] sm:p-9">
          <div className="mb-6 flex rounded-xl border border-ink/10 bg-paper p-1 text-sm font-bold">
            {(["login", "register"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  setFieldErrors({});
                  setServerError(null);
                  // Keep the URL in sync so a refresh reopens the same mode.
                  window.history.replaceState({}, "", `/${option}`);
                }}
                disabled={isSubmitting}
                className={`flex-1 rounded-lg px-3 py-2 transition ${
                  mode === option
                    ? "bg-ink text-white"
                    : "text-muted hover:text-ink"
                }`}
              >
                {option === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-3xl font-bold tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            {mode === "register" && (
              <Field
                id="auth-name"
                label="Name"
                icon={<User size={17} />}
                value={values.name}
                onChange={(value) => updateField("name", value)}
                placeholder="Ada Lovelace"
                error={fieldErrors.name}
                autoComplete="name"
                disabled={isSubmitting}
              />
            )}
            <Field
              id="auth-email"
              label="Email"
              icon={<AtSign size={17} />}
              value={values.email}
              onChange={(value) => updateField("email", value)}
              placeholder="you@example.com"
              type="email"
              error={fieldErrors.email}
              autoComplete="email"
              disabled={isSubmitting}
            />
            <Field
              id="auth-password"
              label="Password"
              icon={<Lock size={17} />}
              value={values.password}
              onChange={(value) => updateField("password", value)}
              placeholder={
                mode === "register"
                  ? `At least ${MIN_PASSWORD_LENGTH} characters`
                  : "Your password"
              }
              type="password"
              error={fieldErrors.password}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              disabled={isSubmitting}
            />

            {serverError && (
              <p
                className="rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm font-medium text-coral"
                role="alert"
              >
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-bold text-white transition hover:bg-coral disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs font-semibold text-muted">
          Sessions are cookie-based. Your password is never stored in the
          browser.
        </p>
      </section>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  autoComplete,
  disabled,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          {icon}
        </span>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={`h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:ring-4 focus:ring-coral/10 ${
            error
              ? "border-coral focus:border-coral"
              : "border-ink/15 focus:border-coral"
          }`}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold text-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
