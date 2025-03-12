import logo from "@/assets/digitrack-logo.png";

function SplashScreen() {
  return (
    <div className="flex flex-col h-screen w-screen justify-center items-center bg-red-100">
      <div className="flex flex-col items-center animate-pulse">
        <img
          src={logo}
          width="200"
          height="200"
          alt="App Logo"
          className="aspect-[1/1] overflow-hidden rounded-lg object-contain object-center mb-4"
        />
        {/* <h1 className="text-4xl font-bold text-gray-900">JH Digitrack</h1> */}
      </div>
    </div>
  );
}

export default SplashScreen;
