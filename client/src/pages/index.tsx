import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const Home: NextPage = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="flex flex-col items-center">
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-primary-700 to-primary-900 text-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Emergency Medical Services at Your Fingertips
              </h1>
              <p className="max-w-[600px] text-gray-200 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Our ambulance booking system ensures prompt medical assistance during emergencies. Track ambulances in real-time and get to hospitals faster.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link 
                  href={isLoggedIn ? "/emergency" : "/login"} 
                  className="inline-flex h-10 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-primary-900 shadow transition-colors hover:bg-gray-200"
                >
                  {isLoggedIn ? "Request Emergency" : "Login to Get Started"}
                </Link>
                <Link
                  href="/about"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white bg-transparent px-8 text-sm font-medium text-white shadow-sm transition-colors hover:bg-white/20"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[500px] aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last">
              <img
                alt="Ambulance Responders"
                className="w-full h-full object-cover"
                src="/images/ambulance-hero.jpg"
                width={500}
                height={310}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Our platform simplifies the emergency response process to save valuable time when it matters most.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m16 12-4-4-4 4" />
                  <path d="M12 16V8" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Request Assistance</h3>
                <p className="text-gray-500">
                  Quickly submit an emergency request with location and vital details for faster response.
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Real-Time Tracking</h3>
                <p className="text-gray-500">
                  Monitor the ambulance's location in real-time, with accurate ETA and route information.
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M20 7h-9" />
                  <path d="M14 17H5" />
                  <circle cx="17" cy="17" r="3" />
                  <circle cx="7" cy="7" r="3" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Hospital Connectivity</h3>
                <p className="text-gray-500">
                  Connect with nearby hospitals, share patient data, and prepare for arrival.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 