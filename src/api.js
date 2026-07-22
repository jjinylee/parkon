const BASE_URL = '/api/v1';

export async function api(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  const json = await res.json();

  if (!json.success) {
    const err = new Error(json.error?.message || '요청 실패');
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export function getToken() {
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
