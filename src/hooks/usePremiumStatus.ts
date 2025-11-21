import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const usePremiumStatus = (user: User | null) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      if (!user) {
        setIsPremium(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", user.id)
          .single();

        if (error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching premium status:", error);
          }
          setIsPremium(false);
        } else {
          setIsPremium(profile?.is_premium || false);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching premium status:", error);
        }
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPremiumStatus();
  }, [user]);

  return { isPremium, isLoading };
};
