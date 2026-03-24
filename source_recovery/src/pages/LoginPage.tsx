import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "../api/client";

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await client.auth.getSession();
        if (session.data?.user) {
          navigate("/admin", { replace: true });
          return;
        }
      } catch {}
      setChecking(false);
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (checking || rendered.current || !containerRef.current) return;
    rendered.current = true;
    client.auth.renderAuthUI(containerRef.current, {
      redirectTo: "/admin",
      labels: {
        signIn: {
          title: "管理員登入",
          loginButton: "登入",
          emailPlaceholder: "電郵地址",
          passwordPlaceholder: "密碼",
          forgotPasswordLink: "忘記密碼？",
          signUpLink: "註冊新帳號",
        },
        signUp: {
          title: "註冊帳號",
          signUpButton: "註冊",
          namePlaceholder: "姓名",
          emailPlaceholder: "電郵地址",
          passwordPlaceholder: "密碼",
          signInLink: "已有帳號？登入",
        },
      },
    });
  }, [checking]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <svg className="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-[420px] min-w-[320px]" ref={containerRef} />
    </div>
  );
}
