import "server-only";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getSupabaseAdminClient } from "./supabase/server";

interface VoiceGenResult {
  audioUrl: string | null;
  voiceId: string;
  durationSec?: number;
  reason?: string;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export async function generateVoiceIntro({
  script,
  voiceId,
  slug,
}: {
  script: string;
  voiceId?: string;
  slug: string;
}): Promise<VoiceGenResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  // Default to "Adam" — a public ElevenLabs preset voice, works without cloning.
  const PRESET_ADAM = "pNInz6obpgDQGcFmaJgB";
  const defaultVoice = process.env.ELEVENLABS_VOICE_ID || PRESET_ADAM;
  const finalVoiceId = voiceId ?? defaultVoice;

  if (!apiKey) {
    return {
      audioUrl: null,
      voiceId: finalVoiceId,
      reason: "missing_elevenlabs_api_key",
    };
  }

  try {
    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(finalVoiceId, {
      text: script,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    const buffer = await streamToBuffer(audioStream as ReadableStream<Uint8Array>);

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      // Fallback: return a data URL so the player still works locally without Supabase.
      const base64 = buffer.toString("base64");
      return {
        audioUrl: `data:audio/mpeg;base64,${base64}`,
        voiceId: finalVoiceId,
      };
    }

    const path = `${slug}/${Date.now()}.mp3`;
    const upload = await supabase.storage
      .from("voice-intros")
      .upload(path, buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (upload.error) {
      console.error("[elevenlabs] supabase upload failed:", upload.error);
      return { audioUrl: null, voiceId: finalVoiceId, reason: upload.error.message };
    }

    const { data: publicUrl } = supabase.storage
      .from("voice-intros")
      .getPublicUrl(path);

    return {
      audioUrl: publicUrl.publicUrl,
      voiceId: finalVoiceId,
    };
  } catch (err) {
    console.error("[elevenlabs] generation failed:", err);
    return {
      audioUrl: null,
      voiceId: finalVoiceId,
      reason: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
