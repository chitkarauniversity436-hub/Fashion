import { useState } from "react";
import { Bell, Shield, CreditCard, User, Mail, Phone, MapPin, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    marketing: false,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    dataSharing: false,
    analytics: true,
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleNotificationChange = (key, value) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handlePrivacyChange = (key, value) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPassword(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  const handleSavePrivacy = () => {
    toast.success("Privacy settings saved!");
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      toast.error("New passwords don't match!");
      return;
    }
    if (password.new.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }
    toast.success("Password changed successfully!");
    setPassword({ current: "", new: "", confirm: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and security</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Notifications Section */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-foreground">Email Notifications</label>
                  <p className="text-sm text-muted-foreground">Receive order updates and important announcements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => handleNotificationChange("email", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-foreground">Push Notifications</label>
                  <p className="text-sm text-muted-foreground">Get instant notifications on your device</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={(e) => handleNotificationChange("push", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-foreground">SMS Notifications</label>
                  <p className="text-sm text-muted-foreground">Receive text messages for order updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.sms}
                    onChange={(e) => handleNotificationChange("sms", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-foreground">Marketing Communications</label>
                  <p className="text-sm text-muted-foreground">Receive promotional offers and newsletters</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.marketing}
                    onChange={(e) => handleNotificationChange("marketing", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={handleSaveNotifications}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                Save Notification Settings
              </button>
            </div>
          </div>

          {/* Privacy & Security Section */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Privacy & Security</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-medium text-foreground mb-2">Profile Visibility</label>
                <select
                  value={privacy.profileVisibility}
                  onChange={(e) => handlePrivacyChange("profileVisibility", e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-foreground">Data Sharing</label>
                  <p className="text-sm text-muted-foreground">Allow sharing of anonymized data for service improvement</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacy.dataSharing}
                    onChange={(e) => handlePrivacyChange("dataSharing", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-foreground">Analytics</label>
                  <p className="text-sm text-muted-foreground">Help improve our service with usage analytics</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacy.analytics}
                    onChange={(e) => handlePrivacyChange("analytics", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={handleSavePrivacy}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                Save Privacy Settings
              </button>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={password.current}
                    onChange={(e) => handlePasswordChange("current", e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 pr-10 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={password.new}
                    onChange={(e) => handlePasswordChange("new", e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 pr-10 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={password.confirm}
                    onChange={(e) => handlePasswordChange("confirm", e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 pr-10 rounded-md bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Change Password
              </button>
            </form>
          </div>

          {/* Payment Methods Section */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Payment Methods</h2>
            </div>

            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No payment methods saved yet</p>
              <button className="px-6 py-2 border border-border rounded-md hover:bg-muted transition-colors">
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}