'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type LoginSettings } from '@/lib/db-types';
import { updateLoginSettings } from '@/lib/user-actions';
import { Loader2, Settings, Lock, Unlock } from 'lucide-react';

type SettingsManagementProps = {
  settings: LoginSettings | null;
};

const settingsSchema = z.object({
  enabled: z.boolean(),
  disabledMessage: z.string().min(10, 'The message must be at least 10 characters long.'),
});

export default function SettingsManagement({ settings }: SettingsManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      enabled: true,
      disabledMessage: 'Login is currently disabled by an administrator.',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    setIsSubmitting(true);
    try {
      await updateLoginSettings(values);
      toast({
        title: 'Settings Updated',
        description: 'Login settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error saving the settings. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>Manage global application settings like login access.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-8">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enable User Login
                    </FormLabel>
                    <FormDescription>
                      Allow or prevent users from signing into the application.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <div className="flex items-center gap-2">
                       {field.value ? <Unlock className="text-green-500" /> : <Lock className="text-red-500" />}
                       <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="disabledMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login Disabled Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., The competition is now over. Logins are disabled until the next event."
                      {...field}
                      rows={3}
                      disabled={form.watch('enabled')}
                    />
                  </FormControl>
                  <FormDescription>
                    This message will be shown on the login page when login is disabled.
                  </FormDescription>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
