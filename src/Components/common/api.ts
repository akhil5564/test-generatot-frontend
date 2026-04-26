// @ts-nocheck
// Lightweight API helper
import { message } from "antd";

export const BASE_URL = "https://childcraft-server.onrender.com";

export const API = {
  BASE: "",
  BOOKS: "/books",
  TITLEAPI: "/questions/filter",
  ALL_BOOKS: "/allbooks",
  CHAPTER: "/chapter",
  CHAPTERGET:"/chapterd",
  SUBJECT: "/subject",
  ALL_SUBJECTS: "/subjectAll",
  QUESTION: "/qustion",
  UPLOAD: "/upload",
  QUIZ_ITEMS: "/quizItems",
  BOOKED:"/booked"
};

const buildUrl = (endpoint: string, query?: Record<string, any>) => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle arrays by appending each value separately
        if (Array.isArray(value)) {
          value.forEach((item) => {
            url.searchParams.append(key, String(item));
          });
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });
  }
  return url.toString();
};

export const GET = async (endpoint: string, query?: Record<string, any>) => {
  const url = buildUrl(endpoint, query);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export const POST = async (
  endpoint: string,
  body?: Record<string, any> | FormData,
  query?: Record<string, any>
) => {
  const url = buildUrl(endpoint, query);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    method: "POST",
    headers: isFormData
      ? { Accept: "application/json" }
      : { "Content-Type": "application/json", Accept: "application/json" },
    body: isFormData ? (body as FormData) : JSON.stringify(body || {}),
  });
  
  const data = await res.json();
  
  if (res.status === 400) {
    let msg = data?.message || "Bad Request";
    message.error(msg);
    throw new Error(msg || `Request failed with status ${res.status}`);
  }
  
  if (res.status !== 200 && res.status !== 201) {
    const errorMsg = data?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return { data, status: res.status };
};

export const PUT = async (
  endpoint: string,
  body?: Record<string, any> | FormData,
  query?: Record<string, any>
) => {
  const url = buildUrl(endpoint, query);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    method: "PUT",
    headers: isFormData
      ? { Accept: "application/json" }
      : { "Content-Type": "application/json", Accept: "application/json" },
    body: isFormData ? (body as FormData) : JSON.stringify(body || {}),
  });
  if (res.status === 400) {
    const text = await res.text();
    let msg = text || "Bad Request";
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === 'string') msg = parsed.message;
    } catch {}
    message.error(msg);
    throw new Error(msg || `Request failed with status ${res.status}`);
  }

  return res.json();
};

export const PATCH = async (
  endpoint: string,
  body?: Record<string, any> | FormData,
  query?: Record<string, any>
) => {
  const url = buildUrl(endpoint, query);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    method: "PATCH",
    headers: isFormData
      ? { Accept: "application/json" }
      : { "Content-Type": "application/json", Accept: "application/json" },
    body: isFormData ? (body as FormData) : JSON.stringify(body || {}),
  });
  if (res.status === 400) {
    const text = await res.text();
    let msg = text || "Bad Request";
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === 'string') msg = parsed.message;
    } catch {}
    message.error(msg);
    throw new Error(msg || `Request failed with status ${res.status}`);
  }

  return res.json();
};

export const DELETE = async (
  endpoint: string,
  query?: Record<string, any>
) => {
  const url = buildUrl(endpoint, query);
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  // Some DELETE endpoints return no content
  if (res.status === 204) return { success: true } as any;
  return res.json();
};

export default {
  BASE_URL,
  API,
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
};


