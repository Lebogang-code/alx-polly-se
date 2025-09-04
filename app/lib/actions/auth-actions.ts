'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';

export async function login(data: LoginFormData) {
  const supabase = await createClient();

  // Input validation
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    return { error: 'Please provide a valid email address.' };
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length === 0) {
    return { error: 'Please provide a password.' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim())) {
    return { error: 'Please provide a valid email address.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email.trim().toLowerCase(),
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

export async function register(data: RegisterFormData) {
  const supabase = await createClient();

  // Input validation
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    return { error: 'Please provide a valid email address.' };
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length === 0) {
    return { error: 'Please provide a password.' };
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { error: 'Please provide a valid name.' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim())) {
    return { error: 'Please provide a valid email address.' };
  }

  // Password strength validation
  if (data.password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  // Name length validation
  if (data.name.trim().length > 100) {
    return { error: 'Name must be less than 100 characters.' };
  }

  const { error } = await supabase.auth.signUp({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    options: {
      data: {
        name: data.name.trim(),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
