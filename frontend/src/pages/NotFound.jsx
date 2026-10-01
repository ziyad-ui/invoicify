import React from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button.jsx";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface text-center">
      <p className="text-5xl font-bold text-ink">404</p>
      <p className="text-sm text-gray-500">This page doesn't exist.</p>
      <Link to="/login">
        <Button variant="outline" className="mt-2">
          Back to login
        </Button>
      </Link>
    </div>
  );
}
