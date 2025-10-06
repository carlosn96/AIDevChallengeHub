
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/context/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getGroups, getUserProfile } from '@/lib/user-actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import { type Group } from '@/lib/db-types';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  displayName: z.string()
    .min(3, { message: 'Display name must be at least 3 characters.' })
    .max(50, { message: 'Display name is too long.' }),
  groupId: z.string(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, role, isLoading: isAuthLoading } = useSettings();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Display state
  const [currentDisplayName, setCurrentDisplayName] = useState('');
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      groupId: 'none',
    },
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const groupOptions = [
    { value: 'none', label: 'No group' },
    ...groups.map(g => ({ value: g.id, label: g.name }))
  ];

  // Load data and set form values
  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      if (!user?.uid) {
        if (mounted) setIsLoading(false);
        return;
      }
      
      try {
        if(mounted) setIsLoading(true);
        
        const availableGroups = await getGroups();
        if (!mounted) return;
        setGroups(availableGroups);

        const userProfile = await getUserProfile(user.uid);
        if (!mounted) return;
        
        if (userProfile) {
          const name = userProfile.displayName || user.displayName || '';
          const gId = userProfile.groupId || 'none';
          
          setCurrentDisplayName(name);
          
          // This is the correct way to set form values after async load
          form.setValue('displayName', name);
          form.setValue('groupId', gId);
          
          if (gId !== 'none') {
            const grp = availableGroups.find(g => g.id === gId);
            setCurrentGroup(grp || null);
          } else {
            setCurrentGroup(null);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load profile data.',
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadData();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]); 

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    try {
      const dataToUpdate: { displayName: string; groupId?: string | null } = {
        displayName: data.displayName.trim(),
      };

      if (role === 'Student') {
        dataToUpdate.groupId = data.groupId === 'none' ? null : data.groupId;
      }

      await updateUserProfile(user.uid, dataToUpdate);

      setCurrentDisplayName(data.displayName.trim());
      if (role === 'Student') {
        if (dataToUpdate.groupId) {
          const grp = groups.find(g => g.id === dataToUpdate.groupId);
          setCurrentGroup(grp || null);
        } else {
          setCurrentGroup(null);
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

  if (isAuthLoading) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight title-neon">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            View and manage your account settings.
          </p>
        </div>
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
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              {role === 'Student' && (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ) : (
          <>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-primary/20">
                  {user?.photoURL && (
                    <AvatarImage src={user.photoURL} alt={currentDisplayName || 'User'} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-2xl">
                    {getInitials(currentDisplayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-2xl">{currentDisplayName}</CardTitle>
                  <CardDescription>{user?.email}</CardDescription>
                  <div className="mt-2 flex justify-center sm:justify-start gap-2">
                    {role && <CardDescription>{role}</CardDescription>}
                    {currentGroup && role === 'Student' && (
                      <>
                        <Separator orientation="vertical" className="h-5" />
                        <CardDescription>Group: {currentGroup.name}</CardDescription>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Separator />
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter your display name"
                    {...form.register('displayName')}
                  />
                  {form.formState.errors.displayName && (
                    <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
                  )}
                </div>

                {role === 'Student' && (
                  <div className="space-y-2">
                    <Label htmlFor="group">Group</Label>
                    <Combobox
                      options={groupOptions}
                      value={form.watch('groupId')}
                      onChange={(value) => form.setValue('groupId', value, { shouldDirty: true })}
                      placeholder="Select your group..."
                      searchPlaceholder="Search groups..."
                      notFoundMessage="No groups available."
                    />
                  </div>
                )}

                <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
