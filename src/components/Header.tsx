import DarkModeToggle from "./DarkModeToggle";

const Header = () => {
  return (
    <header className="border-b-2 border-border py-4 px-6">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold underline decoration-2 underline-offset-4">
          Blip Blop
        </h1>
        <div className="flex items-center gap-4">
          <nav className="flex gap-8 text-sm">
            <a href="#about" className="hover:underline">About us</a>
            <a href="#pricing" className="hover:underline">Pricing</a>
          </nav>
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
