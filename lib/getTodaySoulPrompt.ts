import { ensureTodaySoulPrompt, type SoulPrompt } from './ensureTodaySoulPrompt';

export type { SoulPrompt };

export async function getTodaySoulPrompt(): Promise<SoulPrompt | null> {
  try {
    const result = await ensureTodaySoulPrompt();
    
    if ('status' in result && result.status === 'exhausted') {
      console.error('All soul prompts have been used. Please add more prompts.');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Error in getTodaySoulPrompt:', error);
    return null;
  }
}