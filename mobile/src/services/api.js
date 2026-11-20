let API_URL = 'https://server-tau-wine.vercel.app/api';

// Use localhost for local development when running via Expo
if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) {
  API_URL = process.env.EXPO_PUBLIC_API_URL;
} else if (typeof window !== 'undefined' && window.location) {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
    API_URL = 'http://localhost:5000/api';
  }
}

export async function apiRequest(path, { token, ...options } = {}) {
  if (!API_URL) {
    throw new Error('Live services are not configured in this preview.');
  }

  let response;
  try {
    const url = API_URL + path;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error("Can't reach Gigmatch right now. Check your connection and API URL " + API_URL);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed ' + response.status);
    error.status = response.status;
    throw error;
  }
  if (!data) {
    throw new Error('The server returned an invalid response');
  }
  return data;
}