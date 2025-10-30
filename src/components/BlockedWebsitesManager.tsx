import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Shield, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BlockedWebsite {
  id: string;
  url_pattern: string;
  name: string | null;
  is_active: boolean;
}

const BlockedWebsitesManager = () => {
  const [websites, setWebsites] = useState<BlockedWebsite[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlockedWebsites();
  }, []);

  const fetchBlockedWebsites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocked_websites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error) {
      console.error('Error fetching blocked websites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blocked websites',
        variant: 'destructive',
      });
    }
  };

  const addBlockedWebsite = async () => {
    if (!newUrl.trim()) {
      toast({
        title: 'Invalid input',
        description: 'Please enter a URL pattern',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_websites')
        .insert({
          user_id: user.id,
          url_pattern: newUrl.trim(),
          name: newName.trim() || null,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Website added to block list',
      });

      setNewUrl('');
      setNewName('');
      fetchBlockedWebsites();
    } catch (error: any) {
      console.error('Error adding blocked website:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add website',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBlockedWebsite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_websites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Website removed from block list',
      });

      fetchBlockedWebsites();
    } catch (error) {
      console.error('Error deleting blocked website:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove website',
        variant: 'destructive',
      });
    }
  };

  const toggleWebsiteActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('blocked_websites')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      fetchBlockedWebsites();
    } catch (error) {
      console.error('Error toggling website:', error);
      toast({
        title: 'Error',
        description: 'Failed to update website',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Website Blocking
        </CardTitle>
        <CardDescription>
          Manage websites to block during focus sessions. Requires the Clarity browser extension.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Website Form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="URL pattern (e.g., *://*.youtube.com/*)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlockedWebsite()}
              className="flex-1"
            />
            <Input
              placeholder="Name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlockedWebsite()}
              className="w-48"
            />
            <Button onClick={addBlockedWebsite} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Examples: *://*.reddit.com/*, *://*.twitter.com/*, *://facebook.com/*
          </p>
        </div>

        {/* Blocked Websites List */}
        <div className="space-y-2">
          {websites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No blocked websites yet</p>
              <p className="text-sm mt-1">Add websites to block during focus sessions</p>
            </div>
          ) : (
            websites.map((website) => (
              <div
                key={website.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  website.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {website.name || 'Unnamed'}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {website.url_pattern}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWebsiteActive(website.id, website.is_active)}
                  >
                    {website.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBlockedWebsite(website.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Extension Installation Notice */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Browser Extension Required</h4>
          <p className="text-xs text-muted-foreground mb-3">
            To enable website blocking during focus sessions, install the Clarity browser extension.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer">
                Chrome Extension
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer">
                Firefox Add-on
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlockedWebsitesManager;
