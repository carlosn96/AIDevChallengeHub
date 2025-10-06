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
import { updateUserProfile, getGroups, getUserProfile } from '@/lib/user-actions';
import { Loader2 } from 'lucide-react';
import { type Group } from '@/lib/db-types';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters.').max(50, 'Display name is too long.'),
  groupId: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, role } = useSettings();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [localDisplayName, setLocalDisplayName] = useState(user?.displayName || '');
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const groupOptions = [
    { value: 'none', label: 'No group' },
    ...groups.map(g => ({ value: g.id, label: g.name }))
  ];

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      groupId: 'none',
    },
  });

  useEffect(() => {
    async function fetchData() {
      if (user?.uid) {
        setIsLoading(true);
        const availableGroups = await getGroups();
        setGroups(availableGroups);

        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          const currentName = userProfile.displayName || user.displayName || '';
          const currentGroupId = userProfile.groupId || 'none';

          setLocalDisplayName(currentName);
          
          // Use setValue instead of reset to update form values correctly
          form.setValue('displayName', currentName);
          if (role === 'Student') {
            form.setValue('groupId', currentGroupId);
          }

          if (currentGroupId !== 'none') {
            const currentGroup = availableGroups.find(g => g.id === currentGroupId);
            setGroup(currentGroup || null);
          } else {
            setGroup(null);
          }
        }
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user?.uid, role]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const dataToUpdate: { displayName: string; groupId?: string | null } = {
        displayName: values.displayName,
      };

      if (role === 'Student') {
        dataToUpdate.groupId = values.groupId === 'none' ? null : values.groupId;
      }

      await updateUserProfile(user.uid, dataToUpdate);

      // Eagerly update local state for immediate UI feedback
      setLocalDisplayName(values.displayName);
      if (role === 'Student') {
        if (dataToUpdate.groupId) {
          setGroup(groups.find(g => g.id === dataToUpdate.groupId) || null);
        } else {
          setGroup(null);
        }
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
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
    return null;
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
        {isLoading ? (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2 text-center sm:text-left">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <Separator className="my-6" />
            <div className="space-y-6">
              <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-full" /></div>
              {role === 'Student' && <div className="space-y-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-10 w-full" /></div>}
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ) : (
          <>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-primary/20">
                  {user.photoURL && <AvatarImage src={user.photoURL} alt={localDisplayName || 'User'} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-2xl">
                    {getInitials(localDisplayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-2xl">{localDisplayName}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                  <div className="mt-2 flex justify-center sm:justify-start gap-2">
                    {role && (
                        <CardDescription>{role}</CardDescription>
                    )}
                    {group && role === 'Student' && (
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

                  {role === 'Student' && (
                    <FormField
                      control={form.control}
                      name="groupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group</FormLabel>
                          <FormControl>
                            <Combobox
                              options={groupOptions}
                              value={field.value || 'none'}
                              onChange={field.onChange}
                              placeholder="Select your group..."
                              searchPlaceholder="Search groups..."
                              notFoundMessage="No groups available."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
