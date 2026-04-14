export const readJsonSafely = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};
