import { AuthForm } from '@/components/auth/AuthForm';

const Auth = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground mb-2">
          Clarity
        </h1>
        <p className="text-lg font-body text-muted-foreground">
          The Mindful Focus System
        </p>
      </div>
      <AuthForm />
    </div>
  );
};

export default Auth;
