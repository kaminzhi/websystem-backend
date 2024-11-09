declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      DB_USER: string;
      DB_PASSWORD: string;
      DB_HOST: string;
      DB_PORT: string;
      DB_NAME: string;
      GAME_NAMES: string;
      GAME_DISPLAY_NAMES: string;
    }
  }
}

export {}; 