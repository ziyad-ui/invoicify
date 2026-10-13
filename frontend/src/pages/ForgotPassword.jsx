import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import Button from "../components/Button.jsx";
import FormField from "../components/FormField.jsx";
import { IconCheck } from "../components/icons.jsx";
import { authApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const COOLDOWN = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send(e) {
    e?.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter the email address of your account.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
      setCooldown(COOLDOWN);
    } catch (err) {
      const { status, message, fields } = parseApiError(err);
      setError(status === 429 ? "Too many attempts. Please wait a minute and try again." : fields.email || message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-okBg text-status-okText">
          <IconCheck width={24} height={24} />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          If an account exists for <strong className="text-ink">{email.trim()}</strong>, we've sent a link to reset your
          password. It expires in 60 minutes.
        </p>
        <p className="mt-4 text-xs text-gray-400">Nothing in your inbox? Check your spam folder.</p>

        <div className="mt-8 space-y-3">
          <Button variant="outline" className="w-full" disabled={cooldown > 0} loading={sending} onClick={send}>
            {cooldown > 0 ? `Send again in ${cooldown}s` : "Send the email again"}
          </Button>
          <Link to="/login" className="block text-center text-sm font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Forgot your password?</h1>
      <p className="mt-1.5 text-sm text-gray-500">
        Enter the email address of your account and we'll send you a link to choose a new password.
      </p>

      <form onSubmit={send} className="mt-8 space-y-5" noValidate>
        <FormField
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" size="lg" className="w-full" loading={sending}>
          Send reset link
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500">
        Remembered it?{" "}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
