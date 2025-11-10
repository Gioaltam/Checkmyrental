"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Globe, Lock, CreditCard, Check, Eye, EyeOff, Target, DollarSign } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [email, setEmail] = useState("juliana@checkmyrental.com");
  const [emailSaved, setEmailSaved] = useState(false);
  const [language, setLanguage] = useState("en");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [billingSaved, setBillingSaved] = useState(false);
  const [savingsTarget, setSavingsTarget] = useState<string>("50000");
  const [targetSaved, setTargetSaved] = useState(false);

  // Load savings target from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('annualSavingsTarget');
      if (saved) {
        setSavingsTarget(saved);
      }
    }
  }, []);

  const handleEmailSave = () => {
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
  };

  const handlePasswordChange = () => {
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    // Here you would call the API to change password
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const handleBillingUpdate = () => {
    setBillingSaved(true);
    setTimeout(() => setBillingSaved(false), 3000);
  };

  const handleTargetSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('annualSavingsTarget', savingsTarget);
    }
    setTargetSaved(true);
    setTimeout(() => setTargetSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[rgb(10,10,10)] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl py-4">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="text-sm text-white/60">
              Account Settings
            </div>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-white/70">Manage your account preferences and billing information</p>
        </div>

        <div className="grid gap-6 max-w-3xl">
          {/* Email Settings */}
          <div className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Email Address</h2>
                <p className="text-sm text-white/60">Update your account email</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all"
                  placeholder="Enter your email address"
                />
              </div>
              <button
                onClick={handleEmailSave}
                className="px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all font-medium flex items-center gap-2"
              >
                {emailSaved ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Saved
                  </>
                ) : (
                  "Save Email"
                )}
              </button>
            </div>
          </div>

          {/* Language Settings */}
          <div className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Language</h2>
                <p className="text-sm text-white/60">Choose your preferred language</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-white/70 mb-2">
                  Display Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                </select>
              </div>
              <p className="text-xs text-white/50">
                This will change the language across your entire dashboard
              </p>
            </div>
          </div>

          {/* Password Settings */}
          <div className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Password</h2>
                <p className="text-sm text-white/60">Update your account password</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-white/70 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border border-white/10 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-white/70 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border border-white/10 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-white/70 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border border-white/10 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {passwordError}
                </div>
              )}

              <button
                onClick={handlePasswordChange}
                className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 transition-all font-medium flex items-center gap-2"
              >
                {passwordSaved ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Password Updated
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </div>

          {/* Billing Settings */}
          <div className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Billing & Subscription</h2>
                <p className="text-sm text-white/60">Manage your subscription and payment methods</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current Plan */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-white/70">Current Plan</span>
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-sm font-semibold">
                    Premium
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Monthly billing</span>
                    <span className="text-white font-medium">$49.99/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Next billing date</span>
                    <span className="text-white">November 11, 2024</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-white/70">Payment Method</span>
                  <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    Edit
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                    <p className="text-xs text-white/60">Expires 12/25</p>
                  </div>
                </div>
              </div>

              {/* Billing Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all font-medium">
                  Change Plan
                </button>
                <button className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all font-medium">
                  Update Payment
                </button>
              </div>

              <button
                onClick={handleBillingUpdate}
                className="w-full px-4 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 transition-all font-medium flex items-center justify-center gap-2"
              >
                {billingSaved ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Billing Updated
                  </>
                ) : (
                  "View Billing History"
                )}
              </button>

              {/* Cancel Subscription */}
              <div className="pt-4 border-t border-white/10">
                <button className="text-sm text-white/50 hover:text-red-400 transition-colors">
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>

          {/* Savings Target Settings */}
          <div className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Annual Savings Target</h2>
                <p className="text-sm text-white/60">Set your annual savings goal for portfolio management</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="savings-target" className="block text-sm font-medium text-white/70 mb-2">
                  Target Amount (USD)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                    <DollarSign className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <input
                    id="savings-target"
                    type="number"
                    value={savingsTarget}
                    onChange={(e) => setSavingsTarget(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
                    placeholder="50000"
                    min="0"
                    step="1000"
                  />
                </div>
                <p className="text-xs text-white/50 mt-2">
                  This target will be used to track your progress in the Analytics dashboard
                </p>
              </div>

              {/* Target Visualization */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/70">Your Target</span>
                  <span className="text-lg font-bold text-green-400">
                    ${Number(savingsTarget || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  This represents your goal for total annual savings across all properties through preventive maintenance, energy efficiency, and cost avoidance.
                </p>
              </div>

              <button
                onClick={handleTargetSave}
                className="px-6 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 transition-all font-medium flex items-center gap-2"
              >
                {targetSaved ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Target Saved
                  </>
                ) : (
                  "Save Target"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}