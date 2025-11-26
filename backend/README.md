# Tele-Appointment Backend API

Backend Node.js/Express con TypeScript per la gestione degli appuntamenti tramite SQL Server.

## 🚀 Avvio Rapido

### Prerequisiti
- **Node.js** 18+ 
- **SQL Server** (locale o remoto)
- Database `TeleAppointmentDB` creato (vedi `/database/create_appointment_db.sql`)

### Installazione

1. **Vai nella directory backend:**
```bash
cd backend
```

2. **Installa le dipendenze:**
```bash
npm install
```

3. **Configura le variabili d'ambiente:**
```bash
# Copia il file di esempio
copy .env.example .env

# Modifica .env con le tue credenziali SQL Server
```

4. **Test connessione database:**
```bash
npm run test:db
```

5. **Avvia il server:**
```bash
# Modalità sviluppo (con auto-reload)
npm run dev

# Modalità produzione
npm run build
npm start
```

Il server sarà disponibile su **http://localhost:3001**

---

## ⚙️ Configurazione

### File `.env`

```env
# Server
PORT=3001

# SQL Server
DB_SERVER=localhost
DB_DATABASE=TeleAppointmentDB
DB_PORT=1433

# Autenticazione - Scegli uno dei due metodi:

# Metodo 1: Windows Authentication (consigliato per locale)
DB_TRUSTED_CONNECTION=true

# Metodo 2: SQL Server Authentication
# DB_USER=your_username
# DB_PASSWORD=your_password

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

---

## 📋 API Endpoints

### Health Check
```
GET /health
```
Verifica lo stato del server.

**Risposta:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-26T08:00:00.000Z",
  "uptime": 123.45
}
```

---

### Slot Disponibili

#### 1. Ottieni tutti gli slot disponibili
```
GET /api/slots/available
```

**Risposta:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "SlotID": 1,
      "Date": "2025-12-01T00:00:00.000Z",
      "StartTime": "09:00",
      "EndTime": "09:30",
      "IsBooked": false,
      "MaxCapacity": 1,
      "CurrentBookings": 0,
      "SlotsRemaining": 1,
      "FormattedDate": "01/12/2025",
      "FormattedStartTime": "09:00",
      "FormattedEndTime": "09:30"
    }
  ]
}
```

#### 2. Ottieni slot per una data specifica
```
GET /api/slots/:date
```

**Parametri:**
- `date` (path): Data in formato `YYYY-MM-DD`

**Esempio:**
```
GET /api/slots/2025-12-01
```

#### 3. Ottieni slot per un range di date
```
GET /api/slots/range?start=YYYY-MM-DD&end=YYYY-MM-DD
```

**Parametri:**
- `start` (query): Data inizio
- `end` (query): Data fine

**Esempio:**
```
GET /api/slots/range?start=2025-12-01&end=2025-12-07
```

---

### Appuntamenti

#### 4. Crea un nuovo appuntamento
```
POST /api/appointments
Content-Type: application/json
```

**Body:**
```json
{
  "slotId": 1,
  "customerName": "Mario Rossi",
  "customerPhone": "+39 123 456 7890",
  "customerEmail": "mario.rossi@email.com",
  "appointmentType": "Consulenza",
  "notes": "Prima visita"
}
```

**Campi obbligatori:** `slotId`, `customerName`

**Risposta (201 Created):**
```json
{
  "success": true,
  "message": "Appuntamento creato con successo",
  "data": {
    "AppointmentID": 1,
    "SlotID": 1,
    "CustomerName": "Mario Rossi",
    "CustomerPhone": "+39 123 456 7890",
    "CustomerEmail": "mario.rossi@email.com",
    "AppointmentType": "Consulenza",
    "Notes": "Prima visita",
    "Status": "Confermato",
    "BookedAt": "2025-11-26T08:00:00.000Z"
  }
}
```

**Errore 409 (Slot non disponibile):**
```json
{
  "success": false,
  "error": "Slot non disponibile - capacità massima raggiunta"
}
```

#### 5. Ottieni dettagli appuntamento
```
GET /api/appointments/:id
```

**Parametri:**
- `id` (path): ID dell'appuntamento

**Esempio:**
```
GET /api/appointments/1
```

#### 6. Cancella un appuntamento
```
PUT /api/appointments/:id/cancel
```

**Parametri:**
- `id` (path): ID dell'appuntamento

**Risposta:**
```json
{
  "success": true,
  "message": "Appuntamento cancellato con successo",
  "data": {
    "AppointmentID": 1,
    "Status": "Cancellato",
    "CancelledAt": "2025-11-26T08:30:00.000Z"
  }
}
```

---

### Generazione Slot

#### 7. Genera slot automaticamente
```
POST /api/slots/generate
Content-Type: application/json
```

**Body:**
```json
{
  "startDate": "2025-12-01",
  "endDate": "2025-12-31"
}
```

**Risposta:**
```json
{
  "success": true,
  "message": "Slot generati dal 2025-12-01 al 2025-12-31"
}
```

---

## 🧪 Testing

### Test con cURL

**Slot disponibili:**
```bash
curl http://localhost:3001/api/slots/available
```

**Crea appuntamento:**
```bash
curl -X POST http://localhost:3001/api/appointments \
  -H "Content-Type: application/json" \
  -d "{\"slotId\":1,\"customerName\":\"Mario Rossi\",\"customerPhone\":\"+39 123456789\"}"
```

**Cancella appuntamento:**
```bash
curl -X PUT http://localhost:3001/api/appointments/1/cancel
```

### Test con Postman

Importa questa collection o usa i comandi sopra direttamente in Postman.

---

## 📁 Struttura del Progetto

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Configurazione SQL Server
│   ├── routes/
│   │   └── appointmentRoutes.ts # Route API
│   ├── services/
│   │   └── dbService.ts         # Logica database
│   ├── scripts/
│   │   └── testConnection.ts    # Test connessione DB
│   └── server.ts                # Entry point
├── .env.example                 # Template variabili d'ambiente
├── package.json
├── tsconfig.json
└── nodemon.json
```

---

## 🔧 Sviluppo

### Script disponibili

```bash
npm run dev       # Avvia in modalità sviluppo con hot-reload
npm run build     # Compila TypeScript in JavaScript
npm start         # Avvia versione compilata
npm run test:db   # Testa connessione database
```

---

## 🐛 Troubleshooting

### Errore di connessione SQL Server

**Problema:** `ConnectionError: Failed to connect to localhost:1433`

**Soluzioni:**
1. Verifica che SQL Server sia in esecuzione
2. Controlla che TCP/IP sia abilitato in SQL Server Configuration Manager
3. Verifica porta corretta (default: 1433)
4. Controlla firewall Windows

### Errore autenticazione

**Problema:** `Login failed for user`

**Soluzioni:**
1. Se usi Windows Authentication: imposta `DB_TRUSTED_CONNECTION=true`
2. Se usi SQL Authentication: verifica `DB_USER` e `DB_PASSWORD`
3. Verifica che l'utente abbia permessi sul database

### CORS Error dal frontend

**Problema:** `Access to fetch has been blocked by CORS policy`

**Soluzione:**
Aggiungi l'origine del frontend in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

---

## 📝 Note

- Il database usa trigger automatici per aggiornare il contatore di prenotazioni
- Gli slot vengono marcati come "IsBooked" quando raggiungono la capacità massima
- I dati di test includono orari Lun-Ven 9:00-18:00 con slot da 30 minuti
- Usa `sp_GenerateSlots` per creare slot in batch

---

## 🔗 Link Utili

- [Express Documentation](https://expressjs.com/)
- [node-mssql Documentation](https://www.npmjs.com/package/mssql)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
