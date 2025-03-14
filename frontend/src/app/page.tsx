"use client"

import React, {useState} from 'react'
import axios from 'axios';
import { useRouter } from 'next/navigation'
import Snackbar from '@mui/material/Snackbar';
require('dotenv').config();


export default function MyApp() {

  const router = useRouter()

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [snackColor, setSnackColor] = React.useState("");

  const snackBar = (message, snackColor) => {
    setMessage(message)
    setSnackColor(snackColor)
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async (e)=>{
    e.preventDefault()
    console.log(process.env.NEXT_PUBLIC_API_URL)
    await axios.post(`${process.env.NEXT_PUBLIC_API_URL}employee/login`, formData ).then(response => {
      // Handle successful response

      window.sessionStorage.setItem("user", JSON.stringify(response.data[0]));
      if(response.data[0].role == "1"){
        router.push('/HR')
        snackBar("Success", "green");
      }
      else if(response.data[0].role == "2"){
        router.push('/staff')
        snackBar("Success", "green");
      }else if(response.data[0].role == "3"){
        router.push('/staff')
        snackBar("Success", "green");
      }
    })
    .catch(error => {
      // Handle error
      console.error(error);
      snackBar("Invalid Credentials", "red");
    });
  }

    return (
        <>
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <img
              alt="Your Company"
              src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
              className="mx-auto h-10 w-auto"
            />
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Sign in to your account
            </h2>
          </div>
  
          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
  
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                    Password
                  </label>
                  <div className="text-sm">
                    <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
                      Forgot password?
                    </a>
                  </div>
                </div>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    autoComplete="current-password"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
  
              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Sign in
                </button>
              </div>
            </form>
            <Snackbar
              class="error-message"
              ContentProps={{
                sx: {
                  background: snackColor
                }
              }}
              open={open}
              autoHideDuration={6000}
              onClose={handleClose}
              message={message}
            />
              
            <p className="mt-10 text-center text-sm text-gray-500">
              Not a member?{' '}
              <a href="#" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
                Start a 14 day free trial
              </a>
            </p>
          </div>
        </div>
      </>
    );
  }