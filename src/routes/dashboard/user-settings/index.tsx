import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faChevronRight,
  faCog,
  faUser,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import { UserAvatar } from "@/components/ui/user-avatar";

export const Route = createFileRoute("/dashboard/user-settings/")({
  component: UserSettings,
  head: () => {
    const canonicalUrl = getCanonicalUrl("/dashboard/user-settings/");
    const title = "Account Settings - Profile & Preferences | Moneko";
    const description =
      "Manage Moneko account settings, update profile, customize preferences & control financial dashboard experience.";
    const keywords =
      "account settings, user profile, account management, dashboard preferences, financial account settings, profile customization, account security, user preferences";

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
    };
  },
});

function UserSettings() {
  const { user, resetPassword, changeEmail, deleteAccount, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || "",
  );
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setNewEmail(user?.email || "");
  }, [user?.email]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-t-2 border-b-2"></div>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) throw error;

      // Update the profile in the users table
      if (user) {
        const { error: profileError } = await supabase
          .from("users")
          .update({ full_name: fullName, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }

      setUpdateSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while updating your profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    setIsResetting(true);
    setError(null);
    setResetSuccess(false);

    try {
      await resetPassword(user.email, "/reset-password");
      setResetSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while sending reset email");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteAccount();
      await signOut();
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting your account");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeEmail = async () => {
    setError(null);
    setEmailChangeSuccess(false);

    const trimmedEmail = newEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Please enter a new email address");
      return;
    }

    if (trimmedEmail === (user?.email || "").toLowerCase()) {
      setError("Please use a different email address");
      return;
    }

    setIsChangingEmail(true);

    try {
      await changeEmail(trimmedEmail, "/dashboard/user-settings");
      setEmailChangeSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while changing your email");
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <div className="bg-moneko-background text-foreground dark:text-dark-foreground min-h-screen px-0 py-3 sm:px-4 sm:py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-mobile-lg text-foreground dark:text-dark-foreground mb-4 px-3 font-bold sm:mb-6 sm:px-0 sm:text-2xl md:text-3xl">
          Settings
        </h1>

        <div className="bg-card dark:bg-dark-card border-subtle-border dark:border-dark-subtle-border rounded-none border-0 p-4 shadow-none sm:rounded-xl sm:border sm:p-6 sm:shadow-lg md:rounded-2xl">
          <h2 className="text-mobile-base mb-4 font-semibold sm:mb-6 sm:text-lg md:text-xl">
            Profile Information
          </h2>

          {/* Avatar Section - Compact Mobile */}
          <div className="border-subtle-border dark:border-dark-subtle-border mb-4 border-b pb-4 sm:mb-6 sm:pb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <UserAvatar
                  size="lg"
                  showPremiumBorder={true}
                  showPremiumCrown={true}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-mobile-sm text-foreground dark:text-dark-foreground mb-0.5 font-medium sm:mb-1 sm:text-sm">
                  Profile Avatar
                </h3>
                <p className="text-mobile-xs text-muted-foreground dark:text-dark-muted-foreground mb-2 sm:mb-3 sm:text-xs">
                  Customize your avatar
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/avatar-customizer",
                      search: { redirect: undefined },
                    })
                  }
                  className="text-mobile-sm flex min-h-[44px] items-center gap-2 sm:text-sm"
                >
                  <FontAwesomeIcon icon={faPen} className="size-3" />
                  <span>Edit Avatar</span>
                </Button>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleUpdateProfile}
            className="space-y-4 sm:space-y-6"
          >
            <div>
              <label
                htmlFor="currentEmail"
                className="text-mobile-sm text-foreground dark:text-dark-foreground mb-1.5 block font-medium sm:text-sm"
              >
                Current Email
              </label>
              <Input
                id="currentEmail"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-input-disabled dark:bg-dark-input-disabled text-mobile-base sm:text-base"
              />
            </div>

            <div>
              <label
                htmlFor="newEmail"
                className="text-mobile-sm text-foreground dark:text-dark-foreground mb-1.5 block font-medium sm:text-sm"
              >
                New Email
              </label>
              <div className="space-y-2">
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your new email"
                  required
                  className="bg-input dark:bg-dark-input text-mobile-base sm:text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChangeEmail}
                  disabled={isChangingEmail}
                  className="text-mobile-sm min-h-[44px] sm:text-sm"
                >
                  {isChangingEmail ? "Sending Confirmation..." : "Change Email"}
                </Button>
              </div>
              <p className="text-mobile-xs text-muted-foreground dark:text-dark-muted-foreground mt-1 sm:text-xs">
                We&apos;ll send a confirmation email to complete this change.
              </p>
              {emailChangeSuccess && (
                <div className="text-success dark:text-dark-success text-mobile-sm mt-2 sm:text-sm">
                  Confirmation email sent. Please check your inbox to finish updating your email. If you didn't see it, check also the junk/spam folder.
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="fullName"
                className="text-mobile-sm text-foreground dark:text-dark-foreground mb-1.5 block font-medium sm:text-sm"
              >
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="bg-input dark:bg-dark-input text-mobile-base sm:text-base"
              />
            </div>

            {error && (
              <div className="text-danger dark:text-dark-danger text-mobile-sm bg-danger-light dark:bg-dark-danger-light rounded-lg p-2.5 sm:p-3 sm:text-sm">
                {error}
              </div>
            )}

            {updateSuccess && (
              <div className="text-success dark:text-dark-success text-mobile-sm bg-success-light dark:bg-dark-success-light rounded-lg p-2.5 sm:p-3 sm:text-sm">
                Profile updated successfully!
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={isUpdating}
                className="text-mobile-sm min-h-[44px] w-full text-white sm:w-auto sm:text-sm"
              >
                {isUpdating ? "Updating..." : "Update Information"}
              </Button>
            </div>
          </form>

          <div className="border-subtle-border dark:border-dark-subtle-border mt-6 border-t pt-4 sm:mt-8 sm:pt-6">
            <h2 className="text-mobile-base mb-3 font-semibold sm:mb-4 sm:text-lg">
              Account Settings
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-mobile-sm text-foreground dark:text-dark-foreground font-medium sm:text-sm">
                  Change Password
                </h3>
                <Button
                  variant="outline"
                  className="text-mobile-sm mt-2 min-h-[44px] sm:text-sm"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                >
                  {isResetting ? "Sending Reset Email..." : "Reset Password"}
                </Button>
                {resetSuccess && (
                  <div className="text-success dark:text-dark-success text-mobile-sm mt-2 sm:text-sm">
                    Password reset email sent! Check your inbox.
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-mobile-sm text-danger dark:text-dark-danger font-medium sm:text-sm">
                  Danger Zone
                </h3>
                <Button
                  variant="outline"
                  className="text-danger dark:text-dark-danger border-danger/50 dark:border-dark-danger/50 hover:bg-danger-light dark:hover:bg-dark-danger-light text-mobile-sm mt-2 min-h-[44px] sm:text-sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  Delete Account
                </Button>

                {showDeleteConfirm && (
                  <div className="border-danger/20 bg-danger-light dark:bg-dark-danger-light mt-3 rounded-lg border p-3 sm:mt-4 sm:p-4">
                    <h4 className="text-danger dark:text-dark-danger text-mobile-sm mb-2 font-medium sm:text-sm">
                      Are you sure?
                    </h4>
                    <p className="text-mobile-sm text-danger dark:text-dark-danger mb-3 sm:mb-4 sm:text-sm">
                      This action cannot be undone. All your data will be
                      permanently deleted.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="text-mobile-sm min-h-[44px] sm:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-danger dark:text-dark-danger border-danger/50 dark:border-dark-danger/50 hover:bg-danger-light dark:hover:bg-dark-danger-light text-mobile-sm min-h-[44px] sm:text-sm"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
