import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Database } from 'lucide-react';
import { generateDummyData } from '@/services/generateDummyData';

export const DataGenerator = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    const result = await generateDummyData();
    
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to generate dummy data",
        variant: "destructive",
      });
    }
    
    setIsGenerating(false);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Test Data Generator</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Generate sample medicines, patients, and sales data for testing
      </p>
      <Button onClick={handleGenerate} disabled={isGenerating}>
        <Database className="h-4 w-4 mr-2" />
        {isGenerating ? 'Generating...' : 'Generate Dummy Data'}
      </Button>
    </Card>
  );
};
