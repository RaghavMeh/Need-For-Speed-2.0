import db from './db';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

export interface TrackParams {
    topology: 'urban' | 'canyon' | 'industrial';
    complexity: number;
    atmosphere: string;
    lighting: string;
}

export interface DialogueRequest {
    npc: string;
    event: 'pursuit_start' | 'spike_strip' | 'car_lost' | 'ramming' | 'taunt';
    intensity: number;
    playerCar: string;
}

export async function getTrackDescription(input: string): Promise<TrackParams> {
    // In a real scenario, we would use Gemini to parse the user input
    // and then store the result in SQLite
    const track = {
        topology: 'urban' as const,
        complexity: 0.8,
        atmosphere: 'rainy night in Rockport',
        lighting: 'neon orange'
    };

    db.prepare('INSERT INTO procedural_tracks (name, topology, complexity, config_json) VALUES (?, ?, ?, ?)')
        .run(input, track.topology, track.complexity, JSON.stringify(track));

    return track;
}

export async function getNPCDialogue(req: DialogueRequest): Promise<string> {
    // 1. Fetch past memories for this NPC
    const memories = db.prepare('SELECT memory_text FROM npc_memories WHERE npc_name = ? ORDER BY timestamp DESC LIMIT 3')
        .all(req.npc) as { memory_text: string }[];

    const context = memories.map(m => m.memory_text).join('\n');

    // 2. Generate new dialogue (Mocked for now to avoid needing actual API key during dev)
    const responses: Record<string, string> = {
        pursuit_start: "Visual on the suspect! Requesting pit maneuver clearance.",
        spike_strip: "Deployment zone alpha-6. Watch your speed, units!",
        car_lost: "Suspect is ghosting us. Delta units, box him in at Rosewood!",
        ramming: "Target is aggressive! Unit 12 is out, repeat, Unit 12 is out!",
        taunt: "You think those chrome wheels make you fast? I've seen grandma drive better."
    };

    const responseText = responses[req.event] || "Maintain visual.";

    // 3. Save to memory
    db.prepare('INSERT INTO npc_memories (npc_name, event, intensity, memory_text) VALUES (?, ?, ?, ?)')
        .run(req.npc, req.event, req.intensity, responseText);

    return responseText;
}
