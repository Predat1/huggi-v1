import React, { useState } from 'react';
import { signIn, signUp, signOut } from '@/lib/supabaseClient';
import { LogOut, LogIn } from 'lucide-react';

interface AuthFormProps {
  isSignUp?: boolean;
  onSuccess?: () => void;
}

export function AuthForm({ isSignUp = false, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUpMode, setIsSignUpMode] = useState(isSignUp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = isSignUpMode
        ? await signUp(email, password)
        : await signIn(email, password);

      if (authError) {
        setError(authError);
      } else {
        setEmail('');
        setPassword('');
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {isSignUpMode ? 'Créer un compte' : 'Se connecter'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogIn size={18} />
          {loading
            ? 'En cours...'
            : isSignUpMode
              ? 'Créer un compte'
              : 'Se connecter'}
        </button>
      </form>

      <button
        onClick={() => {
          setIsSignUpMode(!isSignUpMode);
          setError(null);
        }}
        className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        {isSignUpMode ? 'Vous avez un compte? Se connecter' : "Pas de compte? S'inscrire"}
      </button>
    </div>
  );
}

interface AuthStatusProps {
  user?: { email: string } | null;
  onSignOut?: () => void;
}

export function AuthStatus({ user, onSignOut }: AuthStatusProps) {
  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  if (!user) {
    return <div className="text-gray-500">Non connecté</div>;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-700">Connecté en tant que: {user.email}</span>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        <LogOut size={16} />
        Déconnexion
      </button>
    </div>
  );
}
