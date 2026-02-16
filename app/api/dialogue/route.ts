import { NextResponse } from 'next/server';
import { getNPCDialogue } from '@/lib/ai';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const dialogue = await getNPCDialogue(body);
        return NextResponse.json({ dialogue });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate dialogue' }, { status: 500 });
    }
}
