import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { text, voiceId = 'pMsdbvqyZpBf9SNTWXM2' } = await req.json(); // Default to a gritty male voice

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_ELEVENLABS_API_KEY_HERE') {
        return NextResponse.json({ error: 'ElevenLabs API Key not configured' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            throw new Error('ElevenLabs API returned an error');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new Response(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });
    } catch (error) {
        console.error('ElevenLabs Error:', error);
        return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
    }
}
