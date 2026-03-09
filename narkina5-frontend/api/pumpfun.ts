import type { VercelRequest, VercelResponse } from '@vercel/node';

type ProxyAction = 'ipfs' | 'trade';

interface ProxyErrorPayload {
    error: string;
    code: string;
    retryable: boolean;
    action?: ProxyAction;
    providerStatus?: number;
    details?: string;
}

function sendError(
    res: VercelResponse,
    status: number,
    payload: ProxyErrorPayload,
) {
    return res.status(status).json(payload);
}

function isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return sendError(res, 405, {
            error: 'Method not allowed',
            code: 'PFN_METHOD_NOT_ALLOWED',
            retryable: false,
        });
    }

    const action = req.query.action as string;

    try {
        if (action === 'ipfs') {
            // Proxy IPFS metadata upload to pump.fun
            const { file, fileName, name, symbol, description, twitter, website, showName } = req.body;

            if (!file || !name || !symbol) {
                return sendError(res, 400, {
                    error: 'Missing required fields: file, name, symbol',
                    code: 'PFN_VALIDATION_IPFS_REQUIRED_FIELDS',
                    retryable: false,
                    action: 'ipfs',
                });
            }

            // Reconstruct FormData from base64 JSON
            const { FormData, Blob } = await import('formdata-node');
            const imageBuffer = Buffer.from(file, 'base64');
            const imageBlob = new Blob([imageBuffer], { type: 'image/svg+xml' });

            const formData = new FormData();
            formData.append('file', imageBlob, fileName || 'avatar.svg');
            formData.append('name', name);
            formData.append('symbol', symbol);
            formData.append('description', description || '');
            if (twitter) formData.append('twitter', twitter);
            if (website) formData.append('website', website);
            if (showName) formData.append('showName', 'true');

            const response = await fetch('https://pump.fun/api/ipfs', {
                method: 'POST',
                body: formData as unknown as BodyInit,
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('Pump.fun IPFS error:', text);
                return sendError(res, response.status, {
                    error: 'IPFS upload failed',
                    code: 'PFN_PROVIDER_IPFS_FAILED',
                    retryable: isRetryableStatus(response.status),
                    action: 'ipfs',
                    providerStatus: response.status,
                    details: text.slice(0, 280),
                });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'trade') {
            // Proxy trade request to PumpPortal
            const response = await fetch('https://pumpportal.fun/api/trade-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body),
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('PumpPortal error:', text);
                return sendError(res, response.status, {
                    error: 'Trade API failed',
                    code: 'PFN_PROVIDER_TRADE_FAILED',
                    retryable: isRetryableStatus(response.status),
                    action: 'trade',
                    providerStatus: response.status,
                    details: text.slice(0, 280),
                });
            }

            const data = Buffer.from(await response.arrayBuffer());
            res.setHeader('Content-Type', 'application/octet-stream');
            return res.status(200).send(data);

        } else {
            return sendError(res, 400, {
                error: 'Invalid action. Use ?action=ipfs or ?action=trade',
                code: 'PFN_BAD_ACTION',
                retryable: false,
            });
        }
    } catch (err) {
        console.error('Pumpfun proxy error:', err);
        const isNetworkLike = err instanceof TypeError;
        return sendError(res, 500, {
            error: 'Internal server error',
            code: isNetworkLike ? 'PFN_NETWORK_ERROR' : 'PFN_INTERNAL',
            retryable: isNetworkLike,
            details: err instanceof Error ? err.message.slice(0, 280) : 'unknown',
        });
    }
}
