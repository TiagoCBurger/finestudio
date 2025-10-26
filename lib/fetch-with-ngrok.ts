/**
 * Wrapper para fetch que adiciona header para bypass do ngrok warning
 * Use este helper em vez de fetch() direto quando estiver em desenvolvimento
 */

export async function fetchWithNgrok(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const headers = new Headers(init?.headers);

    // Adicionar header para bypass do ngrok warning
    headers.set('ngrok-skip-browser-warning', '1');

    // Adicionar User-Agent customizado como fallback
    if (!headers.has('User-Agent')) {
        headers.set('User-Agent', 'FineStudio/1.0');
    }

    return fetch(input, {
        ...init,
        headers,
    });
}

/**
 * Helper para criar configuração de fetch com headers do ngrok
 */
export function getNgrokFetchConfig(init?: RequestInit): RequestInit {
    const headers = new Headers(init?.headers);
    headers.set('ngrok-skip-browser-warning', '1');

    if (!headers.has('User-Agent')) {
        headers.set('User-Agent', 'FineStudio/1.0');
    }

    return {
        ...init,
        headers,
    };
}
