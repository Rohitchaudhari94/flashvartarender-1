const TOKEN_KEY = 'fv_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable - session just won't persist */
  }
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Please check that it is running.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const isAuthForm = path.startsWith('/auth/login') || path.startsWith('/auth/register');
    if (
      token &&
      !isAuthForm &&
      (res.status === 401 || (res.status === 403 && data.message && data.message.toLowerCase().includes('deactivated')))
    ) {
      window.dispatchEvent(new Event('fv:unauthorized'));
    }
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
