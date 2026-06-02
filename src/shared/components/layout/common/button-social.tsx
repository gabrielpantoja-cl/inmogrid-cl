// app/components/button-social.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/shared/components/ui/primitives/button";
import { createClient } from "@/shared/lib/supabase/client";

interface ButtonSocialProps {
  children: React.ReactNode;
  provider: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const ButtonSocial = ({ children, provider, className, onClick, disabled }: ButtonSocialProps) => {
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      if (onClick) {
        onClick();
      } else {
        const supabase = createClient();
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: provider as Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider'],
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (oauthError) {
          setError("Error al iniciar sesión. Por favor, inténtalo de nuevo.");
        }
      }
    } catch (err) {
      setError("Error al iniciar sesión. Por favor, inténtalo de nuevo.");
      console.error(err);
    }
  };

  return (
    <div>
      <Button onClick={handleClick} className={className} disabled={disabled}>
        {children}
      </Button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default ButtonSocial;
