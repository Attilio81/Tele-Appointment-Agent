# 📞 AI Tele-Appointment Agent

Un agente di vendita telefonica AI avanzato, costruito con **React** e **Google Gemini Multimodal Live API**.
Questo progetto dimostra come creare un assistente vocale in tempo reale capace di effettuare chiamate (simulate), sostenere conversazioni naturali in italiano e prenotare appuntamenti.

## ✨ Caratteristiche Principali

*   **🗣️ Conversazione Vocale Real-time**: Utilizza le API WebSocket di Gemini per una latenza bassissima (Audio-to-Audio).
*   **🇮🇹 Supporto Lingua Italiana**: Ottimizzato per conversazioni naturali in italiano.
*   **📅 Prenotazione Intelligente**: L'AI può usare "tools" (Function Calling) per registrare appuntamenti nel sistema quando il cliente conferma.
*   **🎨 Interfaccia Moderna**: UI reattiva e curata con Tailwind CSS, tema scuro professionale.
*   **🔒 Gestione Permessi**: Include un sistema robusto per la gestione dei permessi del microfono con fallback per browser datati.
*   **📊 Log in Tempo Reale**: Visualizza la trascrizione e gli eventi di sistema mentre avvengono.

## 🛠️ Tecnologie Utilizzate

*   [React 19](https://react.dev/) - Frontend Framework
*   [Vite](https://vitejs.dev/) - Build Tool ultra-veloce
*   [Google Gemini API](https://ai.google.dev/) - Modello Multimodale (Gemini 2.0 Flash)
*   [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Gestione flussi audio e visualizzazione
*   [Tailwind CSS](https://tailwindcss.com/) - Styling

## 🚀 Per Iniziare

### Prerequisiti

*   Node.js (v18 o superiore)
*   Una API Key di Google Gemini (da [Google AI Studio](https://aistudio.google.com/))

### Installazione

1.  **Clona il repository:**
    ```bash
    git clone https://github.com/Attilio81/Tele-Appointment-Agent.git
    cd Tele-Appointment-Agent
    ```

2.  **Installa le dipendenze:**
    ```bash
    npm install
    ```

3.  **Configura l'ambiente:**
    Crea un file `.env.local` nella root del progetto e aggiungi la tua chiave API:
    ```env
    VITE_GEMINI_API_KEY=la_tua_chiave_api_qui
    ```

4.  **Avvia il server di sviluppo:**
    ```bash
    npm run dev
    ```

5.  Apri il browser all'indirizzo `http://localhost:5173`.

## 🖥️ Utilizzo

1.  **Seleziona un Cliente**: Dalla lista a sinistra, clicca su "Chiama" accanto a un contatto (es. Mario Rossi).
2.  **Attiva il Microfono**: Conferma l'accesso al microfono nel modale che appare.
3.  **Parla con l'AI**: L'agente si presenterà come assistente dello "Studio Dentistico Sorriso". Rispondi naturalmente.
4.  **Prenota**: Se accetti l'appuntamento, l'agente confermerà e lo stato del cliente cambierà in "Appuntamento Preso".

## ⚠️ Note Importanti

*   **HTTPS**: Per funzionare su dispositivi remoti (non localhost), l'applicazione deve essere servita su HTTPS per accedere al microfono.
*   **Browser**: Consigliato l'uso di Chrome, Edge o browser basati su Chromium per la migliore compatibilità con le API audio.

## 🤝 Contribuire

Le Pull Request sono benvenute! Per modifiche importanti, apri prima una issue per discutere cosa vorresti cambiare.

## 📄 Licenza

Distribuito sotto licenza MIT.

---
*Realizzato con ❤️ e AI.*
