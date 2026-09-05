import { API_URL } from "./library.service";
import { authHeaders } from "./server-config.service";

export async function getDirectories(): Promise<string[]> {
    const response = await fetch(`${API_URL}/api/directories`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to load directories.');
    return data.directories ?? [];
}
