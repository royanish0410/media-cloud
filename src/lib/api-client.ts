type FetchOptions<TBody = unknown> = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string | FormData | TBody;
};

class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<TResponse, TBody = unknown>(
    endpoint: string,
    options: FetchOptions<TBody>
  ): Promise<TResponse> {
    const isFormData = options.body instanceof FormData;
    const headers = { ...options.headers };
    
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    let bodyData: string | FormData | undefined;
    if (isFormData) {
      bodyData = options.body as FormData;
    } else if (options.body) {
      bodyData = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method,
      headers,
      body: bodyData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  async post<T, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T, TBody>(endpoint, { method: "POST", body, headers });
  }

  async put<T, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T, TBody>(endpoint, { method: "PUT", body, headers });
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
  }
}

// Create a default instance
export const apiClient = new ApiClient(
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'
);

export async function fetchApi<T, TBody = unknown>(
  url: string,
  options: FetchOptions<TBody>
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let bodyData: string | FormData | undefined;
  if (isFormData) {
    bodyData = options.body as FormData;
  } else if (options.body) {
    bodyData = typeof options.body === 'string' 
      ? options.body 
      : JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: bodyData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  return response.json();
}

export { ApiClient };
export type { FetchOptions };
