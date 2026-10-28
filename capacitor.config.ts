import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.payrollpro.app',
  appName: 'Payroll Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
