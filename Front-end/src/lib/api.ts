import axios from "axios";

let isRefreshing = false;
let queue: ((token: string) => void)[] = [];

export const api = axios.create({
  baseURL: "http://localhost:3001",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        const res = await api.post("/auth/refresh", {
          refreshToken,
        });

        const newToken = res.data.accessToken;

        localStorage.setItem("accessToken", newToken);

        queue.forEach((cb) => cb(newToken));
        queue = [];

        return api(original);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);