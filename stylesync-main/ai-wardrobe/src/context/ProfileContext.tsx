import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
}

const defaultProfile: UserProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  avatar: "",
};

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
  isProfileComplete: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth() as any;
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`stylesync_profile_${user.id || user.email}`);
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        setProfile({
          name: user.user_metadata?.full_name || user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          address: "",
          avatar: "",
        });
      }
    } else {
      setProfile(defaultProfile);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`stylesync_profile_${user.id || user.email}`, JSON.stringify(profile));
    }
  }, [profile, user]);

  const updateProfile = (data: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
  };

  const isProfileComplete = !!(profile.name && profile.email);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, isProfileComplete }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
