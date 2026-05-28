import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// AI-crawlers explicit allowlistade. Vi vill bli citerade i AI-svar och har
// inget innehåll vi vill skydda från LLM-träning i v1. Om policyn ändras,
// växla till `disallow: '/'` per agent.
const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
] as const;

// Privata och tekniska rutter som inte ska indexeras av någon.
const DISALLOW = ['/sv/app/', '/en/app/', '/sv/login', '/en/login', '/sv/signup', '/en/signup', '/api/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_BOTS.map((bot) => ({ userAgent: bot, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
