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
                </DialogDescription>
              </DialogContent>
            </Dialog>
            <a href="#pricing" className="hover:underline">Pricing</a>
          </nav>
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
