'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/context/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/user-actions';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Group } from '@/lib/db-types';

const profileFormSchema = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters.').max(50, 'Display name is too long.'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, role } = useSettings();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const fetchGroup = async () => {
      if (user?.uid) {
        const userDocRef = doc(db!, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.groupId) {
            const groupDocRef = doc(db!, 'groups', userData.groupId);
            const groupDocSnap = await getDoc(groupDocRef);
            if (groupDocSnap.exists()) {
              setGroup({ id: groupDocSnap.id, ...groupDocSnap.data() } as Group);
            }
          }
        }
      }
    };
    fetchGroup();
  }, [user?.uid]);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || '',
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, values);
      toast({
        title: 'Profile Updated',
        description: 'Your display name has been successfully updated.',
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error updating your profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null; // Or a loading state
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight title-neon">
          My Profile
        </h1>
        <p className="text-muted-foreground">
          View and manage your account settings.
        </p>
      </div>

      <Card className="card-glass">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-primary/20">
              {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-2xl">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl">{user.displayName}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="mt-2 flex justify-center sm:justify-start gap-2">
                {role && (
                    <CardDescription>{role}</CardDescription>
                )}
                {group && (
                  <>
                    <Separator orientation='vertical' className='h-5' />
                    <CardDescription>Group: {group.name}</CardDescription>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <Input value={user.email || 'No email associated'} readOnly disabled />
              </FormItem>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
    </div>
  );
}
