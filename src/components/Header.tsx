import { useState } from "react";
import DarkModeToggle from "./DarkModeToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Header = () => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  return (
    <header className="border-b-2 border-border py-4 px-6">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold underline decoration-2 underline-offset-4">
          Blip Blop
        </h1>
        <div className="flex items-center gap-4">
          <nav className="flex gap-8 text-sm">
            <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
              <DialogTrigger asChild>
                <button className="hover:underline">About us</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>About Sampling</DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-base leading-relaxed">
                  Have you ever wanted to draw something then remembered you don't know how to draw so 
                  you pick up a magazine and start cutting a car, a dress or something to make a collage…
                  <br /><br />
                  Sampling is the same for music where you usually cut old songs, loop and slice to make new music out of it.
                  <br /><br />
                  Our solution offers simple, intuitive and easy to use browser based sampler where even beginner can create music freely and share it with the world: welcome to Blip Blop
                </DialogDescription>
              </DialogContent>
            </Dialog>
            <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
              <DialogTrigger asChild>
                <button className="hover:underline">Pricing</button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Pricing Plans</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                  <div className="border rounded-lg p-6 space-y-4">
                    <h3 className="text-xl font-bold">Continue Free</h3>
                    <p className="text-2xl font-bold">$0</p>
                    <ul className="space-y-2 text-sm">
                      <li>✓ Basic features</li>
                      <li>✓ Limited downloads</li>
                      <li>✓ Standard quality exports</li>
                    </ul>
                  </div>
                  <div className="border-2 border-primary rounded-lg p-6 space-y-4">
                    <h3 className="text-xl font-bold">Premium Monthly</h3>
                    <p className="text-2xl font-bold">$4.99<span className="text-sm font-normal">/month</span></p>
                    <ul className="space-y-2 text-sm">
                      <li>✓ Unlimited downloads</li>
                      <li>✓ Higher quality exports</li>
                      <li>✓ More drum-kit files</li>
                      <li>✓ Priority support</li>
                      <li>✓ Advanced features</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-6 space-y-4">
                    <h3 className="text-xl font-bold">Premium Yearly</h3>
                    <p className="text-2xl font-bold">$49.99<span className="text-sm font-normal">/year</span></p>
                    <ul className="space-y-2 text-sm">
                      <li>✓ Unlimited downloads</li>
                      <li>✓ Higher quality exports</li>
                      <li>✓ More drum-kit files</li>
                      <li>✓ Priority support</li>
                      <li>✓ Advanced features</li>
                      <li>✓ Save 17%</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </nav>
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
