import { useProfile, useUpdateProfile, useDeleteData } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteData = useDeleteData();

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
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

  const onSubmit = async (values: any) => {
    try {
      await updateProfile.mutateAsync(values);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (type: 'sessions' | 'songs' | 'all') => {
    try {
      await deleteData.mutateAsync(type);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-xl">
      <h1 className="text-3xl font-display font-bold mb-8">Your Profile</h1>

      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4 font-display text-foreground">Personal Details</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Nashville, TN" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full rounded-xl mt-2 font-semibold"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </section>

      <section className="bg-red-50/50 rounded-2xl p-6 border border-red-100">
        <h2 className="text-xl font-bold mb-2 font-display text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Permanently delete your data. This action cannot be undone.
        </p>

        <div className="space-y-3">
          <DeleteDialog 
            title="Delete Session Data?"
            description="This will remove all your tracked dance sessions."
            onConfirm={() => handleDelete('sessions')}
            triggerLabel="Delete Session Data"
          />
          <DeleteDialog 
            title="Delete Song Library?"
            description="This will empty your song library."
            onConfirm={() => handleDelete('songs')}
            triggerLabel="Delete Song Library"
          />
          <DeleteDialog 
            title="Delete ALL Data?"
            description="This will wipe your account completely clean. Are you absolutely sure?"
            onConfirm={() => handleDelete('all')}
            triggerLabel="Delete All Data"
            variant="destructive"
          />
        </div>
      </section>
    </div>
  );
}

function DeleteDialog({ 
  title, 
  description, 
  onConfirm, 
  triggerLabel, 
  variant = "outline" 
}: any) {
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
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
