let API_URL = 'https://gigmatch-orcin.vercel.app/api';

if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) {
  API_URL = process.env.EXPO_PUBLIC_API_URL;
}

API_URL = String(API_URL || '').trim().replace(/\/+$/, '');

export async function apiRequest(path, { token, ...options } = {}) {
  if (!API_URL) {
    throw new Error('Live services are not configured in this preview.');
  }

  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  const url = `${API_URL}${normalizedPath}`;

  let response;
  try {
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
    error.data = data;
    throw error;
  }
  if (!data) {
    throw new Error('The server returned an invalid response');
  }
  return data;
}

export function verifyEmailOtp({ email, code }) {
  return apiRequest('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function resendAuthOtp({ email, purpose = 'verify_email' }) {
  return apiRequest('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  });
}

export function requestPasswordResetOtp({ email }) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordWithOtp({ email, code, newPassword }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
}