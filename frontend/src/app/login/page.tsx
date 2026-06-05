'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface LoginForm {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', values);
      setAuth(data.user, data.access_token);
      router.push('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as { message?: string | string[] } | undefined)
            ?.message;
        setServerError(
          Array.isArray(message)
            ? message.join(', ')
            : message ?? 'Invalid email or password.',
        );
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07172E] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="text-3xl font-extrabold tracking-tight text-[#07172E]">
            <span className="mr-1">⚓</span>GFAS
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Global Freight Automation System
          </p>
        </div>

        {serverError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 outline-none transition focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-12 text-gray-900 outline-none transition focus:border-[#1559C9] focus:ring-2 focus:ring-[#1559C9]/20"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-[#1559C9] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1148a3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm text-blue-800">
          <span className="font-semibold">Demo Credentials:</span>{' '}
          admin@gtp.com / Admin@123
        </div>
      </div>
    </div>
  );
}
