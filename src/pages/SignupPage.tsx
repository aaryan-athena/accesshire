import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"jobseeker" | "employer">("jobseeker");
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // While a sign-up is in flight, let handleSubmit route to onboarding instead.
  if (user && !loading) return <Navigate to="/dashboard" replace />;

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("Please fill in all fields"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await signUpWithEmail(email, password, name, role);
    setLoading(false);
    if (error) { toast.error(error); } else {
      toast.success("Account created! Next: tell us what to account for when matching.");
      navigate(role === "employer" ? "/employers" : "/onboarding");
    }

  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold text-center">Create Account</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Join AccessHire and discover your potential</p>

          {/* Google Sign In */}
          <Button
            variant="outline"
            size="lg"
            className="mt-6 w-full gap-3"
            onClick={handleGoogle}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Role toggle */}
          <div className="flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => setRole("jobseeker")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${role === "jobseeker" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Job Seeker
            </button>
            <button
              onClick={() => setRole("employer")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${role === "employer" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Employer
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name">{role === "employer" ? "Company Name" : "Full Name"}</Label>
              <Input id="name" placeholder={role === "employer" ? "Acme Inc." : "Jane Doe"} value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default SignupPage;
