export function safeParseAIResponse(text: string) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}