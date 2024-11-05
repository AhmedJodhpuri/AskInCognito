import { GoogleGenerativeAI } from '@google/generative-ai';
import { StreamingTextResponse } from 'ai';
import { NextResponse } from 'next/server';

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper function to stream text
async function* streamResponse(response: AsyncGenerator<any>) {
  try {
    for await (const chunk of response) {
      yield chunk.text();
    }
  } catch (error) {
    console.error('Streaming error:', error);
    throw error;
  }
}

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Initialize the model (using Gemini-Pro for text generation)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt =
      "Create a list of three open-ended and engaging questions formatted as a single string. Each question should be separated by '||'. These questions are for an anonymous social messaging platform, like Qooh.me, and should be suitable for a diverse audience. Avoid personal or sensitive topics, focusing instead on universal themes that encourage friendly interaction. For example, your output should be structured like this: 'What's a hobby you've recently started?||If you could have dinner with any historical figure, who would it be?||What's a simple thing that makes you happy?'. Ensure the questions are intriguing, foster curiosity, and contribute to a positive and welcoming conversational environment.";

    // Generate content with streaming
    const response = await model.generateContentStream(prompt);
    
    // Create a ReadableStream from the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse(response.stream)) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Return the streaming response
    return new StreamingTextResponse(stream);
    
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { 
        message: 'Error generating suggestions', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}