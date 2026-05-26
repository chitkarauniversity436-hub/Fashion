import { useProfile } from "@/context/ProfileContext";
import { useState } from "react";
import { User, Save } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  const [form, setForm] = useState(profile);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(form);
    toast.success("Profile saved successfully!");
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {form.avatar ? (
              <img src={form.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{form.name || "My Profile"}</h1>
            <p className="text-sm text-muted-foreground">{form.email || "Manage your personal information"}</p>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 font-sans">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring font-sans"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 font-sans">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring font-sans"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 font-sans">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-4 py-2.5 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring font-sans"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 font-sans">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Enter your address"
                rows={3}
                className="w-full px-4 py-2.5 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring font-sans resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 font-sans">Avatar URL</label>
              <input
                type="url"
                value={form.avatar}
                onChange={(e) => handleChange("avatar", e.target.value)}
                placeholder="Paste an image URL for your avatar"
                className="w-full px-4 py-2.5 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring font-sans"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
