import React from 'react';
import { Shield } from 'lucide-react';

const SupabaseSetupInstructions = () => {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-zinc-200 p-10 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield size={40} />
        </div>
        <h1 className="text-3xl font-bold text-zinc-800 mb-4">Supabase Configuration Required</h1>
        <p className="text-zinc-600 mb-8">
          This application requires a connection to a Supabase project to function. Please follow these steps to set up your environment.
        </p>

        <div className="text-left space-y-6">
          <div>
            <h2 className="font-bold text-lg text-zinc-700 mb-2">1. Go to the Secrets Tab</h2>
            <p className="text-zinc-500">
              In the AI Studio sidebar, click on the "Secrets" tab to manage your environment variables.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg text-zinc-700 mb-2">2. Add Your Supabase Credentials</h2>
            <p className="text-zinc-500 mb-4">
              You need to add two secrets. You can find these values in your Supabase project's API settings.
            </p>
            <div className="space-y-3">
              <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                <p className="font-mono text-sm text-zinc-700"><span className="font-bold">Name:</span> VITE_SUPABASE_URL</p>
                <p className="font-mono text-xs text-zinc-500 mt-1"><span className="font-bold">Value:</span> your-supabase-project-url</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                <p className="font-mono text-sm text-zinc-700"><span className="font-bold">Name:</span> VITE_SUPABASE_ANON_KEY</p>
                <p className="font-mono text-xs text-zinc-500 mt-1"><span className="font-bold">Value:</span> your-supabase-anon-key</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-bold text-lg text-zinc-700 mb-2">3. Refresh the Application</h2>
            <p className="text-zinc-500">
              Once you've added these secrets, the application will automatically restart. The app should then load correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseSetupInstructions;
