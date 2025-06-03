import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import brandLogo from '../assets/brand.jpg';

export default function LoginPage() {
  const { signIn } = useAuth();
  const nav        = useNavigate();

  const [email, setEmail]   = useState('');
  const [pass,  setPass]    = useState('');
  const [show,  setShow]    = useState(false);
  const [err,   setErr]     = useState<string | null>(null);

  async function handle(e: FormEvent) {
    e.preventDefault();
    try {
      await signIn(email, pass);
      nav('/dashboard');
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div
    className="min-h-screen flex items-center justify-center
                bg-gradient-to-br from-[#2F528A] via-[#233E72] to-[#16213E]
                dark:bg-gray-900"
    >
      <form
        onSubmit={handle}
        className="w-full max-w-sm bg-gray-100 dark:bg-gray-800
                   border border-gray-200 dark:border-gray-700
                   p-6 rounded-lg shadow-md"
      >
        <img
          src={brandLogo}
          alt="i4Ops logo"
          className="h-14 mx-auto mb-4 rounded"
        />

        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-100">
          Sign in
        </h2>

        {err && (
          <p className="text-red-600 mb-4 text-center text-sm">{err}</p>
        )}

        {/* email */}
        <label className="block mb-2 text-sm">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-gray-100"
        />

        {/* password + eye */}
        <label className="block mb-2 text-sm">Password</label>
        <div className="relative mb-6">
          <input
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            className="w-full p-2 pr-10 border rounded dark:bg-gray-700 dark:text-gray-100"
          />
          <button
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            title={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow((s) => !s)}
            onKeyDown={(e) => {
              if (e.code === 'Space') {
                e.preventDefault();
                setShow((s) => !s);
              }
            }}
            className="absolute inset-y-0 right-2 flex items-center text-gray-500
                       dark:text-gray-300 hover:text-gray-700 focus:outline-none"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}