import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const action = req.query.action as string;

    try {
        if (action === 'ipfs') {
            // Proxy IPFS metadata upload to pump.fun
            const { file, fileName, name, symbol, description, twitter, website, showName } = req.body;

            if (!file || !name || !symbol) {
                return res.status(400).json({ error: 'Missing required fields: file, name, symbol' });
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
                return res.status(response.status).json({ error: 'IPFS upload failed' });
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
                return res.status(response.status).json({ error: 'Trade API failed' });
            }

            const data = Buffer.from(await response.arrayBuffer());
            res.setHeader('Content-Type', 'application/octet-stream');
            return res.status(200).send(data);

        } else {
            return res.status(400).json({ error: 'Invalid action. Use ?action=ipfs or ?action=trade' });
        }
    } catch (err) {
        console.error('Pumpfun proxy error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
