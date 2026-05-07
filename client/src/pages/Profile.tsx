import { useState, useRef } from "react";
import honkyTonkLogo from "@assets/HonkyTonk_Cropped_(Black)_1778181896344.png";
import { useLocation } from "wouter";
import { useProfile, useUpdateProfile, useDeleteData } from "@/hooks/use-profile";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, LogOut, ArrowLeft, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string(),
  location: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function resizeImageToBase64(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteData = useDeleteData();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      location: profile?.location || "",
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(values);
      toast({ title: "Profile saved!" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (type: "sessions" | "songs" | "all") => {
    try {
      await deleteData.mutateAsync(type);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please choose an image under 5MB.", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    try {
      const base64 = await resizeImageToBase64(file, 200);
      const res = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: base64 }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buddies"] });
      toast({ title: "Profile photo updated!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: null }),
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buddies"] });
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Your Profile</h1>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground gap-2"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Button>
      </div>

      {/* Avatar Section */}
      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6">
        <h2 className="text-xl font-bold mb-4 font-display text-foreground">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-primary text-3xl">
                  {profile?.firstName?.charAt(0) || "D"}
                </span>
              )}
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="space-y-2 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              data-testid="input-avatar-file"
            />
            <Button
              variant="outline"
              className="w-full rounded-xl border-2 gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              data-testid="button-upload-avatar"
            >
              <Camera className="w-4 h-4" />
              {profile?.avatar ? "Change Photo" : "Upload Photo"}
            </Button>
            {profile?.avatar && (
              <Button
                variant="ghost"
                className="w-full rounded-xl text-muted-foreground hover:text-destructive text-sm"
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
                data-testid="button-remove-avatar"
              >
                Remove Photo
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Resized automatically. Max 5MB.</p>
          </div>
        </div>
      </section>

      {/* Personal Details */}
      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6">
        <h2 className="text-xl font-bold mb-4 font-display text-foreground">Personal Details</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Username — read only */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <Input
                value={profile?.username || ""}
                readOnly
                disabled
                className="rounded-xl bg-muted/50 text-muted-foreground cursor-not-allowed opacity-80"
                data-testid="input-profile-username"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl><Input placeholder="John" className="rounded-xl" data-testid="input-profile-firstname" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl><Input placeholder="Doe" className="rounded-xl" data-testid="input-profile-lastname" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl><Input placeholder="Nashville, TN" className="rounded-xl" data-testid="input-profile-location" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full rounded-xl mt-2 font-semibold" disabled={updateProfile.isPending} data-testid="button-save-profile">
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </section>

      {/* Sign Out — above Danger Zone, red styling */}
      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6">
        <h2 className="text-xl font-bold mb-3 font-display text-foreground">Account</h2>
        <Button
          variant="outline"
          className="w-full rounded-xl border-2 justify-start gap-2 text-destructive hover:text-destructive hover:bg-red-50 border-red-200 hover:border-red-300"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50/50 rounded-2xl p-6 border border-red-100">
        <h2 className="text-xl font-bold mb-2 font-display text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-6">Permanently delete your data. This cannot be undone.</p>
        <div className="space-y-3">
          <DeleteDialog title="Delete Session Data?" description="This will remove all your tracked dance sessions." onConfirm={() => handleDelete("sessions")} triggerLabel="Delete Session Data" />
          <DeleteDialog title="Delete Song Library?" description="This will empty your song library." onConfirm={() => handleDelete("songs")} triggerLabel="Delete Song Library" />
          <DeleteDialog title="Delete ALL Data?" description="This will wipe your account data completely. Are you absolutely sure?" onConfirm={() => handleDelete("all")} triggerLabel="Delete All Data" variant="destructive" />
        </div>
      </section>

      {/* Credits */}
      <div className="border-t border-border/30 pt-6 pb-2 text-center space-y-1">
        <p className="text-xs text-muted-foreground/50">By Austin Brady Goodwin</p>
        <p className="text-xs text-muted-foreground/40">Created for dancers, by dancers</p>
        <p className="text-xs text-muted-foreground/40 font-display tracking-wide mt-1">Honky Tonk Heat</p>
        <div className="flex justify-center mt-2">
          <img src={honkyTonkLogo} alt="Honky Tonk Heat" className="h-28 w-auto opacity-75" />
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ title, description, onConfirm, triggerLabel, variant = "outline" }: any) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start rounded-xl",
            variant === "destructive"
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
              : "text-destructive hover:bg-red-100 hover:text-destructive border-red-200"
          )}
          data-testid={`button-delete-${triggerLabel.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
