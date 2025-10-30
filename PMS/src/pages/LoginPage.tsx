import React from "react";
import bg from "../images/bg.jpg";
import illustration from "../images/illustration.png";
import { useNavigate } from "react-router";

function LoginPage() {
    const navigate = useNavigate();

     const handleLogin = ()=>{
    navigate("/home")
  }
    return (
        <div
            className="h-[100vh] bg-contain bg-center flex"
            style={{ backgroundImage: `url("${bg}")` }}
        >
            {/* Wavy svg */}
            <svg
                className="absolute top-0 left-0 h-full w-full"
                viewBox="0 0 500 150"
                preserveAspectRatio="none"
            >
                <path fill="#972E26">
                    <animate
                        attributeName="d"
                        dur="5s"
                        repeatCount="indefinite"
                        values="
        M0,0 C150,10 300,20 300,150 L0,150 Z;
        M0,0 C120,40 320,0 300,150 L0,150 Z;
        M0,0 C150,10 300,20 300,150 L0,150 Z"
                    />
                </path>
            </svg>


            <div className="relative h-[100vh] w-[50%] overflow-hidden">


                {/* login form */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/50 rounded-2xl text-white z-50 p-6 w-[50%]">
                    <h2 className="font-bold text-3xl text-center mb-1">Login</h2>
                    <p className="text-center">Enter your details</p>

                    <div className="flex flex-col mt-5 gap-2">
                        <label>User Name:</label>
                        <input
                            type="text"
                            placeholder="Enter user name"
                            className="rounded-3xl text-[#972E26] bg-white/80 placeholder-[#972E26] placeholder:text-sm px-4 py-2 focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col mt-5 gap-2">
                        <label>Password:</label>
                        <input
                            type="password"
                            placeholder="Enter password"
                            className="rounded-3xl  text-[#972E26] bg-white/80 placeholder-[#972E26] placeholder:text-sm px-4 py-2 focus:outline-none"
                        />
                    </div>



                    <p className="text-blue-600 text-sm text-right mt-1">
                        Forgot password?
                    </p>
                    <button className="bg-[#972E26] w-full rounded-3xl text-white px-3 py-2 mt-7 mx-auto"  onClick={handleLogin}>
                        Submit
                    </button>
                </div>
            </div>

            {/* right side */}
            <div className="flex items-center justify-center w-[50%] z-9999">
                <img className="w-150 h-180" src={illustration} alt="illustration" />
            </div>
        </div>
    );
}

export default LoginPage;
