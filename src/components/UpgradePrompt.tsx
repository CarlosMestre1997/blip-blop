import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

const UpgradePrompt = ({ isOpen, onClose, featureName }: UpgradePromptProps) => {
  const handleUpgrade = (plan: 'monthly' | 'yearly') => {
    const links = {
      monthly: 'YOUR_STRIPE_MONTHLY_LINK_HERE',
      yearly: 'YOUR_STRIPE_YEARLY_LINK_HERE',
    };
    window.open(links[plan], '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">Upgrade to Premium</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {featureName} is a premium feature. Upgrade now to unlock it along with other amazing benefits!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Premium Features Include:</h4>
            <ul className="space-y-2 text-sm">
              <li>✓ <strong>Sequencer</strong> - Create complex patterns and beats</li>
              <li>✓ <strong>Loop Recording</strong> - Record and playback loops seamlessly</li>
              <li>✓ <strong>Unlimited Downloads</strong> - Export as many tracks as you want</li>
              <li>✓ <strong>WAV Format</strong> - High-quality audio exports</li>
              <li>✓ <strong>More Drum Kits</strong> - Access to expanded sound library</li>
              <li>✓ <strong>Priority Support</strong> - Get help when you need it</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-bold">Premium Monthly</h3>
              <p className="text-2xl font-bold">$4.99<span className="text-sm font-normal">/month</span></p>
              <Button 
                className="w-full"
                onClick={() => handleUpgrade('monthly')}
              >
                Subscribe Monthly
              </Button>
            </div>
            <div className="border-2 border-primary rounded-lg p-4 space-y-3 relative">
              <div className="absolute -top-3 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                SAVE 17%
              </div>
              <h3 className="text-lg font-bold">Premium Yearly</h3>
              <p className="text-2xl font-bold">$49.99<span className="text-sm font-normal">/year</span></p>
              <Button 
                className="w-full"
                onClick={() => handleUpgrade('yearly')}
              >
                Subscribe Yearly
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
