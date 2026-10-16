import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// English → Korean for the admin show editor. Uses Claude via the Anthropic SDK;
// needs ANTHROPIC_API_KEY on the server. Without it the editor falls back to manual Korean.

export const translateConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const SYSTEM = `You translate short English copy for a Korean concert/festival producer's website into natural Korean.
Rules:
- Keep brand and festival names in English as written (e.g. KPOP PRIME, 7 ROCK PRIME, SKA SUPER SWAG FESTIVAL, KHAM Inc.).
- Use the standard Korean names for cities, countries and well-known venues (e.g. Taipei → 타이베이, Taiwan → 대만).
- Match the tone of event marketing: concise and natural, not literal.
- "To be announced" style phrases become "추후 공개".
Return one Korean string per input string, in the same order.`;

let client: Anthropic | null = null;

export async function translateToKorean(texts: string[]): Promise<string[]> {
  client ??= new Anthropic();

  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { ko: { type: 'array', items: { type: 'string' } } },
          required: ['ko'],
          additionalProperties: false,
        },
      },
    },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ en: texts }) }],
  });

  if (response.stop_reason === 'refusal') throw new Error('refused');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('empty_response');
  const ko = (JSON.parse(text.text) as { ko: string[] }).ko;
  if (!Array.isArray(ko) || ko.length !== texts.length) throw new Error('bad_response');
  return ko;
}
