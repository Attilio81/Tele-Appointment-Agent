/// &lt;reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_BACKEND_URL: string;
    // Aggiungi altre variabili d'ambiente qui se necessario
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
