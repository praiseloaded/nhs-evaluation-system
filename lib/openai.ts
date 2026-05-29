// lib/openai.ts (ACTUALLY A GENERIC AI WRAPPER)

import { grokChatCompletion } from "@/lib/xai"; 
// OR replace with your active provider:
// import { grokChatCompletion } from "@/lib/ollama";

export const openai = {
  chat: {
    completions: {
      create: async (params: any) => {
        const messages = params.messages || [];
        const result = await grokChatCompletion(messages);

        return {
          choices: [
            {
              message: {
                content: result,
              },
            },
          ],
        };
      },
    },
  },
};