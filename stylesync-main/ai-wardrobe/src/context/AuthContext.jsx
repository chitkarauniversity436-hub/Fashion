import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const localGuest = localStorage.getItem("stylesync_guest");
    if (localGuest) {
      try {
        return JSON.parse(localGuest);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!localStorage.getItem("stylesync_guest")) {
        setUser(data.session?.user || null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!localStorage.getItem("stylesync_guest")) {
        setUser(session?.user || null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const continueAsGuest = () => {
    const guestUser = { id: "demo-user-1", email: "guest@stylesync.ai", name: "Guest User", isGuest: true };
    setUser(guestUser);
    localStorage.setItem("stylesync_guest", JSON.stringify(guestUser));
  };

  const signOut = async () => {
    localStorage.removeItem("stylesync_guest");
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase signOut error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, continueAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);