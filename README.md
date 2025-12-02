# ========== weather-agent-web-app =======
```
✅Final GitHub Repository Structure
weather-voice-agent/
│
├── agent-starter-node/              ← LiveKit Node.js Agent (your agent-starter-node)
│   ├── src/
│   │    ├── agent.ts
│   │    └── agent.test.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md         ← backend-only README
│   └── ...
│
├── agent-starter-react/             ← React + LiveKit Client (your agent-starter-react)
│   ├── app/
│   ├── components/
│   ├── .env.example
│   ├── package.json
│   ├── next.config.ts
│   ├── README.md         ← frontend-only README
│   └── ...
│
├── README.md             ← ROOT README (main documentation)
└── LICENSE
```

Below is your full README.auto-created for GitHub.
Copy & paste into weather-voice-agent/README.md

# 🌦️ Weather Voice Agent (LiveKit + React + Node.js)

This project is a real-time voice-enabled AI assistant that listens to the user, understands the query, fetches weather information, and responds in natural speech.

Built using:

# LiveKit Voice AI Agent (Node.js backend)

# LiveKit React Starter (Frontend UI)

# OpenWeather API for real-time weather

AssemblyAI STT

Cartesia TTS

# OpenAI GPT-4.1-mini LLM

Silero VAD + LiveKit Turn Detection

🚀 Features

✔ Real-time voice conversation.
✔ Natural speech output.
✔ Automatic weather extraction.
✔ Error handling (city not found, unclear speech).
✔ Beautiful UI with microphone, avatars, chat, and video.
✔ Clean code + comments.

```
# 🏗 Architecture
React Frontend (LiveKit Client)
    ↓ WebRTC Audio
LiveKit Cloud
    ↓ Sends audio + job request
Node.js Agent (LiveKit Agent SDK)
    ↓
    Weather API (OpenWeather)
    ↓
Node Agent generates response (LLM + TTS)
    ↓
Frontend plays AI voice
```

# 📦 Setup Instructions
1️⃣ Clone Repository
```
git clone https://github.com/yourusername/weather-voice-agent
cd weather-voice-agent
```

# 🖥 BACKEND SETUP (Node.js LiveKit Agent)
```
cd agent-stater-node
pnpm install
```

Setup .env.local:

```
LIVEKIT_URL=your_cloud_url
LIVEKIT_API_KEY=xxxx
LIVEKIT_API_SECRET=xxxx

OPENAI_API_KEY=xxxx
WEATHER_API_KEY=xxxx
```


# Download agent models:

```
pnpm run download-files
```

# 🌦 Weather Integration (Backend)

Inside backend/src/agent.ts, add this inside tools:
```
import { z } from "zod";
import fetch from "node-fetch";

tools: {
   getWeather: llm.tool({
      description: "Get real-time weather for a city",
      parameters: z.object({
         city: z.string().describe("City name e.g. Bangalore")
      }),
      execute: async ({ city }) => {
         const apiKey = process.env.WEATHER_API_KEY!;
         const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
         
         const res = await fetch(url);
         const data = await res.json();

         if (data.cod !== 200) {
            return `I could not find weather for ${city}.`;
         }

         const temp = (data.main.temp - 273.15).toFixed(1);

         return `Weather in ${city} is ${temp}°C with ${data.weather[0].description}`;
      }
   })
}
```

# 🧪 Tests

Backend includes:

/agent-starter-node/src/agent.test.ts


Run tests:

```
pnpm test
```

# Start backend:

```
pnpm run dev
```

🎨 FRONTEND SETUP (React + Next.js + LiveKit Client)
```
cd agent-starter-react
npm install
```

Create .env.local:

# Set up the API Key and secret
```
LIVEKIT_API_KEY=xxxx
LIVEKIT_API_SECRET=xxxx
LIVEKIT_URL=your_cloud_url
```


# Start UI:
```
npm run dev
```

# Frontend runs at:

👉 http://localhost:3000

🔌 Connecting Frontend & Backend

The frontend does NOT call backend directly.

LiveKit Cloud connects them automatically:

Frontend → creates room and joins
Node Agent → joins same room via job request


Your agent logs show:

received job request
joining room voice_assistant_room_xxx


This means the connection has been established correctly.

# 📁 Code Structure

See structure.tst
```
weather-voice-agent/
 |- agent-starter-node/  <-- frontend
 |- agent-starter-react/ <-- backend
 ```