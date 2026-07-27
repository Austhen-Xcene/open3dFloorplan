/**
 * Inicialização do Firebase.
 *
 * A configuração vem de variáveis de ambiente `PUBLIC_FIREBASE_*`. Enquanto elas não
 * existirem, este módulo é inerte: não inicializa nada e não envia nada para lugar nenhum.
 *
 * Isto é proposital. A versão anterior trazia as credenciais do projeto `openplan3d`
 * embutidas no código — projeto do fork original, não deste — e mandava Analytics para
 * lá a cada carregamento de página. Configuração de terceiro nunca volta para cá.
 *
 * Ao criar o projeto no Firebase, preencha `.env` seguindo `.env.example`.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { env } from '$env/dynamic/public';

const config = {
  apiKey: env.PUBLIC_FIREBASE_API_KEY,
  authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.PUBLIC_FIREBASE_APP_ID,
  measurementId: env.PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/** Há projeto configurado? Sem isso, nada do Firebase é inicializado. */
export const firebaseConfigurado = Boolean(config.apiKey && config.projectId);

export const app: FirebaseApp | null = firebaseConfigurado ? initializeApp(config) : null;

export const analytics = app
  ? isSupported().then((suportado) => (suportado ? getAnalytics(app) : null))
  : Promise.resolve(null);
