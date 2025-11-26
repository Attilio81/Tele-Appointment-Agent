# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Tele-Appointment Agent is a dual-architecture application combining a React frontend with Google Gemini Multimodal Live API for real-time voice conversations and a backend API with Prisma ORM for appointment management. The AI agent conducts phone calls in Italian to book dental appointments using function calling to interact with a database.

## Architecture

### Frontend (React + Vite)
- **Main Entry**: `App.tsx` orchestrates the entire call flow and UI state
- **Components**: Modular UI in `components/` (ClientList, ActiveCall, MicrophoneModal, SettingsPanel)
- **Services**:
  - `geminiService.ts`: WebSocket connection to Gemini 2.0 Flash, handles audio streaming (input/output), function calling, and session lifecycle
  - `audioUtils.ts`: Web Audio API utilities for encoding/decoding, downsampling to 16kHz PCM
  - `appointmentService.ts`: Frontend API client for backend communication
- **Audio Flow**: User mic → ScriptProcessorNode → downsample to 16kHz → WebSocket to Gemini → base64 audio response → AudioContext playback

### Backend (Express + Prisma + SQLite)
- **Entry**: `backend/src/server.ts` - Express server with CORS, health checks, graceful shutdown
- **Database**: Prisma ORM with SQLite (dev.db), schema in `backend/prisma/schema.prisma`
  - `Slot` model: Time slots with date, start/end times, capacity management
  - `Appointment` model: Customer bookings linked to slots with status tracking
- **Service Layer**: `backend/src/services/dbService.ts` - All database operations with transaction support
- **Routes**: `backend/src/routes/appointmentRoutes.ts` - RESTful API endpoints

### Function Calling Integration
The frontend's `geminiService.ts` defines three tools that Gemini can invoke:
1. `checkAvailability`: Query available slots from backend API
2. `prenotaAppuntamento`: Book appointment (by slotId or date/time)
3. `cancellareAppuntamento`: Cancel existing appointments

Tool responses are sent back to Gemini via `session.sendToolResponse()` to continue the conversation flow.

## Development Commands

### Frontend
```bash
# Install dependencies
npm install

# Development server (Vite on port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Backend
```bash
cd backend

# Install dependencies
npm install

# Development server with auto-reload (nodemon on port 3001)
npm run dev

# Build TypeScript
npm run build

# Production server
npm start

# Test database connection
npm run test:db

# Prisma commands (after schema changes)
npx prisma generate  # Generate Prisma Client
npx prisma migrate dev  # Create and apply migrations
npx prisma studio  # Open database GUI
```

## Environment Configuration

### Frontend `.env.local`
```
VITE_GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
VITE_BACKEND_URL=http://localhost:3001  # Optional, defaults to this
```

### Backend `.env`
```
PORT=3001
DATABASE_URL=file:./dev.db  # SQLite for development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Note: The `.env.example` shows SQL Server configuration, but current schema uses SQLite.

## Key Technical Considerations

### Audio Processing
- Gemini Live API requires 16kHz PCM audio input
- Frontend uses `ScriptProcessorNode` (deprecated but functional) for real-time audio capture
- `downsampleTo16000()` in audioUtils.ts resamples browser audio (typically 48kHz) to 16kHz
- Output audio is base64-encoded and decoded using Web Audio API's `decodeAudioData()`
- AudioContext scheduling uses `nextStartTimeRef` to queue audio chunks without gaps

### Microphone Permissions
- `MicrophoneModal` component handles user consent before starting call
- Fallback to legacy `navigator.webkitGetUserMedia` for older browsers
- Requires HTTPS in production (localhost exempt)

### State Management
- No external state library used
- `App.tsx` manages all state with React hooks: clients list, active call, logs, audio playback
- Session lifecycle tied to component state via `sessionRef.current`

### Database Transactions
- `DbService.createAppointment()` uses Prisma transactions to ensure slot availability checks and capacity updates are atomic
- `DbService.cancelAppointment()` decrements slot bookings and frees capacity in a single transaction

### CORS
- Backend configured to accept requests from Vite dev servers (ports 5173, 5174)
- Modify `ALLOWED_ORIGINS` for production deployments

## API Endpoints

### Slots
- `GET /api/slots/available` - All future available slots
- `GET /api/slots/:date` - Slots for specific date (YYYY-MM-DD)
- `GET /api/slots/range?start=YYYY-MM-DD&end=YYYY-MM-DD` - Date range
- `POST /api/slots/generate` - Generate slots for date range (body: `{startDate, endDate}`)

### Appointments
- `POST /api/appointments` - Create (body: `{slotId, customerName, customerPhone?, customerEmail?, appointmentType?, notes?}`)
- `GET /api/appointments/:id` - Get by ID
- `PUT /api/appointments/:id/cancel` - Cancel appointment

### Health
- `GET /health` - Server health check with uptime

## Common Workflows

### Adding a New Function Tool
1. Define `FunctionDeclaration` in `services/geminiService.ts` with name, description, parameters
2. Add to `tools` array in `ai.live.connect()` config (line 164)
3. Handle in `onmessage` callback's `message.toolCall` section
4. Create/update backend API endpoint if needed
5. Return tool response via `session.sendToolResponse()`

### Modifying Database Schema
1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description_of_change`
3. Update `dbService.ts` types and methods
4. Update frontend types in `services/appointmentService.ts` if API changes
5. Regenerate client: `npx prisma generate`

### Changing AI Behavior
- System prompt in `App.tsx` line 16 (`DEFAULT_PROMPT`)
- Passed to Gemini with client name interpolation in `session.start()` config
- Voice selection in `SettingsPanel` (default: "Kore")

## Project-Specific Patterns

### Log Management
- Centralized `addLog()` function in App.tsx passed as callback to services
- Log types: `'info' | 'error' | 'success' | 'agent' | 'user'`
- Displayed in real-time during active calls via `ActiveCall` component

### Call Status Enum
- Defined in `types.ts`: IDLE, CALLING, CONNECTED, COMPLETED, BOOKED, FAILED
- Drives UI rendering and button states in `ClientList`
- Updated throughout call lifecycle in `App.tsx`

### Error Handling
- Backend uses centralized error middleware in `server.ts`
- Frontend catches errors in service layers and passes to `addLog()`
- Microphone errors have specific handling for NotAllowedError, NotFoundError, NotReadableError

## Browser Compatibility

- Best on Chromium-based browsers (Chrome, Edge) for Web Audio API support
- Requires microphone access permissions
- HTTPS required for non-localhost deployments due to getUserMedia restrictions
