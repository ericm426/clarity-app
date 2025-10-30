// Simple Supabase client using fetch API (no external dependencies)
// This avoids CSP issues with importing from CDN

const SUPABASE_URL = 'https://gzlhwqrwunytgtqetcoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bGh3cXJ3dW55dGd0cWV0Y296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNjMzNjEsImV4cCI6MjA3NTkzOTM2MX0.mKw_3_Ki_4W8T-PE7uE11OCz0ee6AW_sfxgsT69jJ4k';

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.accessToken = null;
  }

  // Get auth token from storage
  async getAccessToken() {
    if (this.accessToken) return this.accessToken;

    const result = await chrome.storage.local.get(['supabase_session']);
    if (result.supabase_session) {
      const session = JSON.parse(result.supabase_session);
      this.accessToken = session.access_token;
      return this.accessToken;
    }
    return null;
  }

  // Set auth token in storage
  async setSession(session) {
    this.accessToken = session.access_token;
    await chrome.storage.local.set({
      'supabase_session': JSON.stringify(session)
    });
  }

  // Clear auth token
  async clearSession() {
    this.accessToken = null;
    await chrome.storage.local.remove(['supabase_session']);
  }

  // Make authenticated request to Supabase
  async fetch(path, options = {}) {
    const token = await this.getAccessToken();
    const headers = {
      'apikey': this.key,
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.url}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    return response.json();
  }

  // Auth methods
  async signInWithPassword(email, password) {
    // Use the token endpoint for sign in
    const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Login failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error_description || errorJson.msg || errorJson.message || 'Login failed';
      } catch (e) {
        errorMessage = errorText || 'Login failed';
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Store the full session data
    await this.setSession(data);

    return { data, error: null };
  }

  async signOut() {
    const token = await this.getAccessToken();
    if (token) {
      try {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': this.key,
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    await this.clearSession();
    return { error: null };
  }

  async getUser() {
    const token = await this.getAccessToken();
    if (!token) {
      return { data: { user: null }, error: null };
    }

    try {
      const response = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          'apikey': this.key,
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        await this.clearSession();
        return { data: { user: null }, error: null };
      }

      const user = await response.json();
      return { data: { user }, error: null };
    } catch (error) {
      return { data: { user: null }, error };
    }
  }

  async getSession() {
    const token = await this.getAccessToken();
    if (!token) {
      return { data: { session: null }, error: null };
    }

    const result = await chrome.storage.local.get(['supabase_session']);
    if (result.supabase_session) {
      const session = JSON.parse(result.supabase_session);
      return { data: { session }, error: null };
    }

    return { data: { session: null }, error: null };
  }

  // Database query builder
  from(table) {
    return new QueryBuilder(this, table);
  }
}

class QueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.query = {
      method: 'GET',
      filters: [],
      select: '*',
      order: null,
      limit: null
    };
  }

  select(columns = '*') {
    this.query.select = columns;
    return this;
  }

  eq(column, value) {
    this.query.filters.push(`${column}=eq.${value}`);
    return this;
  }

  // Make QueryBuilder "thenable" so it auto-executes when awaited
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  order(column, options = {}) {
    const direction = options.ascending ? 'asc' : 'desc';
    this.query.order = `${column}.${direction}`;
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  single() {
    this.query.single = true;
    // Auto-execute when single() is called (for compatibility)
    return this.execute();
  }

  async execute() {
    const params = new URLSearchParams();
    params.append('select', this.query.select);

    if (this.query.filters.length > 0) {
      this.query.filters.forEach(filter => {
        const [key, value] = filter.split('=');
        params.append(key, value);
      });
    }

    if (this.query.order) {
      params.append('order', this.query.order);
    }

    if (this.query.limit) {
      params.append('limit', this.query.limit);
    }

    const path = `/rest/v1/${this.table}?${params.toString()}`;

    try {
      let data = await this.client.fetch(path, {
        method: this.query.method,
        body: this.query.body ? JSON.stringify(this.query.body) : undefined
      });

      if (this.query.single) {
        if (!data || data.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };
        }
        data = data[0];
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async insert(values) {
    this.query.method = 'POST';
    this.query.body = values;

    const path = `/rest/v1/${this.table}`;

    try {
      const data = await this.client.fetch(path, {
        method: 'POST',
        body: JSON.stringify(values),
        headers: {
          'Prefer': 'return=representation'
        }
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async update(values) {
    this.query.method = 'PATCH';
    this.query.body = values;

    const params = new URLSearchParams();
    this.query.filters.forEach(filter => {
      const [key, value] = filter.split('=');
      params.append(key, value);
    });

    const path = `/rest/v1/${this.table}?${params.toString()}`;

    try {
      await this.client.fetch(path, {
        method: 'PATCH',
        body: JSON.stringify(values)
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async delete() {
    const params = new URLSearchParams();
    this.query.filters.forEach(filter => {
      const [key, value] = filter.split('=');
      params.append(key, value);
    });

    const path = `/rest/v1/${this.table}?${params.toString()}`;

    try {
      await this.client.fetch(path, {
        method: 'DELETE'
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  }
}

// Create and export singleton instance
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for ES modules
export { supabase };
