'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/context/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getGroups, getUserProfile } from '@/lib/user-actions';
import { ArrowLeft, Loader2, User, Mail, Shield, Users, Check, X, ChevronDown } from 'lucide-react';
import { type Group } from '@/lib/db-types';

interface ProfileData {
  displayName: string;
  groupId: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, role } = useSettings();
  const { toast } = useToast();

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState<ProfileData>({
    displayName: '',
    groupId: 'none',
  });

  // Original data for comparison
  const [originalData, setOriginalData] = useState<ProfileData>({
    displayName: '',
    groupId: 'none',
  });

  // Additional data
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  // Validation
  const [errors, setErrors] = useState<{ displayName?: string }>({});

  // Helper functions
  const getInitials = (name: string): string => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const hasChanges = (): boolean => {
    return (
      formData.displayName !== originalData.displayName ||
      formData.groupId !== originalData.groupId
    );
  };

  // Load initial data
  useEffect(() => {
    let isMounted = true;

    const loadProfileData = async () => {
      if (!user?.uid) {
        setIsInitialLoading(false);
        return;
      }

      try {
        // Load groups
        const groups = await getGroups();
        
        // Load user profile
        const profile = await getUserProfile(user.uid);

        if (!isMounted) return;

        setAvailableGroups(groups);

        if (profile) {
          const displayName = profile.displayName || user.displayName || '';
          const groupId = profile.groupId || 'none';

          const data: ProfileData = {
            displayName,
            groupId,
          };

          setFormData(data);
          setOriginalData(data);

          // Set selected group
          if (groupId !== 'none') {
            const group = groups.find((g) => g.id === groupId);
            setSelectedGroup(group || null);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        if (isMounted) {
          toast({
            variant: 'destructive',
            title: 'Error Loading Profile',
            description: 'Failed to load your profile data. Please refresh the page.',
          });
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.displayName, toast]);

  // Validation
  const validateDisplayName = (name: string): string | undefined => {
    if (!name || name.trim().length === 0) {
      return 'Display name is required';
    }
    if (name.trim().length < 3) {
      return 'Display name must be at least 3 characters';
    }
    if (name.trim().length > 50) {
      return 'Display name must be less than 50 characters';
    }
    return undefined;
  };

  // Event handlers
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, displayName: value }));
    
    // Clear error when user starts typing
    if (errors.displayName) {
      setErrors((prev) => ({ ...prev, displayName: undefined }));
    }
  };

  const handleGroupChange = (groupId: string) => {
    setFormData((prev) => ({ ...prev, groupId }));
    setIsGroupDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-group-dropdown]')) {
        setIsGroupDropdownOpen(false);
      }
    };

    if (isGroupDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isGroupDropdownOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) return;

    // Validate
    const nameError = validateDisplayName(formData.displayName);
    if (nameError) {
      setErrors({ displayName: nameError });
      return;
    }

    setIsSaving(true);

    try {
      const updateData: { displayName: string; groupId?: string | null } = {
        displayName: formData.displayName.trim(),
      };

      if (role === 'Student') {
        updateData.groupId = formData.groupId === 'none' ? null : formData.groupId;
      }

      await updateUserProfile(user.uid, updateData);

      // Update original data
      setOriginalData({ ...formData });

      // Update selected group
      if (formData.groupId !== 'none') {
        const group = availableGroups.find((g) => g.id === formData.groupId);
        setSelectedGroup(group || null);
      } else {
        setSelectedGroup(null);
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update your profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...originalData });
    setErrors({});
  };

  // Loading state
  if (isInitialLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>
            You must be logged in to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Page Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <Avatar className="h-24 w-24 border-4 border-primary/10">
                {user.photoURL ? (
                  <AvatarImage src={user.photoURL} alt={originalData.displayName} />
                ) : null}
                <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary/20 to-primary/5">
                  {getInitials(originalData.displayName)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm font-semibold truncate">
                    {originalData.displayName || 'Not set'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm font-semibold truncate">{user.email}</p>
                </div>
              </div>

              {role && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <p className="text-sm font-semibold">{role}</p>
                    </div>
                  </div>
                </>
              )}

              {role === 'Student' && selectedGroup && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Group</p>
                      <p className="text-sm font-semibold">{selectedGroup.name}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your profile information below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleDisplayNameChange}
                  placeholder="Enter your display name"
                  className={errors.displayName ? 'border-destructive' : ''}
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.displayName}
                  </p>
                )}
              </div>

              {/* Group Selection (Students only) */}
              {role === 'Student' && (
                <div className="space-y-2">
                  <Label htmlFor="groupId">Group</Label>
                  <div className="relative" data-group-dropdown>
                    <button
                      type="button"
                      onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className={formData.groupId === 'none' ? 'text-muted-foreground' : ''}>
                        {formData.groupId === 'none' 
                          ? 'No group' 
                          : availableGroups.find(g => g.id === formData.groupId)?.name || 'No group'}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isGroupDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md animate-in fade-in-0 zoom-in-95">
                        <div className="max-h-60 overflow-auto p-1">
                          <button
                            type="button"
                            onClick={() => handleGroupChange('none')}
                            className={`w-full rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors ${
                              formData.groupId === 'none' ? 'bg-accent' : ''
                            }`}
                          >
                            No group
                          </button>
                          {availableGroups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => handleGroupChange(group.id)}
                              className={`w-full rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors ${
                                formData.groupId === group.id ? 'bg-accent' : ''
                              }`}
                            >
                              {group.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select the group you belong to
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving || !hasChanges() || !!errors.displayName}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>

                {hasChanges() && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {!hasChanges() && !errors.displayName && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  All changes saved
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}