import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  inference,
  metrics,
  voice,
} from '@livekit/agents';
import { llm } from '@livekit/agents';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: '.env.local' });

// fetching the real-time weather report for an Indian city
const getWeather = llm.tool({
  description: 'Fetch real-time weather for an Indian city',
  parameters: z.object({
    city: z.string().describe('City name in India'),
  }),

  async execute({ city }) {
    const apiKey = process.env.WEATHER_KEY;

    try {
      // Step 1: Convert city → lat/lon
      console.log('city', city);
      const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
      const geoRes = await fetch(geoUrl);
      const geo = await geoRes.json();

      if (!geo || geo.length === 0) {
        return `I cannot find the city ${city}. Please try another name.`;
      }

      const { lat, lon } = geo[0];

      // Step 2: Fetch weather using One Call 3.0
      const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&units=metric&appid=${apiKey}`;

      const weatherRes = await fetch(weatherUrl);
      const data = await weatherRes.json();

      if (!data.current) {
        return `I could not fetch weather for ${city}.`;
      }

      const temp = data.current.temp;
      const desc = data.current.weather[0].description;

      return `The weather in ${city} is ${temp} degrees with ${desc}.`;
    } catch (err) {
      return 'There was a problem fetching the weather. Please try again.';
    }
  },
});

// Define the assistant agent that uses the weather tool
class Assistant extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a weather assistant for India. Always answer only weather-related questions.
Use the weather tool when asked for weather.`,

      tools: {
        getWeather,
      },
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    // Set up a voice AI pipeline using OpenAI, Cartesia, AssemblyAI, and the LiveKit turn detector
    const session = new voice.AgentSession({
      // Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
      // See all available models at https://docs.livekit.io/agents/models/stt/
      stt: new inference.STT({
        model: 'assemblyai/universal-streaming',
        language: 'en',
      }),

      // A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
      // See all providers at https://docs.livekit.io/agents/models/llm/
      llm: new inference.LLM({
        model: 'openai/gpt-4.1-mini',
      }),

      // Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
      // See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
      tts: new inference.TTS({
        model: 'cartesia/sonic-3',
        voice: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
      }),

      // VAD and turn detection are used to determine when the user is speaking and when the agent should respond
      // See more at https://docs.livekit.io/agents/build/turns
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad: ctx.proc.userData.vad! as silero.VAD,
      voiceOptions: {
        // Allow the LLM to generate a response while waiting for the end of turn
        preemptiveGeneration: true,
      },
    });

    // To use a realtime model instead of a voice pipeline, use the following session setup instead.
    // (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    // 1. Install '@livekit/agents-plugin-openai'
    // 2. Set OPENAI_API_KEY in .env.local
    // 3. Add import `import * as openai from '@livekit/agents-plugin-openai'` to the top of this file
    // 4. Use the following session setup instead of the version above
    // const session = new voice.AgentSession({
    //   llm: new openai.realtime.RealtimeModel({ voice: 'marin' }),
    // });

    // Metrics collection, to measure pipeline performance
    // For more information, see https://docs.livekit.io/agents/build/metrics/
    const usageCollector = new metrics.UsageCollector();
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      metrics.logMetrics(ev.metrics);
      usageCollector.collect(ev.metrics);
    });

    const logUsage = async () => {
      const summary = usageCollector.getSummary();
      console.log(`Usage: ${JSON.stringify(summary)}`);
    };

    ctx.addShutdownCallback(logUsage);

    // Start the session, which initializes the voice pipeline and warms up the models
    await session.start({
      agent: new Assistant(),
      room: ctx.room,
      inputOptions: {
        // LiveKit Cloud enhanced noise cancellation
        // - If self-hosting, omit this parameter
        // - For telephony applications, use `BackgroundVoiceCancellationTelephony` for best results
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    // Join the room and connect to the user
    await ctx.connect();
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
